"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCreatorAccess } from "@/lib/auth/session";
import { PRICING_TYPES, RISK_LEVELS, type RiskLevel } from "@/lib/domain/status";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import type { PricingType } from "@/types/agent";

type InsertedAgent = {
  id: string;
  slug: string;
};

type InsertedVersion = {
  id: string;
};

const requiredFields = [
  "name",
  "category_id",
  "short_description",
  "long_description",
  "target_user",
  "does",
  "does_not_do",
  "required_inputs",
  "deliverables",
  "sample_output",
  "pricing_type",
  "pricing_hint",
  "risk_level",
  "execution_method",
  "known_limits",
] as const;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(locale: Locale, error: string): never {
  redirect(`${localizedPath("/creator/agents/new", locale)}?error=${encodeURIComponent(error)}`);
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "agent";
}

function readLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isPricingType(value: string): value is PricingType {
  return (PRICING_TYPES as readonly string[]).includes(value);
}

function isRiskLevel(value: string): value is RiskLevel {
  return (RISK_LEVELS as readonly string[]).includes(value);
}

export async function submitAgentForReviewAction(locale: Locale, formData: FormData) {
  await requireCreatorAccess(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError(locale, "missing-config");
  }

  const values = Object.fromEntries(requiredFields.map((field) => [field, readText(formData, field)]));
  const missingRequiredField = requiredFields.some((field) => values[field].length === 0);

  if (missingRequiredField) {
    redirectWithError(locale, "required");
  }

  if (!isPricingType(values.pricing_type)) {
    redirectWithError(locale, "invalid-pricing");
  }

  if (!isRiskLevel(values.risk_level)) {
    redirectWithError(locale, "invalid-risk");
  }

  if (values.risk_level === "forbidden_beta") {
    redirectWithError(locale, "forbidden-risk");
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error) {
    redirectWithError(locale, creatorProfile.error);
  }

  if (creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    redirectWithError(locale, "creator-profile-missing");
  }

  const slug = `${slugify(values.name)}-${randomUUID().slice(0, 8)}`;

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({
      creator_id: creatorProfile.id,
      category_id: values.category_id,
      slug,
      name: values.name,
      summary: values.short_description,
      description: values.long_description,
      status: "draft",
      pricing_type: values.pricing_type,
      risk_level: values.risk_level,
      currency: "eur",
    })
    .select("id,slug")
    .single<InsertedAgent>();

  if (agentError) {
    redirectWithError(locale, "agent-insert-failed");
  }

  const limitations = [...readLines(values.does_not_do), ...readLines(values.known_limits)];
  const modelNotes = [
    `Target user: ${values.target_user}`,
    `Pricing hint: ${values.pricing_hint}`,
    `Execution method: ${values.execution_method}`,
    `Sample output: ${values.sample_output}`,
  ].join("\n\n");

  const { data: version, error: versionError } = await supabase
    .from("agent_versions")
    .insert({
      agent_id: agent.id,
      version_number: 1,
      model_notes: modelNotes,
      capabilities: readLines(values.does),
      required_inputs: readLines(values.required_inputs),
      deliverables: readLines(values.deliverables),
      limitations,
      data_handling_notes: `Risk level declared by creator: ${values.risk_level}`,
      changelog: "Initial creator submission.",
    })
    .select("id")
    .single<InsertedVersion>();

  if (versionError) {
    // Best-effort cleanup: without a DB transaction, remove the draft created
    // earlier so a failed version insert does not leave an incomplete listing.
    await supabase
      .from("agents")
      .delete()
      .eq("id", agent.id)
      .eq("creator_id", creatorProfile.id)
      .eq("status", "draft");

    redirectWithError(locale, "version-insert-failed");
  }

  const { error: submitError } = await supabase
    .from("agents")
    .update({ active_version_id: version.id, status: "submitted" })
    .eq("id", agent.id)
    .eq("creator_id", creatorProfile.id);

  if (submitError) {
    // Best-effort cleanup: agent_versions.agent_id cascades on agent delete, so
    // removing this still-draft agent also removes the version created above.
    await supabase
      .from("agents")
      .delete()
      .eq("id", agent.id)
      .eq("creator_id", creatorProfile.id)
      .eq("status", "draft");

    redirectWithError(locale, "agent-submit-failed");
  }

  revalidatePath(localizedPath("/creator", locale));
  revalidatePath(localizedPath("/creator/dashboard", locale));
  redirect(`${localizedPath("/creator/dashboard", locale)}?submitted=${encodeURIComponent(agent.slug)}`);
}

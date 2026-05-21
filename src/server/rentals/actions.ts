"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

type AgentRentalRow = {
  id: string;
  creator_id: string;
  slug: string;
  status: "approved" | string;
  pricing_type: "task" | "project";
  starting_price_cents: number | null;
  currency: string;
};

function redirectWithAgentError(locale: Locale, slug: string, error: string): never {
  redirect(`${localizedPath(`/agents/${slug}`, locale)}?error=${encodeURIComponent(error)}`);
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMultiline(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function buildRequestBrief(input: {
  constraints: string;
  context: string;
  deadline: string;
  objective: string;
  outputFormat: string;
}) {
  return [
    `Objectif: ${input.objective}`,
    `Contexte: ${input.context}`,
    `Deadline souhaitée: ${input.deadline}`,
    `Format attendu: ${input.outputFormat}`,
    `Contraintes importantes: ${input.constraints}`,
  ].join("\n\n");
}

export async function createBetaRentalAction(locale: Locale, formData: FormData) {
  return createAgentAccessAction(locale, formData);
}

export async function createAgentAccessAction(locale: Locale, formData: FormData) {
  const agentId = formData.get("agent_id");
  const slug = formData.get("slug");

  if (typeof agentId !== "string" || typeof slug !== "string" || !agentId || !slug) {
    redirect(localizedPath("/marketplace", locale));
  }

  const agentPath = localizedPath(`/agents/${slug}`, locale);
  const profile = await requireAuth(locale, agentPath);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(`${localizedPath("/auth/login", locale)}?next=${encodeURIComponent(agentPath)}&error=missing-config`);
  }

  const rentalInput = {
    objective: readText(formData, "objective"),
    context: readText(formData, "context"),
    deadline: readText(formData, "deadline"),
    outputFormat: readText(formData, "output_format"),
    constraints: normalizeMultiline(readText(formData, "constraints")),
  };

  if (
    rentalInput.objective.length < 5 ||
    rentalInput.context.length < 10 ||
    rentalInput.deadline.length < 2 ||
    rentalInput.outputFormat.length < 3 ||
    rentalInput.constraints.length < 3
  ) {
    redirectWithAgentError(locale, slug, "rental-inputs-required");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,creator_id,slug,status,pricing_type,starting_price_cents,currency")
    .eq("id", agentId)
    .eq("status", "approved")
    .maybeSingle<AgentRentalRow>();

  if (agentError) {
    redirectWithAgentError(locale, slug, "agent-load-failed");
  }

  if (!agent) {
    redirectWithAgentError(locale, slug, "agent-unavailable");
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (!creatorProfile.error && !creatorProfile.creatorProfileMissing && creatorProfile.id === agent.creator_id) {
    redirectWithAgentError(locale, slug, "self-rental-not-allowed");
  }

  const { data: access, error: insertError } = await supabase
    .from("rental_requests")
    .insert({
      agent_id: agent.id,
      user_id: profile.id,
      creator_id: agent.creator_id,
      status: "active",
      pricing_type: agent.pricing_type,
      quoted_price_cents: agent.starting_price_cents,
      currency: agent.currency,
      request_brief: buildRequestBrief(rentalInput),
      required_inputs: {
        objective: rentalInput.objective,
        context: rentalInput.context,
        deadline: rentalInput.deadline,
        output_format: rentalInput.outputFormat,
        constraints: rentalInput.constraints,
      },
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertError || !access) {
    redirectWithAgentError(locale, slug, "rental-create-failed");
  }

  revalidatePath(localizedPath("/dashboard", locale));
  revalidatePath(localizedPath("/workspace", locale));
  redirect(`${localizedPath(`/workspace/${access.id}`, locale)}?access=created`);
}

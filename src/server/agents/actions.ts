"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCreatorAccess } from "@/lib/auth/session";
import {
  buildDataPolicy,
  buildOutputPromise,
  buildSetupRequirements,
  isAgentRuntimeType,
  isExecutionMode,
  isSetupRequirementType,
  isWorkspaceMode,
  readLines,
} from "@/lib/agent-contract";
import { PRICING_TYPES, RISK_LEVELS, type RiskLevel } from "@/lib/domain/status";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import type { PricingType } from "@/types/agent";

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
  "starting_price_eur",
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

function redirectWithEditError(locale: Locale, agentId: string, error: string): never {
  redirect(`${localizedPath(`/creator/agents/${agentId}/edit`, locale)}?error=${encodeURIComponent(error)}`);
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

function isPricingType(value: string): value is PricingType {
  return (PRICING_TYPES as readonly string[]).includes(value);
}

function isRiskLevel(value: string): value is RiskLevel {
  return (RISK_LEVELS as readonly string[]).includes(value);
}

function readPriceCents(value: string) {
  const normalizedValue = value.replace(",", ".");
  const price = Number(normalizedValue);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return Math.round(price * 100);
}

function getSupabaseErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const maybeError = error as { code?: string; message?: string; details?: string; hint?: string };
  return [maybeError.code, maybeError.message, maybeError.details, maybeError.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingAgentContractSchemaError(error: unknown) {
  const errorText = getSupabaseErrorText(error);

  return (
    errorText.includes("workspace_mode") ||
    errorText.includes("runtime_type") ||
    errorText.includes("setup_requirements") ||
    errorText.includes("output_promise") ||
    errorText.includes("execution_mode") ||
    errorText.includes("data_policy") ||
    (errorText.includes("schema cache") && errorText.includes("agent_versions"))
  );
}

function isMissingAgentContractRpcError(error: unknown) {
  const errorText = getSupabaseErrorText(error);

  return (
    isMissingAgentContractSchemaError(error) ||
    errorText.includes("resubmit_creator_agent_changes") ||
    errorText.includes("could not find the function") ||
    errorText.includes("function public.resubmit_creator_agent_changes")
  );
}

export async function submitAgentForReviewAction(locale: Locale, formData: FormData) {
  await requireCreatorAccess(locale, localizedPath("/creator/agents/new", locale));
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

  const startingPriceCents = readPriceCents(values.starting_price_eur);

  if (!startingPriceCents) {
    redirectWithError(locale, "invalid-price");
  }

  if (!isRiskLevel(values.risk_level)) {
    redirectWithError(locale, "invalid-risk");
  }

  if (values.risk_level === "forbidden_beta") {
    redirectWithError(locale, "forbidden-risk");
  }

  const workspaceMode = readText(formData, "workspace_mode") || "instant";
  const setupType = readText(formData, "setup_type") || "none";
  const executionMode = readText(formData, "execution_mode") || "guided_workspace";
  const runtimeType = readText(formData, "runtime_type") || "llm_prompt";

  if (
    !isWorkspaceMode(workspaceMode) ||
    !isSetupRequirementType(setupType) ||
    !isExecutionMode(executionMode) ||
    !isAgentRuntimeType(runtimeType) ||
    executionMode !== "llm_prompt" ||
    runtimeType !== "llm_prompt"
  ) {
    redirectWithError(locale, "invalid-contract");
  }

  const setupRequirements = buildSetupRequirements(setupType, readText(formData, "setup_items"));
  const outputPromise = buildOutputPromise(readText(formData, "output_promise_summary"), readText(formData, "output_promise_examples"));
  const dataPolicy = buildDataPolicy(workspaceMode, executionMode);

  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error) {
    redirectWithError(locale, creatorProfile.error);
  }

  if (creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    redirectWithError(locale, "creator-profile-missing");
  }

  const agentId = randomUUID();
  const versionId = randomUUID();
  const slug = `${slugify(values.name)}-${agentId.slice(0, 8)}`;

  const { error: agentError } = await supabase
    .from("agents")
    .insert({
      id: agentId,
      creator_id: creatorProfile.id,
      category_id: values.category_id,
      slug,
      name: values.name,
      summary: values.short_description,
      description: values.long_description,
      status: "draft",
      pricing_type: values.pricing_type,
      starting_price_cents: startingPriceCents,
      risk_level: values.risk_level,
      currency: "eur",
    });

  if (agentError) {
    console.error("Agent insert failed", {
      code: agentError.code,
      message: agentError.message,
    });
    redirectWithError(locale, "agent-insert-failed");
  }

  const limitations = [...readLines(values.does_not_do), ...readLines(values.known_limits)];
  const modelNotes = [
    `Target user: ${values.target_user}`,
    `Beta starting price: ${values.starting_price_eur} EUR`,
    `Pricing hint: ${values.pricing_hint}`,
    `Execution method: ${values.execution_method}`,
    `Sample output: ${values.sample_output}`,
  ].join("\n\n");

  const versionPayload = {
    id: versionId,
    agent_id: agentId,
    version_number: 1,
    model_notes: modelNotes,
    capabilities: readLines(values.does),
    required_inputs: readLines(values.required_inputs),
    deliverables: readLines(values.deliverables),
    limitations,
    data_handling_notes: `Risk level declared by creator: ${values.risk_level}`,
    changelog: "Initial creator submission.",
  };

  const versionPayloadWithContract = {
    ...versionPayload,
    workspace_mode: workspaceMode,
    setup_requirements: setupRequirements,
    output_promise: outputPromise,
    execution_mode: executionMode,
    runtime_type: runtimeType,
    data_policy: dataPolicy,
  };

  let { error: versionError } = await supabase
    .from("agent_versions")
    .insert(versionPayloadWithContract);

  if (versionError && isMissingAgentContractSchemaError(versionError)) {
    console.warn("Agent contract columns unavailable; retrying legacy agent version insert", {
      code: versionError.code,
      message: versionError.message,
    });

    ({ error: versionError } = await supabase.from("agent_versions").insert(versionPayload));
  }

  if (versionError) {
    console.error("Agent version insert failed", {
      code: versionError.code,
      message: versionError.message,
    });
    // Best-effort cleanup: without a DB transaction, remove the draft created
    // earlier so a failed version insert does not leave an incomplete listing.
    await supabase
      .from("agents")
      .delete()
      .eq("id", agentId)
      .eq("creator_id", creatorProfile.id)
      .eq("status", "draft");

    redirectWithError(locale, "version-insert-failed");
  }

  const { error: submitError } = await supabase
    .from("agents")
    .update({ active_version_id: versionId, status: "submitted" })
    .eq("id", agentId)
    .eq("creator_id", creatorProfile.id);

  if (submitError) {
    console.error("Agent submit failed", {
      code: submitError.code,
      message: submitError.message,
    });
    // Best-effort cleanup: agent_versions.agent_id cascades on agent delete, so
    // removing this still-draft agent also removes the version created above.
    await supabase
      .from("agents")
      .delete()
      .eq("id", agentId)
      .eq("creator_id", creatorProfile.id)
      .eq("status", "draft");

    redirectWithError(locale, "agent-submit-failed");
  }

  revalidatePath(localizedPath("/creator", locale));
  revalidatePath(localizedPath("/creator/dashboard", locale));
  redirect(`${localizedPath("/creator/dashboard", locale)}?submitted=${encodeURIComponent(slug)}`);
}

export async function resubmitAgentChangesAction(locale: Locale, formData: FormData) {
  const agentId = readText(formData, "agent_id");

  if (!agentId) {
    redirectWithError(locale, "required");
  }

  await requireCreatorAccess(locale, localizedPath(`/creator/agents/${agentId}/edit`, locale));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithEditError(locale, agentId, "missing-config");
  }

  const editableFields = [
    "name",
    "category_id",
    "short_description",
    "long_description",
    "does",
    "required_inputs",
    "deliverables",
    "known_limits",
    "pricing_type",
    "starting_price_eur",
    "risk_level",
    "changes_summary",
  ] as const;
  const values = Object.fromEntries(editableFields.map((field) => [field, readText(formData, field)]));
  const missingRequiredField = editableFields.some((field) => values[field].length === 0);

  if (missingRequiredField) {
    redirectWithEditError(locale, agentId, "required");
  }

  if (values.changes_summary.length < 10) {
    redirectWithEditError(locale, agentId, "changes-summary-required");
  }

  if (!isPricingType(values.pricing_type)) {
    redirectWithEditError(locale, agentId, "invalid-pricing");
  }

  const startingPriceCents = readPriceCents(values.starting_price_eur);

  if (!startingPriceCents) {
    redirectWithEditError(locale, agentId, "invalid-price");
  }

  if (!isRiskLevel(values.risk_level)) {
    redirectWithEditError(locale, agentId, "invalid-risk");
  }

  if (values.risk_level === "forbidden_beta") {
    redirectWithEditError(locale, agentId, "forbidden-risk");
  }

  const workspaceMode = readText(formData, "workspace_mode") || "instant";
  const setupType = readText(formData, "setup_type") || "none";
  const executionMode = readText(formData, "execution_mode") || "guided_workspace";
  const runtimeType = readText(formData, "runtime_type") || "llm_prompt";

  if (
    !isWorkspaceMode(workspaceMode) ||
    !isSetupRequirementType(setupType) ||
    !isExecutionMode(executionMode) ||
    !isAgentRuntimeType(runtimeType) ||
    executionMode !== "llm_prompt" ||
    runtimeType !== "llm_prompt"
  ) {
    redirectWithEditError(locale, agentId, "invalid-contract");
  }

  const setupRequirements = buildSetupRequirements(setupType, readText(formData, "setup_items"));
  const outputPromise = buildOutputPromise(readText(formData, "output_promise_summary"), readText(formData, "output_promise_examples"));
  const dataPolicy = buildDataPolicy(workspaceMode, executionMode);

  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error) {
    redirectWithEditError(locale, agentId, creatorProfile.error);
  }

  if (creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    redirectWithEditError(locale, agentId, "creator-profile-missing");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,creator_id,active_version_id,status")
    .eq("id", agentId)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle<{ id: string; creator_id: string; active_version_id: string | null; status: string }>();

  if (agentError || !agent) {
    redirectWithEditError(locale, agentId, "agent-not-found");
  }

  if (!["submitted", "in_review", "rejected"].includes(agent.status)) {
    redirectWithEditError(locale, agentId, "agent-not-editable");
  }

  const versionPayload = {
    capabilities: readLines(values.does),
    required_inputs: readLines(values.required_inputs),
    deliverables: readLines(values.deliverables),
    limitations: readLines(values.known_limits),
  };

  if (!agent.active_version_id) {
    redirectWithEditError(locale, agentId, "version-update-failed");
  }

  const resubmitPayload = {
    p_agent_id: agent.id,
    p_category_id: values.category_id,
    p_name: values.name,
    p_summary: values.short_description,
    p_description: values.long_description,
    p_pricing_type: values.pricing_type,
    p_starting_price_cents: startingPriceCents,
    p_risk_level: values.risk_level,
    p_capabilities: versionPayload.capabilities,
    p_required_inputs: versionPayload.required_inputs,
    p_deliverables: versionPayload.deliverables,
    p_limitations: versionPayload.limitations,
    p_changelog: values.changes_summary,
    p_workspace_mode: workspaceMode,
    p_setup_requirements: setupRequirements,
    p_output_promise: outputPromise,
    p_execution_mode: executionMode,
    p_runtime_type: runtimeType,
    p_data_policy: dataPolicy,
  };

  const legacyResubmitPayload = {
    p_agent_id: agent.id,
    p_category_id: values.category_id,
    p_name: values.name,
    p_summary: values.short_description,
    p_description: values.long_description,
    p_pricing_type: values.pricing_type,
    p_starting_price_cents: startingPriceCents,
    p_risk_level: values.risk_level,
    p_capabilities: versionPayload.capabilities,
    p_required_inputs: versionPayload.required_inputs,
    p_deliverables: versionPayload.deliverables,
    p_limitations: versionPayload.limitations,
    p_changelog: values.changes_summary,
  };

  let { error: resubmitError } = await supabase.rpc("resubmit_creator_agent_changes", resubmitPayload);

  if (resubmitError && isMissingAgentContractRpcError(resubmitError)) {
    console.warn("Agent contract resubmit RPC unavailable; retrying legacy resubmission RPC", {
      code: resubmitError.code,
      message: resubmitError.message,
    });

    ({ error: resubmitError } = await supabase.rpc("resubmit_creator_agent_changes", legacyResubmitPayload));
  }

  if (resubmitError) {
    redirectWithEditError(locale, agentId, "agent-update-failed");
  }

  revalidatePath(localizedPath("/creator", locale));
  revalidatePath(localizedPath("/creator/dashboard", locale));
  revalidatePath("/admin");
  revalidatePath("/en/admin");
  redirect(`${localizedPath("/creator/dashboard", locale)}?submitted=${encodeURIComponent(values.name)}`);
}

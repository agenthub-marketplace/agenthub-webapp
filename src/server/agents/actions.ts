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
  normalizeAgentContract,
  readLines,
} from "@/lib/agent-contract";
import { PRICING_TYPES, RISK_LEVELS, type RiskLevel } from "@/lib/domain/status";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import { generateSecurityPrecheckForAgent } from "@/server/agents/security-prechecks";
import { isCreatorEndpointRuntimeEnabled } from "@/server/endpoints/runtime";
import { isCreatorWorkflowRuntimeEnabled, isSafeResolvedWorkflowEndpointUrl, parseWorkflowStepsText } from "@/server/workflows/runtime";
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

function readEndpointUrl(formData: FormData, key: string) {
  return readText(formData, key)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^[`"'“”‘’<]+|[`"'“”‘’>]+$/g, "")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

function safeEndpointUrlDebug(value: string) {
  try {
    const url = new URL(value);

    return {
      host: url.host,
      path: url.pathname,
      protocol: url.protocol,
    };
  } catch {
    return {
      rawLength: value.length,
      validUrl: false,
    };
  }
}

function redirectWithError(locale: Locale, error: string): never {
  redirect(`/code/agents/new?error=${encodeURIComponent(error)}`);
}

function redirectWithEditError(locale: Locale, agentId: string, error: string): never {
  redirect(`/code/agents/${agentId}/edit?error=${encodeURIComponent(error)}`);
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

type CreatorEndpointStatus = "submitted" | "approved" | "rejected" | "suspended";

function canReuseExistingEndpoint(status: CreatorEndpointStatus) {
  return status === "submitted" || status === "approved";
}

function readPriceCents(value: string) {
  const normalizedValue = value.replace(",", ".");
  const price = Number(normalizedValue);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return Math.round(price * 100);
}

function hasWorkflowDecisionStep(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => {
      const match = /^llm\s*:\s*(.+)$/i.exec(line);
      const label = match?.[1] ?? "";

      return /d[ée]cid|class|priorit|score|qualif|router|choisir|triage|cat[ée]gor/i.test(label);
    });
}

function hasCreatorEndpointDisclosure(value: string) {
  return /\b(api|endpoint|creator|infrastructure|serveur|https|proxy|sign[ée]?)\b/i.test(value);
}

function hasUnsupportedExternalActionPromise(value: string) {
  return value
    .split(/\r?\n|[.!?]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => {
      if (/\b(sans|aucun|aucune|ne\s+\w+.*\bpas|n['’]\w+.*\bpas|ne\s+\w+.*\baucun|ne\s+\w+.*\baucune)\b/i.test(line)) {
        return false;
      }

      return /\b(scrape|scraper|connecte|connexion|appelle une api|appel api|webhook|modifie le crm|cr[ée]e un ticket|envoie un email|publie|poste automatiquement)\b/i.test(
        line,
      );
    });
}

async function cleanupDraftAgent(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  agentId: string,
  creatorId: string,
) {
  await supabase
    .from("agents")
    .delete()
    .eq("id", agentId)
    .eq("creator_id", creatorId)
    .eq("status", "draft");
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
  const profile = await requireCreatorAccess(locale, localizedPath("/creator/agents/new", locale));
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
    !["llm_prompt", "workflow_automation", "creator_endpoint"].includes(runtimeType)
  ) {
    redirectWithError(locale, "invalid-contract");
  }

  const setupRequirements = buildSetupRequirements(setupType, readText(formData, "setup_items"));
  const outputPromise = buildOutputPromise(readText(formData, "output_promise_summary"), readText(formData, "output_promise_examples"));

  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error) {
    redirectWithError(locale, creatorProfile.error);
  }

  if (creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    redirectWithError(locale, "creator-profile-missing");
  }

  if (runtimeType === "workflow_automation" && !(await isCreatorWorkflowRuntimeEnabled(creatorProfile.id))) {
    redirectWithError(locale, "invalid-contract");
  }

  if (runtimeType === "creator_endpoint" && !(await isCreatorEndpointRuntimeEnabled(creatorProfile.id))) {
    redirectWithError(locale, "invalid-contract");
  }

  const workflowEndpointUrl = readEndpointUrl(formData, "workflow_endpoint_url");
  const workflowEndpointName = readText(formData, "workflow_endpoint_name") || `${values.name} workflow endpoint`;
  const creatorEndpointUrl = readEndpointUrl(formData, "creator_endpoint_url");
  const creatorEndpointName = readText(formData, "creator_endpoint_name") || `${values.name} creator endpoint`;
  const workflowStepsText = readText(formData, "workflow_steps");
  const hasWebhookStep = workflowStepsText
    .split(/\r?\n/)
    .some((line) => line.trim().toLowerCase().startsWith("webhook:"));

  if (runtimeType === "workflow_automation" && !hasWorkflowDecisionStep(workflowStepsText)) {
    redirectWithError(locale, "invalid-workflow-decision");
  }

  const publicRuntimeText = [
    values.short_description,
    values.long_description,
    readText(formData, "output_promise_summary"),
    readText(formData, "output_promise_examples"),
    values.does,
    values.does_not_do,
    values.known_limits,
  ].join("\n");
  const activePromiseText = [
    values.short_description,
    values.long_description,
    readText(formData, "output_promise_summary"),
    readText(formData, "output_promise_examples"),
    values.does,
    values.deliverables,
    values.sample_output,
  ].join("\n");

  if (runtimeType === "creator_endpoint" && !hasCreatorEndpointDisclosure(publicRuntimeText)) {
    redirectWithError(locale, "missing-creator-endpoint-disclosure");
  }

  if (runtimeType === "workflow_automation" && !hasWebhookStep && hasUnsupportedExternalActionPromise(activePromiseText)) {
    redirectWithError(locale, "workflow-external-promise-without-webhook");
  }

  if (runtimeType === "workflow_automation" && workflowEndpointUrl && !(await isSafeResolvedWorkflowEndpointUrl(workflowEndpointUrl))) {
    redirectWithError(locale, "invalid-workflow-endpoint");
  }

  if (runtimeType === "workflow_automation" && hasWebhookStep && !workflowEndpointUrl) {
    redirectWithError(locale, "invalid-workflow");
  }

  if (runtimeType === "creator_endpoint" && !creatorEndpointUrl) {
    redirectWithError(locale, "missing-creator-endpoint");
  }

  if (runtimeType === "creator_endpoint" && !(await isSafeResolvedWorkflowEndpointUrl(creatorEndpointUrl))) {
    console.warn("Creator endpoint URL rejected", safeEndpointUrlDebug(creatorEndpointUrl));
    redirectWithError(locale, "invalid-creator-endpoint");
  }

  const dataPolicy =
    runtimeType === "workflow_automation"
      ? {
          stores_user_data: true,
          requires_files: false,
          external_tools: hasWebhookStep ? ["creator_webhook"] : [],
        }
      : runtimeType === "creator_endpoint"
        ? {
            stores_user_data: true,
            requires_files: false,
            external_tools: [],
          }
      : buildDataPolicy(workspaceMode, executionMode);

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

  if (runtimeType === "workflow_automation") {
    let endpointId: string | null = null;

    if (workflowEndpointUrl) {
      const { data: endpoint, error: endpointError } = await supabase
        .from("creator_webhook_endpoints")
        .insert({
          creator_id: creatorProfile.id,
          endpoint_url: workflowEndpointUrl,
          name: workflowEndpointName,
          status: "submitted",
        })
        .select("id")
        .maybeSingle<{ id: string }>();

      if (endpointError?.code === "23505") {
        const { data: existingEndpoint, error: existingEndpointError } = await supabase
          .from("creator_webhook_endpoints")
          .select("id,status")
          .eq("creator_id", creatorProfile.id)
          .eq("endpoint_url", workflowEndpointUrl)
          .maybeSingle<{ id: string; status: CreatorEndpointStatus }>();

        if (existingEndpointError || !existingEndpoint || !canReuseExistingEndpoint(existingEndpoint.status)) {
          await cleanupDraftAgent(supabase, agentId, creatorProfile.id);
          redirectWithError(locale, "workflow-endpoint-failed");
        }

        endpointId = existingEndpoint.id;
      } else if (endpointError || !endpoint) {
        await cleanupDraftAgent(supabase, agentId, creatorProfile.id);
        redirectWithError(locale, "workflow-endpoint-failed");
      } else {
        endpointId = endpoint.id;
      }
    }

    const workflowDefinition = parseWorkflowStepsText(workflowStepsText, endpointId);

    if (!workflowDefinition) {
      await supabase
        .from("agents")
        .delete()
        .eq("id", agentId)
        .eq("creator_id", creatorProfile.id)
        .eq("status", "draft");

      redirectWithError(locale, "invalid-workflow");
    }

    const { error: workflowError } = await supabase.from("agent_version_workflows").insert({
      agent_id: agentId,
      agent_version_id: versionId,
      creator_id: creatorProfile.id,
      definition: workflowDefinition,
      status: "submitted",
    });

    if (workflowError) {
      await supabase
        .from("agents")
        .delete()
        .eq("id", agentId)
        .eq("creator_id", creatorProfile.id)
        .eq("status", "draft");

      redirectWithError(locale, "workflow-create-failed");
    }
  }

  if (runtimeType === "creator_endpoint") {
    const { data: endpoint, error: endpointError } = await supabase
      .from("creator_api_endpoints")
      .insert({
        creator_id: creatorProfile.id,
        endpoint_url: creatorEndpointUrl,
        name: creatorEndpointName,
        status: "submitted",
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    let endpointId = endpoint?.id ?? null;

    if (endpointError?.code === "23505") {
      const { data: existingEndpoint, error: existingEndpointError } = await supabase
        .from("creator_api_endpoints")
        .select("id,status")
        .eq("creator_id", creatorProfile.id)
        .eq("endpoint_url", creatorEndpointUrl)
        .maybeSingle<{ id: string; status: CreatorEndpointStatus }>();

      if (existingEndpointError || !existingEndpoint || !canReuseExistingEndpoint(existingEndpoint.status)) {
        await cleanupDraftAgent(supabase, agentId, creatorProfile.id);
        redirectWithError(locale, "creator-endpoint-failed");
      }

      endpointId = existingEndpoint.id;
    } else if (endpointError || !endpointId) {
      await cleanupDraftAgent(supabase, agentId, creatorProfile.id);
      redirectWithError(locale, "creator-endpoint-failed");
    }

    const { error: endpointConfigError } = await supabase.from("agent_version_creator_endpoints").insert({
      agent_id: agentId,
      agent_version_id: versionId,
      creator_id: creatorProfile.id,
      endpoint_id: endpointId,
      request_schema: {},
      status: "submitted",
    });

    if (endpointConfigError) {
      await supabase
        .from("agents")
        .delete()
        .eq("id", agentId)
        .eq("creator_id", creatorProfile.id)
        .eq("status", "draft");

      redirectWithError(locale, "creator-endpoint-config-failed");
    }
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

  const precheckResult = await generateSecurityPrecheckForAgent({
    actorId: profile.id,
    agentId,
    trigger: "submission",
  });

  if (precheckResult.error) {
    console.warn("Security precheck generation failed after agent submission", {
      agentId,
      error: precheckResult.error,
    });
  }

  revalidatePath(localizedPath("/creator", locale));
  revalidatePath(localizedPath("/creator/dashboard", locale));
  revalidatePath("/code");
  revalidatePath("/code/agents");
  redirect(`/code/agents?submitted=${encodeURIComponent(slug)}`);
}

export async function resubmitAgentChangesAction(locale: Locale, formData: FormData) {
  const agentId = readText(formData, "agent_id");

  if (!agentId) {
    redirectWithError(locale, "required");
  }

  const profile = await requireCreatorAccess(locale, localizedPath(`/creator/agents/${agentId}/edit`, locale));
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
  const submittedRuntimeType = readText(formData, "runtime_type") || "llm_prompt";

  if (
    !isWorkspaceMode(workspaceMode) ||
    !isSetupRequirementType(setupType) ||
    !isExecutionMode(executionMode) ||
    !isAgentRuntimeType(submittedRuntimeType)
  ) {
    redirectWithEditError(locale, agentId, "invalid-contract");
  }

  const setupRequirements = buildSetupRequirements(setupType, readText(formData, "setup_items"));
  const outputPromise = buildOutputPromise(readText(formData, "output_promise_summary"), readText(formData, "output_promise_examples"));

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

  const { data: currentVersion, error: currentVersionError } = await supabase
    .from("agent_versions")
    .select("data_policy,execution_mode,runtime_type")
    .eq("id", agent.active_version_id)
    .eq("agent_id", agent.id)
    .maybeSingle<{ data_policy: unknown; execution_mode: string | null; runtime_type: string | null }>();

  if (currentVersionError || !currentVersion) {
    redirectWithEditError(locale, agentId, "version-update-failed");
  }

  const runtimeType =
    currentVersion.runtime_type && isAgentRuntimeType(currentVersion.runtime_type)
      ? currentVersion.runtime_type
      : currentVersion.execution_mode === "llm_prompt"
        ? "llm_prompt"
        : "static_guided";
  const persistedExecutionMode =
    currentVersion.execution_mode && isExecutionMode(currentVersion.execution_mode)
      ? currentVersion.execution_mode
      : runtimeType === "static_guided"
        ? "guided_workspace"
        : "llm_prompt";

  if (submittedRuntimeType !== runtimeType || executionMode !== persistedExecutionMode) {
    redirectWithEditError(locale, agentId, "invalid-contract");
  }

  const currentContract = normalizeAgentContract({
    dataPolicy: currentVersion.data_policy,
    executionMode: currentVersion.execution_mode,
    runtimeType: currentVersion.runtime_type,
    workspaceMode,
    setupRequirements,
    outputPromise,
  });
  const publicRuntimeText = [
    values.short_description,
    values.long_description,
    readText(formData, "output_promise_summary"),
    readText(formData, "output_promise_examples"),
    values.does,
    values.known_limits,
  ].join("\n");
  const activePromiseText = [
    values.short_description,
    values.long_description,
    readText(formData, "output_promise_summary"),
    readText(formData, "output_promise_examples"),
    values.does,
    values.deliverables,
  ].join("\n");
  const hasCreatorWebhook = currentContract.dataPolicy.external_tools.includes("creator_webhook");

  if (runtimeType === "creator_endpoint" && !hasCreatorEndpointDisclosure(publicRuntimeText)) {
    redirectWithEditError(locale, agentId, "missing-creator-endpoint-disclosure");
  }

  if (runtimeType === "workflow_automation" && !hasCreatorWebhook && hasUnsupportedExternalActionPromise(activePromiseText)) {
    redirectWithEditError(locale, agentId, "workflow-external-promise-without-webhook");
  }

  const dataPolicy =
    runtimeType === "llm_prompt"
      ? buildDataPolicy(workspaceMode, persistedExecutionMode)
      : currentVersion.data_policy ?? buildDataPolicy(workspaceMode, persistedExecutionMode);

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
    p_execution_mode: persistedExecutionMode,
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

  const precheckResult = await generateSecurityPrecheckForAgent({
    actorId: profile.id,
    agentId,
    trigger: "resubmission",
  });

  if (precheckResult.error) {
    console.warn("Security precheck generation failed after agent resubmission", {
      agentId,
      error: precheckResult.error,
    });
  }

  revalidatePath(localizedPath("/creator", locale));
  revalidatePath(localizedPath("/creator/dashboard", locale));
  revalidatePath("/admin");
  revalidatePath("/en/admin");
  revalidatePath("/code");
  revalidatePath("/code/agents");
  redirect(`/code/agents?submitted=${encodeURIComponent(values.name)}`);
}

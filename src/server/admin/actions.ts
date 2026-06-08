"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth/session";
import { isAgentRuntimeType, type AgentRuntimeType } from "@/lib/agent-contract";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { normalizeWorkflowDefinition } from "@/server/workflows/runtime";

type ReviewDecision = "approve" | "reject" | "changes" | "start_review";
type ModerationAction = "suspend" | "restore" | "archive";
type CreatorRuntimeAccessType = "workflow_automation" | "creator_endpoint";
type EndpointFamily = "workflow_webhook" | "creator_api";
type EndpointModerationAction = "approve" | "reject" | "suspend";
type SecurityReviewStatus = "pending" | "in_review" | "passed" | "failed" | "waived";

type AgentReviewRow = {
  id: string;
  active_version_id: string | null;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  status: "submitted" | "in_review" | "approved" | "rejected" | "suspended" | "draft";
};

type AgentModerationRow = {
  id: string;
  active_version_id: string | null;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  status: "approved" | "suspended" | "submitted" | "in_review" | "rejected" | "draft" | "archived";
};

type AgentVersionRuntimeRow = {
  execution_mode: string | null;
  runtime_type: string | null;
};

type RuntimeSettingRow = {
  enabled: boolean;
  runtime_type: AgentRuntimeType;
};

type WorkflowApprovalRow = {
  creator_id: string;
  definition: unknown;
  id: string;
  status: string;
};

type CreatorEndpointApprovalRow = {
  creator_id: string;
  endpoint_id: string;
  id: string;
  status: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isReviewDecision(value: string): value is ReviewDecision {
  return value === "approve" || value === "reject" || value === "changes" || value === "start_review";
}

function isModerationAction(value: string): value is ModerationAction {
  return value === "suspend" || value === "restore" || value === "archive";
}

function isCreatorRuntimeAccessType(value: string): value is CreatorRuntimeAccessType {
  return value === "workflow_automation" || value === "creator_endpoint";
}

function isEndpointFamily(value: string): value is EndpointFamily {
  return value === "workflow_webhook" || value === "creator_api";
}

function isEndpointModerationAction(value: string): value is EndpointModerationAction {
  return value === "approve" || value === "reject" || value === "suspend";
}

function isSecurityReviewStatus(value: string): value is SecurityReviewStatus {
  return value === "pending" || value === "in_review" || value === "passed" || value === "failed" || value === "waived";
}

function readLocale(formData: FormData): Locale {
  return readText(formData, "locale") === "en" ? "en" : "fr";
}

function redirectWithError(locale: Locale, error: string): never {
  redirect(`/code/admin/review?error=${encodeURIComponent(error)}`);
}

function redirectWithAgentsError(locale: Locale, error: string): never {
  redirect(`/code/admin/agents?error=${encodeURIComponent(error)}`);
}

function redirectToAdminCode(path: string, error?: string): never {
  const suffix = error ? `?error=${encodeURIComponent(error)}` : "";
  redirect(`${path}${suffix}`);
}

async function assertSecurityReviewPassed(input: {
  agentId: string;
  agentVersionId: string;
  creatorEndpointConfigId?: string | null;
  runtimeType: AgentRuntimeType;
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
  workflowId?: string | null;
}) {
  if (input.runtimeType === "llm_prompt" || input.runtimeType === "static_guided") {
    return true;
  }

  let query = input.supabase
    .from("security_reviews")
    .select("id,status")
    .eq("agent_id", input.agentId)
    .eq("agent_version_id", input.agentVersionId)
    .eq("runtime_type", input.runtimeType)
    .in("status", ["passed", "waived"]);

  if (input.runtimeType === "workflow_automation") {
    if (!input.workflowId) {
      return false;
    }

    query = query
      .eq("asset_type", "workflow_asset")
      .eq("asset_id", input.workflowId)
      .eq("workflow_id", input.workflowId);
  } else if (input.runtimeType === "creator_endpoint") {
    if (!input.creatorEndpointConfigId) {
      return false;
    }

    query = query
      .eq("asset_type", "creator_endpoint")
      .eq("asset_id", input.creatorEndpointConfigId)
      .eq("creator_endpoint_config_id", input.creatorEndpointConfigId);
  } else if (input.runtimeType === "document_file") {
    query = query.eq("asset_type", "agent_version").eq("asset_id", input.agentVersionId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1);

  return !error && Boolean(data?.length);
}

export async function approveWorkflowAutomationAssetsAction(formData: FormData) {
  const locale = readLocale(formData);
  const profile = await requireAdminAccess(locale, localizedPath("/admin", locale));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError(locale, "missing-config");
  }

  const agentId = readText(formData, "agent_id");

  if (!agentId) {
    redirectWithError(locale, "invalid-review");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,status")
    .eq("id", agentId)
    .maybeSingle<{ active_version_id: string | null; id: string; status: string }>();

  if (agentError || !agent?.active_version_id || !["submitted", "in_review"].includes(agent.status)) {
    redirectWithError(locale, "agent-not-found");
  }

  const { data: workflow, error: workflowError } = await supabase
    .from("agent_version_workflows")
    .select("id,creator_id,status,definition")
    .eq("agent_version_id", agent.active_version_id)
    .maybeSingle<WorkflowApprovalRow>();

  const definition = normalizeWorkflowDefinition(workflow?.definition);

  if (workflowError || !workflow || !definition) {
    redirectWithError(locale, "workflow-invalid");
  }

  const endpointIds = definition.steps
    .map((step) => step.endpointId)
    .filter((endpointId): endpointId is string => Boolean(endpointId));
  const uniqueEndpointIds = Array.from(new Set(endpointIds));

  if (uniqueEndpointIds.length > 0) {
    const { data: updatedEndpoints, error: endpointError } = await supabase
      .from("creator_webhook_endpoints")
      .update({
        approved_at: new Date().toISOString(),
        approved_by: profile.id,
        status: "approved",
      })
      .in("id", uniqueEndpointIds)
      .eq("creator_id", workflow.creator_id)
      .in("status", ["submitted", "approved"])
      .select("id");

    if (endpointError || (updatedEndpoints?.length ?? 0) !== uniqueEndpointIds.length) {
      redirectWithError(locale, "workflow-endpoint-approval-failed");
    }
  }

  const { error: workflowUpdateError } = await supabase
    .from("agent_version_workflows")
    .update({ status: "approved" })
    .eq("id", workflow.id)
    .in("status", ["submitted", "approved"]);

  if (workflowUpdateError) {
    redirectWithError(locale, "workflow-approval-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: "agent.workflow_automation.approve_assets",
    entity_type: "agent",
    entity_id: agent.id,
    metadata: {
      endpoint_ids: uniqueEndpointIds,
      workflow_id: workflow.id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/en/admin");
  revalidatePath("/code/admin/review");
  revalidatePath("/code/admin/endpoints");
  redirect(`/code/admin/review?reviewed=${encodeURIComponent(agent.id)}`);
}

export async function approveCreatorEndpointAssetsAction(formData: FormData) {
  const locale = readLocale(formData);
  const profile = await requireAdminAccess(locale, localizedPath("/admin", locale));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError(locale, "missing-config");
  }

  const agentId = readText(formData, "agent_id");

  if (!agentId) {
    redirectWithError(locale, "invalid-review");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,status")
    .eq("id", agentId)
    .maybeSingle<{ active_version_id: string | null; id: string; status: string }>();

  if (agentError || !agent?.active_version_id || !["submitted", "in_review"].includes(agent.status)) {
    redirectWithError(locale, "agent-not-found");
  }

  const { data: endpointConfig, error: endpointConfigError } = await supabase
    .from("agent_version_creator_endpoints")
    .select("id,creator_id,endpoint_id,status")
    .eq("agent_version_id", agent.active_version_id)
    .maybeSingle<CreatorEndpointApprovalRow>();

  if (endpointConfigError || !endpointConfig) {
    redirectWithError(locale, "creator-endpoint-invalid");
  }

  const { data: updatedEndpoint, error: endpointError } = await supabase
    .from("creator_api_endpoints")
    .update({
      approved_at: new Date().toISOString(),
      approved_by: profile.id,
      status: "approved",
    })
    .eq("id", endpointConfig.endpoint_id)
    .eq("creator_id", endpointConfig.creator_id)
    .in("status", ["submitted", "approved"])
    .select("id");

  if (endpointError || (updatedEndpoint?.length ?? 0) !== 1) {
    redirectWithError(locale, "creator-endpoint-approval-failed");
  }

  const { error: configUpdateError } = await supabase
    .from("agent_version_creator_endpoints")
    .update({ status: "approved" })
    .eq("id", endpointConfig.id)
    .in("status", ["submitted", "approved"]);

  if (configUpdateError) {
    redirectWithError(locale, "creator-endpoint-config-approval-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: "agent.creator_endpoint.approve_assets",
    entity_type: "agent",
    entity_id: agent.id,
    metadata: {
      endpoint_config_id: endpointConfig.id,
      endpoint_id: endpointConfig.endpoint_id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/en/admin");
  revalidatePath("/code/admin/review");
  revalidatePath("/code/admin/endpoints");
  redirect(`/code/admin/review?reviewed=${encodeURIComponent(agent.id)}`);
}

export async function toggleCreatorRuntimeAccessAction(formData: FormData) {
  const profile = await requireAdminAccess("fr", "/code/admin/creators");
  const serviceClient = createSupabaseServiceClient();
  const creatorId = readText(formData, "creator_id");
  const runtimeType = readText(formData, "runtime_type");
  const enabled = readText(formData, "enabled") === "true";
  const notes = readText(formData, "notes");

  if (!serviceClient) {
    redirectToAdminCode("/code/admin/creators", "missing-config");
  }

  if (!creatorId || !isCreatorRuntimeAccessType(runtimeType)) {
    redirectToAdminCode("/code/admin/creators", "invalid-runtime-access");
  }

  const { data, error } = await serviceClient
    .from("creator_runtime_access")
    .upsert(
      {
        creator_id: creatorId,
        enabled,
        granted_by: profile.id,
        notes: notes || null,
        runtime_type: runtimeType,
      },
      { onConflict: "creator_id,runtime_type" },
    )
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    redirectToAdminCode("/code/admin/creators", "runtime-access-update-failed");
  }

  await serviceClient.from("audit_logs").insert({
    actor_id: profile.id,
    action: enabled ? "creator.runtime_access.enable" : "creator.runtime_access.disable",
    entity_type: "creator_profile",
    entity_id: creatorId,
    metadata: {
      runtime_type: runtimeType,
      notes: notes || null,
    },
  });

  revalidatePath("/code/admin/creators");
  revalidatePath("/code/agents/new");
  redirect("/code/admin/creators?updated=runtime-access");
}

export async function updateRuntimeSettingAction(formData: FormData) {
  const profile = await requireAdminAccess("fr", "/code/admin/runtimes");
  const supabase = await createSupabaseServerClient();
  const runtimeType = readText(formData, "runtime_type");
  const enabled = readText(formData, "enabled") === "true";
  const creatorVisible = readText(formData, "creator_visible") === "true";
  const runEnabled = readText(formData, "run_enabled") === "true";

  if (!supabase) {
    redirectToAdminCode("/code/admin/runtimes", "missing-config");
  }

  if (!isAgentRuntimeType(runtimeType)) {
    redirectToAdminCode("/code/admin/runtimes", "invalid-runtime");
  }

  const { error } = await supabase
    .from("agent_runtime_settings")
    .update({
      creator_visible: creatorVisible,
      enabled,
      run_enabled: runEnabled,
    })
    .eq("runtime_type", runtimeType);

  if (error) {
    redirectToAdminCode("/code/admin/runtimes", "runtime-update-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: "runtime_settings.update",
    entity_type: "agent_runtime_settings",
    entity_id: null,
    metadata: {
      creator_visible: creatorVisible,
      enabled,
      run_enabled: runEnabled,
      runtime_type: runtimeType,
    },
  });

  revalidatePath("/code/admin/runtimes");
  redirect("/code/admin/runtimes?updated=runtime");
}

export async function moderateEndpointAction(formData: FormData) {
  const profile = await requireAdminAccess("fr", "/code/admin/endpoints");
  const supabase = await createSupabaseServerClient();
  const endpointId = readText(formData, "endpoint_id");
  const endpointFamily = readText(formData, "endpoint_family");
  const action = readText(formData, "endpoint_action");
  const notes = readText(formData, "notes");

  if (!supabase) {
    redirectToAdminCode("/code/admin/endpoints", "missing-config");
  }

  if (!endpointId || !isEndpointFamily(endpointFamily) || !isEndpointModerationAction(action)) {
    redirectToAdminCode("/code/admin/endpoints", "invalid-endpoint-action");
  }

  const table = endpointFamily === "workflow_webhook" ? "creator_webhook_endpoints" : "creator_api_endpoints";
  const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended";
  const payload =
    action === "approve"
      ? {
          approved_at: new Date().toISOString(),
          approved_by: profile.id,
          status: nextStatus,
          verification_notes: notes || null,
        }
      : {
          status: nextStatus,
          verification_notes: notes || null,
        };

  const { data, error } = await supabase.from(table).update(payload).eq("id", endpointId).select("id").maybeSingle<{ id: string }>();

  if (error || !data) {
    redirectToAdminCode("/code/admin/endpoints", "endpoint-update-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: `endpoint.${endpointFamily}.${action}`,
    entity_type: table,
    entity_id: endpointId,
    metadata: {
      notes: notes || null,
      next_status: nextStatus,
    },
  });

  revalidatePath("/code/admin/endpoints");
  revalidatePath("/code/admin/review");
  redirect("/code/admin/endpoints?updated=endpoint");
}

export async function decideSecurityReviewAction(formData: FormData) {
  const profile = await requireAdminAccess("fr", "/code/admin/security");
  const supabase = await createSupabaseServerClient();
  const reviewId = readText(formData, "review_id");
  const status = readText(formData, "status");
  const notes = readText(formData, "notes");

  if (!supabase) {
    redirectToAdminCode("/code/admin/security/reviews", "missing-config");
  }

  if (!reviewId || !isSecurityReviewStatus(status)) {
    redirectToAdminCode("/code/admin/security/reviews", "invalid-security-review");
  }

  const { data, error } = await supabase
    .from("security_reviews")
    .update({
      notes: notes || null,
      reviewed_at: ["passed", "failed", "waived"].includes(status) ? new Date().toISOString() : null,
      reviewed_by: ["passed", "failed", "waived"].includes(status) ? profile.id : null,
      status,
    })
    .eq("id", reviewId)
    .select("id,asset_id,asset_type,runtime_type")
    .maybeSingle<{ asset_id: string; asset_type: string; id: string; runtime_type: string }>();

  if (error || !data) {
    redirectToAdminCode("/code/admin/security/reviews", "security-review-update-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: `security_review.${status}`,
    entity_type: "security_review",
    entity_id: reviewId,
    metadata: {
      asset_id: data.asset_id,
      asset_type: data.asset_type,
      notes: notes || null,
      runtime_type: data.runtime_type,
    },
  });

  revalidatePath("/code/admin/security");
  revalidatePath("/code/admin/security/reviews");
  revalidatePath(`/code/admin/security/reviews/${reviewId}`);
  revalidatePath("/code/admin/review");
  redirect(`/code/admin/security/reviews/${reviewId}?updated=decision`);
}

export async function createSecurityReviewAction(formData: FormData) {
  const profile = await requireAdminAccess("fr", "/code/admin/review");
  const supabase = await createSupabaseServerClient();
  const agentId = readText(formData, "agent_id");

  if (!supabase) {
    redirectToAdminCode("/code/admin/review", "missing-config");
  }

  if (!agentId) {
    redirectToAdminCode("/code/admin/review", "invalid-security-review");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,status")
    .eq("id", agentId)
    .maybeSingle<{ active_version_id: string | null; id: string; status: string }>();

  if (agentError || !agent?.active_version_id) {
    redirectToAdminCode("/code/admin/review", "agent-not-found");
  }

  const { data: version, error: versionError } = await supabase
    .from("agent_versions")
    .select("id,runtime_type,execution_mode")
    .eq("id", agent.active_version_id)
    .maybeSingle<{ execution_mode: string | null; id: string; runtime_type: string | null }>();

  if (versionError || !version) {
    redirectToAdminCode("/code/admin/review", "runtime-disabled");
  }

  const runtimeType =
    version.runtime_type && isAgentRuntimeType(version.runtime_type)
      ? version.runtime_type
      : version.execution_mode === "llm_prompt"
        ? "llm_prompt"
        : "static_guided";

  if (runtimeType === "llm_prompt" || runtimeType === "static_guided") {
    redirectToAdminCode("/code/admin/review", "security-review-not-required");
  }

  let assetType = "agent_version";
  let assetId = version.id;
  let workflowId: string | null = null;
  let creatorEndpointConfigId: string | null = null;
  let creatorApiEndpointId: string | null = null;

  if (runtimeType === "workflow_automation") {
    const { data: workflow } = await supabase
      .from("agent_version_workflows")
      .select("id")
      .eq("agent_version_id", version.id)
      .maybeSingle<{ id: string }>();

    if (!workflow?.id) {
      redirectToAdminCode("/code/admin/review", "workflow-invalid");
    }

    assetType = "workflow_asset";
    assetId = workflow.id;
    workflowId = workflow.id;
  }

  if (runtimeType === "creator_endpoint") {
    const { data: endpointConfig } = await supabase
      .from("agent_version_creator_endpoints")
      .select("id,endpoint_id")
      .eq("agent_version_id", version.id)
      .maybeSingle<{ endpoint_id: string; id: string }>();

    if (!endpointConfig?.id) {
      redirectToAdminCode("/code/admin/review", "creator-endpoint-not-approved");
    }

    assetType = "creator_endpoint";
    assetId = endpointConfig.id;
    creatorEndpointConfigId = endpointConfig.id;
    creatorApiEndpointId = endpointConfig.endpoint_id;
  }

  const { data: existing } = await supabase
    .from("security_reviews")
    .select("id")
    .eq("agent_version_id", version.id)
    .eq("runtime_type", runtimeType)
    .eq("asset_type", assetType)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    redirect(`/code/admin/security/reviews/${existing.id}`);
  }

  const { data: review, error: reviewError } = await supabase
    .from("security_reviews")
    .insert({
      agent_id: agent.id,
      agent_version_id: version.id,
      asset_id: assetId,
      asset_type: assetType,
      checklist: {},
      creator_api_endpoint_id: creatorApiEndpointId,
      creator_endpoint_config_id: creatorEndpointConfigId,
      findings: [],
      runtime_type: runtimeType,
      status: "pending",
      workflow_id: workflowId,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (reviewError || !review) {
    redirectToAdminCode("/code/admin/review", "security-review-create-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: "security_review.create",
    entity_type: "security_review",
    entity_id: review.id,
    metadata: {
      agent_id: agent.id,
      agent_version_id: version.id,
      asset_id: assetId,
      asset_type: assetType,
      runtime_type: runtimeType,
    },
  });

  revalidatePath("/code/admin/review");
  revalidatePath("/code/admin/security");
  revalidatePath("/code/admin/security/reviews");
  redirect(`/code/admin/security/reviews/${review.id}`);
}

export async function reviewAgentAction(formData: FormData) {
  const locale = readLocale(formData);
  const profile = await requireAdminAccess(locale, localizedPath("/admin", locale));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError(locale, "missing-config");
  }

  const agentId = readText(formData, "agent_id");
  const decision = readText(formData, "decision");
  const notes = readText(formData, "notes");

  if (!agentId || !isReviewDecision(decision)) {
    redirectWithError(locale, "invalid-review");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,risk_level,status")
    .eq("id", agentId)
    .maybeSingle<AgentReviewRow>();

  if (agentError || !agent) {
    redirectWithError(locale, "agent-not-found");
  }

  if (agent.status !== "submitted" && agent.status !== "in_review") {
    redirectWithError(locale, "agent-not-reviewable");
  }

  if (decision === "start_review" && agent.status !== "submitted") {
    redirectWithError(locale, "agent-not-reviewable");
  }

  if (decision !== "start_review" && agent.status !== "in_review") {
    redirectWithError(locale, "agent-must-be-in-review");
  }

  if (decision === "approve" && agent.risk_level === "forbidden_beta") {
    redirectWithError(locale, "forbidden-risk");
  }

  if (decision === "approve") {
    if (!agent.active_version_id) {
      redirectWithError(locale, "runtime-disabled");
    }

    const { data: version, error: versionError } = await supabase
      .from("agent_versions")
      .select("execution_mode,runtime_type")
      .eq("id", agent.active_version_id)
      .maybeSingle<AgentVersionRuntimeRow>();

    if (versionError || !version) {
      redirectWithError(locale, "runtime-disabled");
    }

    const runtimeType =
      version.runtime_type && isAgentRuntimeType(version.runtime_type)
        ? version.runtime_type
        : version.execution_mode === "llm_prompt"
          ? "llm_prompt"
          : "static_guided";

    const { data: runtimeSetting, error: runtimeSettingError } = await supabase
      .from("agent_runtime_settings")
      .select("runtime_type,enabled")
      .eq("runtime_type", runtimeType)
      .maybeSingle<RuntimeSettingRow>();

    if (runtimeSettingError || !runtimeSetting?.enabled) {
      redirectWithError(locale, "runtime-disabled");
    }

    let reviewedWorkflowId: string | null = null;
    let reviewedCreatorEndpointConfigId: string | null = null;

    if (runtimeType === "workflow_automation") {
      const { data: workflow, error: workflowError } = await supabase
        .from("agent_version_workflows")
        .select("id,creator_id,status,definition")
        .eq("agent_version_id", agent.active_version_id)
        .maybeSingle<WorkflowApprovalRow>();
      const definition = normalizeWorkflowDefinition(workflow?.definition);

      if (workflowError || !workflow || workflow.status !== "approved" || !definition) {
        redirectWithError(locale, "workflow-not-approved");
      }

      reviewedWorkflowId = workflow.id;

      const endpointIds = definition.steps
        .map((step) => step.endpointId)
        .filter((endpointId): endpointId is string => Boolean(endpointId));
      const uniqueEndpointIds = Array.from(new Set(endpointIds));

      if (uniqueEndpointIds.length > 0) {
        const { data: endpoints, error: endpointsError } = await supabase
          .from("creator_webhook_endpoints")
          .select("id,status")
          .in("id", uniqueEndpointIds)
          .eq("creator_id", workflow.creator_id)
          .eq("status", "approved");

        if (endpointsError || (endpoints?.length ?? 0) !== uniqueEndpointIds.length) {
          redirectWithError(locale, "workflow-endpoint-not-approved");
        }
      }
    }

    if (runtimeType === "creator_endpoint") {
      const { data: endpointConfig, error: endpointConfigError } = await supabase
        .from("agent_version_creator_endpoints")
        .select("id,creator_id,endpoint_id,status")
        .eq("agent_version_id", agent.active_version_id)
        .maybeSingle<CreatorEndpointApprovalRow>();

      if (endpointConfigError || !endpointConfig || endpointConfig.status !== "approved") {
        redirectWithError(locale, "creator-endpoint-not-approved");
      }

      reviewedCreatorEndpointConfigId = endpointConfig.id;

      const { data: endpoint, error: endpointError } = await supabase
        .from("creator_api_endpoints")
        .select("id,status")
        .eq("id", endpointConfig.endpoint_id)
        .eq("creator_id", endpointConfig.creator_id)
        .eq("status", "approved")
        .maybeSingle<{ id: string; status: string }>();

      if (endpointError || !endpoint) {
        redirectWithError(locale, "creator-endpoint-not-approved");
      }
    }

    const securityPassed = await assertSecurityReviewPassed({
      agentId: agent.id,
      agentVersionId: agent.active_version_id,
      creatorEndpointConfigId: reviewedCreatorEndpointConfigId,
      runtimeType,
      supabase,
      workflowId: reviewedWorkflowId,
    });

    if (!securityPassed) {
      redirectWithError(locale, "security-review-required");
    }
  }

  if (decision === "changes" && notes.length < 10) {
    redirectWithError(locale, "changes-notes-required");
  }

  const nextStatus =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : "in_review";
  const reviewNotes = notes || null;
  const expectedStatus = decision === "start_review" ? "submitted" : "in_review";

  const { data: updatedAgent, error: updateError } = await supabase
    .from("agents")
    .update({ status: nextStatus })
    .eq("id", agent.id)
    .eq("status", expectedStatus)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (updateError || !updatedAgent) {
    redirectWithError(locale, "agent-update-failed");
  }

  const { error: reviewError } = await supabase.from("admin_reviews").insert({
    agent_id: agent.id,
    agent_version_id: agent.active_version_id,
    admin_id: profile.id,
    decision: nextStatus,
    risk_level: agent.risk_level,
    notes: reviewNotes,
  });

  if (reviewError) {
    redirectWithError(locale, "review-log-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: `agent.${decision}`,
    entity_type: "agent",
    entity_id: agent.id,
    metadata: {
      previous_status: agent.status,
      next_status: nextStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/en/admin");
  revalidatePath("/code/admin/review");
  revalidatePath("/code/admin/agents");
  revalidatePath("/creator");
  revalidatePath("/creator/dashboard");
  revalidatePath("/en/creator");
  revalidatePath("/en/creator/dashboard");
  revalidatePath("/search");

  redirect(`/code/admin/review?reviewed=${encodeURIComponent(agent.id)}`);
}

export async function moderateAgentPublicationAction(formData: FormData) {
  const locale = readLocale(formData);
  const profile = await requireAdminAccess(locale, localizedPath("/admin", locale));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithAgentsError(locale, "missing-config");
  }

  const agentId = readText(formData, "agent_id");
  const action = readText(formData, "moderation_action");
  const reason = readText(formData, "reason");

  if (!agentId || !isModerationAction(action)) {
    redirectWithAgentsError(locale, "invalid-moderation");
  }

  const expectedStatus = action === "suspend" ? "approved" : "suspended";
  const nextStatus = action === "suspend" ? "suspended" : action === "restore" ? "approved" : "archived";

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,risk_level,status")
    .eq("id", agentId)
    .maybeSingle<AgentModerationRow>();

  if (agentError || !agent || agent.status !== expectedStatus) {
    redirectWithAgentsError(locale, "agent-moderation-failed");
  }

  if (action === "restore" && (!agent.active_version_id || agent.risk_level === "forbidden_beta")) {
    redirectWithAgentsError(locale, "agent-moderation-failed");
  }

  const { data: updatedAgent, error: updateError } = await supabase
    .from("agents")
    .update({ status: nextStatus })
    .eq("id", agentId)
    .eq("status", expectedStatus)
    .select("id,status")
    .maybeSingle<{ id: string; status: string }>();

  if (updateError || !updatedAgent) {
    redirectWithAgentsError(locale, "agent-moderation-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: `agent.${action}`,
    entity_type: "agent",
    entity_id: updatedAgent.id,
    metadata: {
      previous_status: expectedStatus,
      next_status: nextStatus,
      reason: reason || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/en/admin");
  revalidatePath("/code/admin/agents");
  revalidatePath("/code/admin/review");
  revalidatePath("/search");
  revalidatePath("/en/search");
  revalidatePath("/marketplace");
  revalidatePath("/en/marketplace");
  revalidatePath("/creator");
  revalidatePath("/creator/dashboard");
  revalidatePath("/en/creator");
  revalidatePath("/en/creator/dashboard");

  redirect(`/code/admin/agents?moderated=${encodeURIComponent(updatedAgent.id)}`);
}

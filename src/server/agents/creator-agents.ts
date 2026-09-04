import "server-only";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAgentWorkspaceBlueprint, type AgentWorkspaceBlueprintV1 } from "@/server/agents/workspace-blueprint";
import {
  buildWorkspaceCompatibilityDiagnostic,
  workspaceCompatibilityMode,
  type WorkspaceCompatibilityDiagnostic,
} from "@/server/agents/workspace-compatibility";
import { normalizeWorkflowDefinition } from "@/server/workflows/runtime";
import type { AgentStatus, PricingType } from "@/types/agent";

export type AgentCategoryOption = {
  id: string;
  name: string;
  slug: string;
};

export type CreatorAgentListItem = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  status: AgentStatus;
  pricingType: PricingType;
  startingPriceCents: number | null;
  currency: string;
  riskLevel: "low" | "medium" | "high" | "forbidden_beta";
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
  rating: number;
  reviews: number;
  version: Pick<AgentContract, "executionMode" | "runtimeType" | "workspaceMode"> | null;
  workspaceSignal: {
    detail: string;
    fallbackRequired: boolean;
    label: string;
    mode: "agenthub_hosted" | "creator_infra_required" | "hybrid_creator_infra";
  } | null;
  securityPrecheckSignal: {
    label: string;
    recommendedAction: string;
    riskLevel: string;
    status: string;
  } | null;
  latestAdminReview: {
    decision: AgentStatus;
    notes: string | null;
    createdAt: string;
    isChangesRequest: boolean;
  } | null;
};

export type CreatorAgentRunSummary = {
  id: string;
  agentId: string;
  agentName: string;
  actionLabel: string;
  status: "running" | "succeeded" | "failed";
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
};

type CreatorAgentRunRow = {
  id: string;
  agent_id: string;
  action_label: string;
  status: CreatorAgentRunSummary["status"];
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
};

export type CreatorAgentEditItem = {
  id: string;
  categoryId: string | null;
  name: string;
  summary: string;
  description: string;
  status: AgentStatus;
  pricingType: PricingType;
  startingPriceCents: number | null;
  riskLevel: "low" | "medium" | "high" | "forbidden_beta";
  version: {
    capabilities: string[];
    requiredInputs: string[];
    deliverables: string[];
    limitations: string[];
  } & AgentContract | null;
  latestAdminReview: {
    decision: AgentStatus;
    notes: string | null;
    createdAt: string;
    isChangesRequest: boolean;
  } | null;
};

type AgentCategoryRow = {
  id: string;
  name: string;
  slug: string;
};

export type CreatorAgentAccessStats = {
  total: number;
  active: number;
  stopped: number;
  expired: number;
  cancelled: number;
};

export type CreatorWorkspaceReadiness = {
  blueprint: AgentWorkspaceBlueprintV1;
  compatibility: WorkspaceCompatibilityDiagnostic;
};

export type CreatorSecurityPrecheckSummary = {
  createdAt: string;
  findings: Array<{
    detail: string;
    severity: "blocker" | "warning";
    title: string;
  }>;
  label: string;
  recommendedAction: string;
  riskLevel: string;
  riskScore: number;
  status: string;
  summary: string;
};

export type CreatorAgentDetailItem = CreatorAgentListItem & {
  analyticsLimited: boolean;
  description: string;
  accessStats: CreatorAgentAccessStats;
  recentRuns: CreatorAgentRunSummary[];
  securityPrecheck: CreatorSecurityPrecheckSummary | null;
  workspaceReadiness: CreatorWorkspaceReadiness | null;
  version:
    | ({
        capabilities: string[];
        requiredInputs: string[];
        deliverables: string[];
        limitations: string[];
      } & AgentContract)
    | null;
};

type CreatorProfileRow = {
  id: string;
};

type CreatorAgentRow = {
  id: string;
  slug?: string;
  category_id?: string | null;
  name: string;
  summary: string;
  status: AgentStatus;
  description?: string;
  pricing_type: PricingType;
  starting_price_cents?: number | null;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  active_version_id?: string | null;
  created_at: string;
  updated_at: string;
  currency?: string | null;
  agent_categories: { name: string } | { name: string }[] | null;
};

type AgentVersionListRow = {
  id: string;
  execution_mode: string | null;
  runtime_type: string | null;
  workspace_mode: string | null;
};

type WorkflowListRow = {
  agent_version_id: string;
  definition: unknown;
};

type AgentReviewRatingRow = {
  agent_id: string;
  rating: number;
};

type AgentVersionEditRow = {
  capabilities: string[] | null;
  required_inputs: string[] | null;
  deliverables: string[] | null;
  limitations: string[] | null;
  workspace_mode: string | null;
  setup_requirements: unknown;
  output_promise: unknown;
  execution_mode: string | null;
  runtime_type: string | null;
  data_policy: unknown;
};

type RuntimeSettingReadinessRow = {
  enabled: boolean;
  run_enabled: boolean;
};

type WorkflowReadinessRow = {
  definition: unknown;
  status: string;
};

type EndpointReadinessRow = {
  creator_api_endpoints:
    | { status: string }
    | { status: string }[]
    | null;
  status: string;
};

type SecurityReviewReadinessRow = {
  status: string;
};

type CreatorSecurityPrecheckRow = {
  agent_version_id: string;
  created_at: string;
  findings: unknown;
  recommended_action: string;
  risk_level_suggested: string;
  risk_score: number;
  status: string;
  summary: string | null;
};

type AdminReviewFeedbackRow = {
  agent_id: string;
  decision: AgentStatus;
  notes: string | null;
  created_at: string;
};

const CREATOR_ANALYTICS_LIMITED = true;

export type CreatorAgentsResult = {
  agents: CreatorAgentListItem[];
  recentRuns: CreatorAgentRunSummary[];
  creatorProfileMissing: boolean;
  error: string | null;
  usageAnalyticsLimited: boolean;
};

export type CreatorProfileLookup = {
  id: string | null;
  creatorProfileMissing: boolean;
  error: string | null;
};

function readCategoryName(category: CreatorAgentRow["agent_categories"]) {
  if (Array.isArray(category)) {
    return category[0]?.name ?? null;
  }

  return category?.name ?? null;
}

function readSingle<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function creatorPrecheckLabel(status: string, riskLevel: string) {
  if (status === "passed") {
    return "Précheck OK";
  }

  if (status === "warning") {
    return "Précheck à surveiller";
  }

  if (status === "failed" || riskLevel === "blocked") {
    return "Précheck bloquant";
  }

  if (status === "error") {
    return "Précheck à relancer";
  }

  if (status === "stale") {
    return "Précheck obsolète";
  }

  return "Précheck en attente";
}

function isCreatorVisibleFinding(value: unknown): value is {
  detail: string;
  severity: "blocker" | "warning" | "pass";
  title: string;
} {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as { detail?: unknown }).detail === "string" &&
    typeof (value as { title?: unknown }).title === "string" &&
    ["blocker", "warning", "pass"].includes(String((value as { severity?: unknown }).severity))
  );
}

function isCreatorActionableFinding(value: {
  detail: string;
  severity: "blocker" | "warning" | "pass";
  title: string;
}): value is {
  detail: string;
  severity: "blocker" | "warning";
  title: string;
} {
  return value.severity === "blocker" || value.severity === "warning";
}

function mapCreatorSecurityPrecheck(row: CreatorSecurityPrecheckRow | null | undefined): CreatorSecurityPrecheckSummary | null {
  if (!row) {
    return null;
  }

  const findings = Array.isArray(row.findings)
    ? row.findings
        .filter(isCreatorVisibleFinding)
        .filter(isCreatorActionableFinding)
        .slice(0, 5)
        .map((finding) => ({
          detail: finding.detail,
          severity: finding.severity,
          title: finding.title,
        }))
    : [];

  return {
    createdAt: row.created_at,
    findings,
    label: creatorPrecheckLabel(row.status, row.risk_level_suggested),
    recommendedAction: row.recommended_action,
    riskLevel: row.risk_level_suggested,
    riskScore: row.risk_score,
    status: row.status,
    summary: row.summary ?? "Précheck sécurité enregistré. L’admin garde la décision finale.",
  };
}

function buildCreatorWorkspaceSignal(input: {
  runtimeType: AgentContract["runtimeType"];
  workflowDefinition?: unknown;
}) {
  const workflowDefinition = normalizeWorkflowDefinition(input.workflowDefinition);
  const webhookStepCount = workflowDefinition?.steps.filter((step) => step.type === "webhook_step").length ?? 0;
  const mode = workspaceCompatibilityMode({
    runtimeType: input.runtimeType,
    workflowWebhookStepCount: webhookStepCount,
  });

  if (mode === "creator_infra_required") {
    return {
      detail: "L’exécution dépendra d’un endpoint creator approuvé et appelé côté serveur.",
      fallbackRequired: true,
      label: "Fallback infra créateur",
      mode,
    };
  }

  if (mode === "hybrid_creator_infra") {
    return {
      detail: "AgentHub orchestre le workflow, avec au moins un webhook creator approuvé.",
      fallbackRequired: true,
      label: "Workspace hybride",
      mode,
    };
  }

  if (input.runtimeType === "document_file") {
    return {
      detail: "Workspace document AgentHub avec fichier privé et extraction texte beta.",
      fallbackRequired: false,
      label: "Workspace document",
      mode,
    };
  }

  if (input.runtimeType === "workflow_automation") {
    return {
      detail: "Workflow orchestré par AgentHub sans webhook creator détecté.",
      fallbackRequired: false,
      label: "Workspace AgentHub",
      mode,
    };
  }

  return {
    detail: "Workspace AgentHub standard avec historique et avis vérifié.",
    fallbackRequired: false,
    label: "Workspace AgentHub",
    mode,
  };
}

async function buildCreatorWorkspaceReadiness(input: {
  agent: CreatorAgentRow;
  version: CreatorAgentDetailItem["version"];
}) {
  const serviceSupabase = createSupabaseServiceClient();

  if (!serviceSupabase || !input.agent.active_version_id || !input.version) {
    return null;
  }

  const runtimeType = input.version.runtimeType;
  const documentInputMode =
    runtimeType === "document_file" ||
    (runtimeType === "llm_prompt" && (input.version.dataPolicy.requires_files || input.version.workspaceMode === "document_required"));
  const [runtimeSettingResult, workflowResult, endpointResult, securityReviewResult] = await Promise.all([
    serviceSupabase
      .from("agent_runtime_settings")
      .select("enabled,run_enabled")
      .eq("runtime_type", runtimeType)
      .maybeSingle<RuntimeSettingReadinessRow>(),
    runtimeType === "workflow_automation"
      ? serviceSupabase
          .from("agent_version_workflows")
          .select("status,definition")
          .eq("agent_version_id", input.agent.active_version_id)
          .eq("agent_id", input.agent.id)
          .maybeSingle<WorkflowReadinessRow>()
      : Promise.resolve({ data: null, error: null }),
    runtimeType === "creator_endpoint"
      ? serviceSupabase
          .from("agent_version_creator_endpoints")
          .select("status,creator_api_endpoints!agent_version_creator_endpoints_endpoint_id_fkey(status)")
          .eq("agent_version_id", input.agent.active_version_id)
          .eq("agent_id", input.agent.id)
          .maybeSingle<EndpointReadinessRow>()
      : Promise.resolve({ data: null, error: null }),
    serviceSupabase
      .from("security_reviews")
      .select("status")
      .eq("agent_version_id", input.agent.active_version_id)
      .eq("runtime_type", runtimeType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SecurityReviewReadinessRow>(),
  ]);
  const workflowDefinition = normalizeWorkflowDefinition(workflowResult.data?.definition);
  const workflowWebhookStepCount = workflowDefinition?.steps.filter((step) => step.type === "webhook_step").length ?? 0;
  const endpoint = readSingle(endpointResult.data?.creator_api_endpoints ?? null);
  const securityReviewStatus = securityReviewResult.data?.status ?? null;
  const securityReviewWaived = securityReviewStatus === "waived";
  const assetApproved =
    runtimeType === "workflow_automation"
      ? Boolean(workflowResult.data?.status === "approved" && workflowDefinition)
      : runtimeType === "creator_endpoint"
        ? Boolean(endpointResult.data?.status === "approved" && endpoint?.status === "approved")
        : true;

  return {
    blueprint: buildAgentWorkspaceBlueprint({
      actions: [],
      agent: {
        capabilities: input.version.capabilities,
        deliverables: input.version.deliverables,
        limitations: input.version.limitations,
        requiredInputsList: input.version.requiredInputs,
      },
      contract: input.version,
      documentInputMode,
      locale: "fr",
    }),
    compatibility: buildWorkspaceCompatibilityDiagnostic({
      agentStatus: input.agent.status,
      assetApproved,
      endpointHealth: null,
      runtimeSetting: runtimeSettingResult.error ? null : runtimeSettingResult.data,
      runtimeType,
      securityReviewStatus,
      securityReviewWaived,
      workflowWebhookHealth: null,
      workflowWebhookStepCount,
    }),
  };
}

export async function getAgentCategoryOptions(): Promise<AgentCategoryOption[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("agent_categories")
    .select("id,name,slug")
    .order("name", { ascending: true })
    .returns<AgentCategoryRow[]>();

  return data ?? [];
}

export async function getCreatorProfileForUser(): Promise<CreatorProfileLookup> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      id: null,
      creatorProfileMissing: false,
      error: "missing-config",
    };
  }

  const { data, error } = await supabase.rpc("get_own_creator_profile_id");

  if (!error) {
    return {
      id: data ?? null,
      creatorProfileMissing: !data,
      error: null,
    };
  }

  const rpcMissing =
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message.toLowerCase().includes("could not find the function") ||
    error.message.toLowerCase().includes("function public.get_own_creator_profile_id");

  if (!rpcMissing) {
    return {
      id: null,
      creatorProfileMissing: false,
      error: "creator-profile-error",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      id: null,
      creatorProfileMissing: false,
      error: "creator-profile-error",
    };
  }

  // Transitional fallback for environments where the hardening migration has
  // not reached PostgREST yet. Hardened databases use the RPC above; older
  // databases still have the previous creator_profiles.user_id SELECT grant.
  const { data: creatorProfile, error: profileError } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<CreatorProfileRow>();

  if (profileError) {
    return {
      id: null,
      creatorProfileMissing: false,
      error: "creator-profile-error",
    };
  }

  return {
    id: creatorProfile?.id ?? null,
    creatorProfileMissing: !creatorProfile,
    error: null,
  };
}

export async function getCreatorWorkflowRuntimeAccess(creatorId?: string | null) {
  if (!creatorId) {
    return false;
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("creator_runtime_access")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("runtime_type", "workflow_automation")
    .eq("enabled", true)
    .limit(1);

  return !error && Boolean(data?.length);
}

export async function getCreatorAgentsForUser(): Promise<CreatorAgentsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      agents: [],
      recentRuns: [],
      creatorProfileMissing: false,
      error: "missing-config",
      usageAnalyticsLimited: CREATOR_ANALYTICS_LIMITED,
    };
  }

  const creatorProfileLookup = await getCreatorProfileForUser();

  if (creatorProfileLookup.error) {
    return {
      agents: [],
      recentRuns: [],
      creatorProfileMissing: false,
      error: creatorProfileLookup.error,
      usageAnalyticsLimited: CREATOR_ANALYTICS_LIMITED,
    };
  }

  if (creatorProfileLookup.creatorProfileMissing || !creatorProfileLookup.id) {
    return {
      agents: [],
      recentRuns: [],
      creatorProfileMissing: true,
      error: null,
      usageAnalyticsLimited: CREATOR_ANALYTICS_LIMITED,
    };
  }

  const { data, error } = await supabase
    .from("agents")
    .select(
      "id,slug,name,summary,status,pricing_type,starting_price_cents,currency,risk_level,active_version_id,created_at,updated_at,agent_categories(name)",
    )
    .eq("creator_id", creatorProfileLookup.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .returns<CreatorAgentRow[]>();

  if (error) {
    return {
      agents: [],
      recentRuns: [],
      creatorProfileMissing: false,
      error: "agents-error",
      usageAnalyticsLimited: CREATOR_ANALYTICS_LIMITED,
    };
  }

  const agentRows = data ?? [];
  const agentIds = agentRows.map((agent) => agent.id);
  const versionIds = agentRows.map((agent) => agent.active_version_id).filter((id): id is string => Boolean(id));
  const latestReviewsByAgent = new Map<string, CreatorAgentListItem["latestAdminReview"]>();
  const versionsById = new Map<string, AgentVersionListRow>();
  const workflowDefinitionsByVersion = new Map<string, unknown>();
  const prechecksByVersion = new Map<string, CreatorSecurityPrecheckSummary>();
  const reviewStatsByAgent = new Map<string, { rating: number; reviews: number }>();
  const recentRuns: CreatorAgentRunSummary[] = [];
  const agentNamesById = new Map(agentRows.map((agent) => [agent.id, agent.name]));

  if (agentIds.length > 0) {
    const { data: reviews } = await supabase
      .from("admin_reviews")
      .select("agent_id,decision,notes,created_at")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: false })
      .returns<AdminReviewFeedbackRow[]>();

    for (const review of reviews ?? []) {
      if (!latestReviewsByAgent.has(review.agent_id)) {
        latestReviewsByAgent.set(review.agent_id, {
          decision: review.decision,
          notes: review.notes,
          createdAt: review.created_at,
          isChangesRequest: review.decision === "in_review" && Boolean(review.notes?.trim()),
        });
      }
    }

    const { data: reviewRatings } = await supabase
      .from("agent_reviews")
      .select("agent_id,rating")
      .in("agent_id", agentIds)
      .returns<AgentReviewRatingRow[]>();

    for (const ratingRow of reviewRatings ?? []) {
      const current = reviewStatsByAgent.get(ratingRow.agent_id) ?? { rating: 0, reviews: 0 };
      reviewStatsByAgent.set(ratingRow.agent_id, {
        rating: current.rating + ratingRow.rating,
        reviews: current.reviews + 1,
      });
    }

    const serviceSupabase = createSupabaseServiceClient();

    if (serviceSupabase) {
      const { data: runRows } = await serviceSupabase
        .from("agent_runs")
        .select("id,agent_id,action_label,status,error_code,created_at,completed_at")
        .in("agent_id", agentIds)
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<CreatorAgentRunRow[]>();

      for (const run of runRows ?? []) {
        recentRuns.push({
          id: run.id,
          agentId: run.agent_id,
          agentName: agentNamesById.get(run.agent_id) ?? "AgentHub agent",
          actionLabel: run.action_label,
          status: run.status,
          errorCode: run.error_code,
          createdAt: run.created_at,
          completedAt: run.completed_at,
        });
      }
    }

  }

  if (versionIds.length > 0) {
    const serviceSupabase = createSupabaseServiceClient();
    const [versionsResult, workflowsResult, prechecksResult] = await Promise.all([
      supabase
        .from("agent_versions")
        .select("id,workspace_mode,execution_mode,runtime_type")
        .in("id", versionIds)
        .returns<AgentVersionListRow[]>(),
      supabase
        .from("agent_version_workflows")
        .select("agent_version_id,definition")
        .in("agent_version_id", versionIds)
        .returns<WorkflowListRow[]>(),
      serviceSupabase
        ? serviceSupabase
            .from("agent_security_prechecks")
            .select("agent_version_id,status,risk_score,risk_level_suggested,recommended_action,summary,findings,created_at")
            .in("agent_version_id", versionIds)
            .order("created_at", { ascending: false })
            .returns<CreatorSecurityPrecheckRow[]>()
        : Promise.resolve({ data: [] as CreatorSecurityPrecheckRow[], error: null }),
    ]);

    for (const version of versionsResult.data ?? []) {
      versionsById.set(version.id, version);
    }

    for (const workflow of workflowsResult.data ?? []) {
      if (!workflowDefinitionsByVersion.has(workflow.agent_version_id)) {
        workflowDefinitionsByVersion.set(workflow.agent_version_id, workflow.definition);
      }
    }

    for (const precheck of prechecksResult.data ?? []) {
      if (!prechecksByVersion.has(precheck.agent_version_id)) {
        const mapped = mapCreatorSecurityPrecheck(precheck);

        if (mapped) {
          prechecksByVersion.set(precheck.agent_version_id, mapped);
        }
      }
    }
  }

  return {
    agents: agentRows.map((agent) => {
      const latestAdminReview = latestReviewsByAgent.get(agent.id) ?? null;
      const reviewStats = reviewStatsByAgent.get(agent.id);
      const activeVersion = agent.active_version_id ? versionsById.get(agent.active_version_id) : null;
      const normalizedContract = normalizeAgentContract({
        executionMode: activeVersion?.execution_mode ?? null,
        runtimeType: activeVersion?.runtime_type ?? null,
        workspaceMode: activeVersion?.workspace_mode ?? null,
      });
      const workspaceSignal = activeVersion
        ? buildCreatorWorkspaceSignal({
            runtimeType: normalizedContract.runtimeType,
            workflowDefinition: workflowDefinitionsByVersion.get(activeVersion.id),
          })
        : null;
      const securityPrecheck = activeVersion ? prechecksByVersion.get(activeVersion.id) ?? null : null;
      const shouldExpectPrecheck =
        Boolean(activeVersion) &&
        (["document_file", "workflow_automation", "creator_endpoint"].includes(normalizedContract.runtimeType) ||
          ["submitted", "in_review"].includes(agent.status));

      return {
        id: agent.id,
        slug: agent.slug ?? "",
        name: agent.name,
        summary: agent.summary,
        status: agent.status,
        pricingType: agent.pricing_type,
        startingPriceCents: agent.starting_price_cents ?? null,
        currency: agent.currency ?? "eur",
        riskLevel: agent.risk_level,
        categoryName: readCategoryName(agent.agent_categories),
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        rating: reviewStats && reviewStats.reviews > 0 ? reviewStats.rating / reviewStats.reviews : 0,
        reviews: reviewStats?.reviews ?? 0,
        version: activeVersion
          ? {
              executionMode: normalizedContract.executionMode,
              runtimeType: normalizedContract.runtimeType,
              workspaceMode: normalizedContract.workspaceMode,
            }
          : null,
        workspaceSignal,
        securityPrecheckSignal: securityPrecheck
          ? {
              label: securityPrecheck.label,
              recommendedAction: securityPrecheck.recommendedAction,
              riskLevel: securityPrecheck.riskLevel,
              status: securityPrecheck.status,
            }
          : shouldExpectPrecheck
            ? {
                label: "Précheck non généré",
                recommendedAction: "wait_precheck",
                riskLevel: "unknown",
                status: "not_started",
              }
            : null,
        latestAdminReview: latestAdminReview
          ? {
              ...latestAdminReview,
              isChangesRequest: agent.status === "in_review" && latestAdminReview.isChangesRequest,
            }
          : null,
      };
    }),
    recentRuns,
    creatorProfileMissing: false,
    error: null,
    usageAnalyticsLimited: CREATOR_ANALYTICS_LIMITED,
  };
}

export async function getCreatorAgentForEdit(agentId: string): Promise<{
  agent: CreatorAgentEditItem | null;
  creatorProfileMissing: boolean;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { agent: null, creatorProfileMissing: false, error: "missing-config" };
  }

  const creatorProfileLookup = await getCreatorProfileForUser();

  if (creatorProfileLookup.error) {
    return { agent: null, creatorProfileMissing: false, error: creatorProfileLookup.error };
  }

  if (creatorProfileLookup.creatorProfileMissing || !creatorProfileLookup.id) {
    return { agent: null, creatorProfileMissing: true, error: null };
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,category_id,name,summary,description,status,pricing_type,starting_price_cents,risk_level,active_version_id,created_at,agent_categories(name)")
    .eq("id", agentId)
    .eq("creator_id", creatorProfileLookup.id)
    .maybeSingle<CreatorAgentRow>();

  if (agentError) {
    return { agent: null, creatorProfileMissing: false, error: "agent-load-failed" };
  }

  if (!agent) {
    return { agent: null, creatorProfileMissing: false, error: "agent-not-found" };
  }

  let version: CreatorAgentEditItem["version"] = null;
  let latestAdminReview: CreatorAgentEditItem["latestAdminReview"] = null;

  if (agent.active_version_id) {
    const { data: versionRow } = await supabase
      .from("agent_versions")
      .select("capabilities,required_inputs,deliverables,limitations,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy")
      .eq("id", agent.active_version_id)
      .maybeSingle<AgentVersionEditRow>();

    if (versionRow) {
      const contract = normalizeAgentContract({
        workspaceMode: versionRow.workspace_mode,
        setupRequirements: versionRow.setup_requirements,
        outputPromise: versionRow.output_promise,
        executionMode: versionRow.execution_mode,
        runtimeType: versionRow.runtime_type,
        dataPolicy: versionRow.data_policy,
      });

      version = {
        capabilities: versionRow.capabilities ?? [],
        requiredInputs: versionRow.required_inputs ?? [],
        deliverables: versionRow.deliverables ?? [],
        limitations: versionRow.limitations ?? [],
        ...contract,
      };
    }
  }

  const { data: latestReview } = await supabase
    .from("admin_reviews")
    .select("decision,notes,created_at")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Omit<AdminReviewFeedbackRow, "agent_id">>();

  if (latestReview) {
    latestAdminReview = {
      decision: latestReview.decision,
      notes: latestReview.notes,
      createdAt: latestReview.created_at,
      isChangesRequest: agent.status === "in_review" && latestReview.decision === "in_review" && Boolean(latestReview.notes?.trim()),
    };
  }

  return {
    agent: {
      id: agent.id,
      categoryId: agent.category_id ?? null,
      name: agent.name,
      summary: agent.summary,
      description: agent.description ?? "",
      status: agent.status,
      pricingType: agent.pricing_type,
      startingPriceCents: agent.starting_price_cents ?? null,
      riskLevel: agent.risk_level,
      version,
      latestAdminReview,
    },
    creatorProfileMissing: false,
    error: null,
  };
}

export async function getCreatorAgentForCodeDetail(agentId: string): Promise<{
  agent: CreatorAgentDetailItem | null;
  creatorProfileMissing: boolean;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { agent: null, creatorProfileMissing: false, error: "missing-config" };
  }

  const creatorProfileLookup = await getCreatorProfileForUser();

  if (creatorProfileLookup.error) {
    return { agent: null, creatorProfileMissing: false, error: creatorProfileLookup.error };
  }

  if (creatorProfileLookup.creatorProfileMissing || !creatorProfileLookup.id) {
    return { agent: null, creatorProfileMissing: true, error: null };
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select(
      "id,slug,category_id,name,summary,description,status,pricing_type,starting_price_cents,currency,risk_level,active_version_id,created_at,updated_at,agent_categories(name)",
    )
    .eq("id", agentId)
    .eq("creator_id", creatorProfileLookup.id)
    .neq("status", "archived")
    .maybeSingle<CreatorAgentRow>();

  if (agentError) {
    return { agent: null, creatorProfileMissing: false, error: "agent-load-failed" };
  }

  if (!agent) {
    return { agent: null, creatorProfileMissing: false, error: "agent-not-found" };
  }

  let version: CreatorAgentDetailItem["version"] = null;
  let latestAdminReview: CreatorAgentDetailItem["latestAdminReview"] = null;
  let securityPrecheck: CreatorSecurityPrecheckSummary | null = null;
  let workspaceReadiness: CreatorWorkspaceReadiness | null = null;
  let rating = 0;
  let reviews = 0;
  const recentRuns: CreatorAgentRunSummary[] = [];
  const accessStats: CreatorAgentAccessStats = {
    total: 0,
    active: 0,
    stopped: 0,
    expired: 0,
    cancelled: 0,
  };

  const [reviewResponse, latestReviewResponse] = await Promise.all([
    supabase.from("agent_reviews").select("rating").eq("agent_id", agent.id).returns<Pick<AgentReviewRatingRow, "rating">[]>(),
    supabase
      .from("admin_reviews")
      .select("decision,notes,created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Omit<AdminReviewFeedbackRow, "agent_id">>(),
  ]);

  const reviewRows = reviewResponse.data ?? [];
  if (!reviewResponse.error && reviewRows.length > 0) {
    reviews = reviewRows.length;
    rating = reviewRows.reduce((sum, row) => sum + row.rating, 0) / reviews;
  }

  if (latestReviewResponse.data) {
    latestAdminReview = {
      decision: latestReviewResponse.data.decision,
      notes: latestReviewResponse.data.notes,
      createdAt: latestReviewResponse.data.created_at,
      isChangesRequest:
        agent.status === "in_review" &&
        latestReviewResponse.data.decision === "in_review" &&
        Boolean(latestReviewResponse.data.notes?.trim()),
    };
  }

  if (agent.active_version_id) {
    const { data: versionRow } = await supabase
      .from("agent_versions")
      .select("capabilities,required_inputs,deliverables,limitations,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy")
      .eq("id", agent.active_version_id)
      .maybeSingle<AgentVersionEditRow>();

    if (versionRow) {
      const contract = normalizeAgentContract({
        workspaceMode: versionRow.workspace_mode,
        setupRequirements: versionRow.setup_requirements,
        outputPromise: versionRow.output_promise,
        executionMode: versionRow.execution_mode,
        runtimeType: versionRow.runtime_type,
        dataPolicy: versionRow.data_policy,
      });

      version = {
        capabilities: versionRow.capabilities ?? [],
        requiredInputs: versionRow.required_inputs ?? [],
        deliverables: versionRow.deliverables ?? [],
        limitations: versionRow.limitations ?? [],
        ...contract,
      };
    }
  }

  workspaceReadiness = await buildCreatorWorkspaceReadiness({
    agent,
    version,
  });

  if (agent.active_version_id) {
    const serviceSupabase = createSupabaseServiceClient();

    if (serviceSupabase) {
      const { data: precheckRow } = await serviceSupabase
        .from("agent_security_prechecks")
        .select("agent_version_id,status,risk_score,risk_level_suggested,recommended_action,summary,findings,created_at")
        .eq("agent_version_id", agent.active_version_id)
        .eq("agent_id", agent.id)
        .eq("creator_id", creatorProfileLookup.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<CreatorSecurityPrecheckRow>();

      securityPrecheck = mapCreatorSecurityPrecheck(precheckRow);
    }
  }

  return {
    agent: {
      id: agent.id,
      analyticsLimited: CREATOR_ANALYTICS_LIMITED,
      slug: agent.slug ?? "",
      name: agent.name,
      summary: agent.summary,
      description: agent.description ?? "",
      status: agent.status,
      pricingType: agent.pricing_type,
      startingPriceCents: agent.starting_price_cents ?? null,
      currency: agent.currency ?? "eur",
      riskLevel: agent.risk_level,
      categoryName: readCategoryName(agent.agent_categories),
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
      rating,
      reviews,
      version,
      workspaceSignal: workspaceReadiness
        ? {
            detail: workspaceReadiness.compatibility.detail,
            fallbackRequired: workspaceReadiness.compatibility.decision.fallbackRequired,
            label: workspaceReadiness.compatibility.label,
            mode: workspaceReadiness.compatibility.mode,
          }
        : null,
      securityPrecheck,
      securityPrecheckSignal: securityPrecheck
        ? {
            label: securityPrecheck.label,
            recommendedAction: securityPrecheck.recommendedAction,
            riskLevel: securityPrecheck.riskLevel,
            status: securityPrecheck.status,
          }
        : null,
      workspaceReadiness,
      latestAdminReview,
      accessStats,
      recentRuns,
    },
    creatorProfileMissing: false,
    error: null,
  };
}

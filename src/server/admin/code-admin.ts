import "server-only";

import type { AgentRuntimeType } from "@/lib/agent-contract";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeWorkflowDefinition } from "@/server/workflows/runtime";

type RuntimeAccessRow = {
  enabled: boolean;
  notes: string | null;
  runtime_type: string;
  updated_at: string;
};

type CreatorAdminRow = {
  id: string;
  public_name: string;
  verified_at: string | null;
  created_at: string;
  creator_runtime_access: RuntimeAccessRow[] | null;
  profiles:
    | { display_name: string | null; email: string | null; role: string | null }
    | { display_name: string | null; email: string | null; role: string | null }[]
    | null;
  agents: { id: string; status: string }[] | null;
};

type RuntimeSettingRow = {
  creator_visible: boolean;
  description: string | null;
  enabled: boolean;
  run_enabled: boolean;
  runtime_type: AgentRuntimeType;
  updated_at: string;
};

type WorkflowEndpointRow = {
  approved_at: string | null;
  created_at: string;
  creator_id: string;
  creator_profiles: { public_name: string } | { public_name: string }[] | null;
  endpoint_url: string;
  id: string;
  name: string;
  status: string;
  verification_notes: string | null;
};

type CreatorApiEndpointRow = WorkflowEndpointRow;

type SecurityReviewRow = {
  agent_id: string | null;
  agent_version_id: string | null;
  asset_id: string;
  asset_type: string;
  created_at: string;
  creator_api_endpoint_id: string | null;
  creator_endpoint_config_id: string | null;
  findings: unknown;
  id: string;
  notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  runtime_type: string;
  status: string;
  updated_at: string;
  workflow_id: string | null;
  agents: { name: string; slug: string; status: string } | { name: string; slug: string; status: string }[] | null;
};

type PaymentAdminRow = {
  activation_error: string | null;
  agent_id: string;
  amount_cents: number;
  created_at: string;
  currency: string;
  id: string;
  rental_request_id: string | null;
  status: string;
  stripe_checkout_session_id: string | null;
  user_id: string;
  agents: { name: string; slug: string } | { name: string; slug: string }[] | null;
  profiles: { email: string } | { email: string }[] | null;
};

type AuditLogRow = {
  action: string;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string;
  metadata: unknown;
  profiles: { email: string } | { email: string }[] | null;
};

type AgentRunOpsRow = {
  agent_id: string;
  created_at: string;
  error_code: string | null;
  id: string;
  provider: string;
  rental_request_id: string;
  status: string;
  user_id: string;
  agents: { name: string; slug: string } | { name: string; slug: string }[] | null;
  profiles: { email: string } | { email: string }[] | null;
};

type AdvancedAgentVersionRow = {
  agent_id: string;
  created_at: string;
  execution_mode: string | null;
  id: string;
  runtime_type: AgentRuntimeType;
  workspace_mode: string | null;
  agents:
    | {
        active_version_id: string | null;
        creator_id: string;
        id: string;
        name: string;
        slug: string;
        status: string;
      }
    | Array<{
        active_version_id: string | null;
        creator_id: string;
        id: string;
        name: string;
        slug: string;
        status: string;
      }>
    | null;
};

type AdvancedAgentRow = {
  active_version_id: string | null;
  creator_id: string;
  id: string;
  name: string;
  slug: string;
  status: string;
};

type CreatorIdentityRow = {
  id: string;
  public_name: string;
  profiles: { email: string | null } | { email: string | null }[] | null;
};

type WorkflowDiagnosticRow = {
  agent_version_id: string;
  definition: unknown;
  id: string;
  status: string;
};

type EndpointDiagnosticConfigRow = {
  agent_version_id: string;
  creator_api_endpoints:
    | { endpoint_url: string; id: string; name: string; status: string }
    | Array<{ endpoint_url: string; id: string; name: string; status: string }>
    | null;
  endpoint_id: string;
  id: string;
  status: string;
};

type SecurityReviewDiagnosticRow = {
  agent_version_id: string | null;
  created_at: string;
  id: string;
  runtime_type: string;
  status: string;
};

type AgentRunDiagnosticRow = {
  agent_version_id: string;
  created_at: string;
  error_code: string | null;
  id: string;
  provider: string;
  status: string;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapAccess(rows: RuntimeAccessRow[] | null | undefined) {
  return {
    workflow_automation: rows?.find((row) => row.runtime_type === "workflow_automation") ?? null,
    creator_endpoint: rows?.find((row) => row.runtime_type === "creator_endpoint") ?? null,
  };
}

export async function getAdminCreators() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { creators: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("creator_profiles")
    .select(
      "id,public_name,verified_at,created_at,profiles!creator_profiles_user_id_fkey(email,display_name,role),creator_runtime_access(runtime_type,enabled,notes,updated_at),agents(id,status)",
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<CreatorAdminRow[]>();

  if (error) {
    return { creators: [], error: "creators-load-failed" };
  }

  return {
    creators: (data ?? []).map((creator) => {
      const access = mapAccess(creator.creator_runtime_access);
      const agents = creator.agents ?? [];
      const profile = readSingle(creator.profiles);

      return {
        id: creator.id,
        publicName: creator.public_name,
        email: profile?.email ?? "Email introuvable",
        displayName: profile?.display_name ?? null,
        role: profile?.role ?? "creator",
        verifiedAt: creator.verified_at,
        createdAt: creator.created_at,
        agentCount: agents.length,
        approvedAgentCount: agents.filter((agent) => agent.status === "approved").length,
        runtimeAccess: access,
      };
    }),
    error: null,
  };
}

export async function getAdminRuntimeSettings() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { settings: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("agent_runtime_settings")
    .select("runtime_type,enabled,creator_visible,run_enabled,description,updated_at")
    .order("runtime_type")
    .returns<RuntimeSettingRow[]>();

  if (error) {
    return { settings: [], error: "runtime-settings-load-failed" };
  }

  return { settings: data ?? [], error: null };
}

export async function getAdminEndpoints() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { workflowEndpoints: [], creatorApiEndpoints: [], error: "missing-config" };
  }

  const [workflowResult, apiResult] = await Promise.all([
    supabase
      .from("creator_webhook_endpoints")
      .select("id,creator_id,name,endpoint_url,status,verification_notes,approved_at,created_at,creator_profiles(public_name)")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<WorkflowEndpointRow[]>(),
    supabase
      .from("creator_api_endpoints")
      .select("id,creator_id,name,endpoint_url,status,verification_notes,approved_at,created_at,creator_profiles(public_name)")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<CreatorApiEndpointRow[]>(),
  ]);

  if (workflowResult.error || apiResult.error) {
    return { workflowEndpoints: [], creatorApiEndpoints: [], error: "endpoints-load-failed" };
  }

  const mapEndpoint = (endpoint: WorkflowEndpointRow) => ({
    id: endpoint.id,
    creatorId: endpoint.creator_id,
    creatorName: readSingle(endpoint.creator_profiles)?.public_name ?? "Créateur inconnu",
    name: endpoint.name,
    endpointUrl: endpoint.endpoint_url,
    status: endpoint.status,
    verificationNotes: endpoint.verification_notes,
    approvedAt: endpoint.approved_at,
    createdAt: endpoint.created_at,
  });

  return {
    workflowEndpoints: (workflowResult.data ?? []).map(mapEndpoint),
    creatorApiEndpoints: (apiResult.data ?? []).map(mapEndpoint),
    error: null,
  };
}

export async function getAdminSecurityReviews() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { reviews: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("security_reviews")
    .select(
      "id,asset_type,asset_id,runtime_type,agent_id,agent_version_id,workflow_id,creator_endpoint_config_id,creator_api_endpoint_id,status,findings,notes,reviewed_by,reviewed_at,created_at,updated_at,agents(name,slug,status)",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<SecurityReviewRow[]>();

  if (error) {
    return { reviews: [], error: "security-reviews-load-failed" };
  }

  return {
    reviews: (data ?? []).map((review) => ({
      id: review.id,
      assetType: review.asset_type,
      assetId: review.asset_id,
      runtimeType: review.runtime_type,
      agentId: review.agent_id,
      agentVersionId: review.agent_version_id,
      workflowId: review.workflow_id,
      creatorEndpointConfigId: review.creator_endpoint_config_id,
      creatorApiEndpointId: review.creator_api_endpoint_id,
      status: review.status,
      findings: Array.isArray(review.findings) ? review.findings : [],
      notes: review.notes,
      reviewedAt: review.reviewed_at,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      agent: readSingle(review.agents),
    })),
    error: null,
  };
}

export async function getAdminSecurityReview(reviewId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase || !reviewId) {
    return { review: null, error: !supabase ? "missing-config" : null };
  }

  const { data, error } = await supabase
    .from("security_reviews")
    .select(
      "id,asset_type,asset_id,runtime_type,agent_id,agent_version_id,workflow_id,creator_endpoint_config_id,creator_api_endpoint_id,status,findings,notes,reviewed_by,reviewed_at,created_at,updated_at,agents(name,slug,status)",
    )
    .eq("id", reviewId)
    .maybeSingle<SecurityReviewRow>();

  if (error || !data) {
    return { review: null, error: error ? "security-review-load-failed" : null };
  }

  return {
    review: {
      id: data.id,
      assetType: data.asset_type,
      assetId: data.asset_id,
      runtimeType: data.runtime_type,
      agentId: data.agent_id,
      agentVersionId: data.agent_version_id,
      workflowId: data.workflow_id,
      creatorEndpointConfigId: data.creator_endpoint_config_id,
      creatorApiEndpointId: data.creator_api_endpoint_id,
      status: data.status,
      findings: Array.isArray(data.findings) ? data.findings : [],
      notes: data.notes,
      reviewedAt: data.reviewed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      agent: readSingle(data.agents),
    },
    error: null,
  };
}

export async function getAdminPayments() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { payments: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("payments")
    .select(
      "id,user_id,agent_id,status,activation_error,amount_cents,currency,stripe_checkout_session_id,rental_request_id,created_at,agents(name,slug),profiles(email)",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<PaymentAdminRow[]>();

  if (error) {
    return { payments: [], error: "payments-load-failed" };
  }

  return {
    payments: (data ?? []).map((payment) => ({
      id: payment.id,
      userId: payment.user_id,
      userEmail: readSingle(payment.profiles)?.email ?? "email inconnu",
      agentId: payment.agent_id,
      agent: readSingle(payment.agents),
      status: payment.status,
      activationError: payment.activation_error,
      amountCents: payment.amount_cents,
      currency: payment.currency,
      stripeCheckoutSessionId: payment.stripe_checkout_session_id,
      rentalRequestId: payment.rental_request_id,
      createdAt: payment.created_at,
    })),
    error: null,
  };
}

export async function getAdminOpsSnapshot() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { checks: [], recentRuns: [], auditLogs: [], error: "missing-config" };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [pendingPayments, paidWithoutAccess, failedRuns, staleRuns, auditLogs] = await Promise.all([
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", oneDayAgo),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid").is("rental_request_id", null),
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("status", "failed").gt("created_at", oneDayAgo),
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("status", "running").lt("created_at", oneHourAgo),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,entity_id,metadata,created_at,profiles(email)")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AuditLogRow[]>(),
  ]);

  const { data: recentRuns } = await supabase
    .from("agent_runs")
    .select("id,user_id,agent_id,rental_request_id,status,provider,error_code,created_at,agents(name,slug),profiles(email)")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<AgentRunOpsRow[]>();

  return {
    checks: [
      { key: "pending-payments", label: "Payments pending > 24h", value: pendingPayments.count ?? 0, tone: (pendingPayments.count ?? 0) > 0 ? "warning" : "success" },
      { key: "paid-without-access", label: "Payments paid sans accès", value: paidWithoutAccess.count ?? 0, tone: (paidWithoutAccess.count ?? 0) > 0 ? "error" : "success" },
      { key: "failed-runs", label: "Runs failed 24h", value: failedRuns.count ?? 0, tone: (failedRuns.count ?? 0) > 0 ? "warning" : "success" },
      { key: "stale-running-runs", label: "Runs running > 1h", value: staleRuns.count ?? 0, tone: (staleRuns.count ?? 0) > 0 ? "error" : "success" },
    ],
    recentRuns: (recentRuns ?? []).map((run) => ({
      id: run.id,
      status: run.status,
      provider: run.provider,
      errorCode: run.error_code,
      createdAt: run.created_at,
      agent: readSingle(run.agents),
      userEmail: readSingle(run.profiles)?.email ?? "email inconnu",
    })),
    auditLogs: (auditLogs.data ?? []).map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      metadata: log.metadata,
      createdAt: log.created_at,
      actorEmail: readSingle(log.profiles)?.email ?? "admin inconnu",
    })),
    error: null,
  };
}

function latestByVersion<T extends { agent_version_id: string | null; created_at: string }>(rows: T[] | null | undefined) {
  const result = new Map<string, T>();

  for (const row of rows ?? []) {
    if (!row.agent_version_id) {
      continue;
    }

    if (!result.has(row.agent_version_id)) {
      result.set(row.agent_version_id, row);
    }
  }

  return result;
}

function diagnosticCheck(input: { key: string; label: string; ok: boolean; detail?: string | null }) {
  return {
    detail: input.detail ?? null,
    key: input.key,
    label: input.label,
    ok: input.ok,
  };
}

function firstBlocker(checks: Array<{ detail: string | null; label: string; ok: boolean }>) {
  const blocked = checks.find((check) => !check.ok);

  return blocked ? `${blocked.label}${blocked.detail ? `: ${blocked.detail}` : ""}` : null;
}

export async function getAdvancedAgentDiagnostics() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { diagnostics: [], error: "missing-config", summary: { blocked: 0, ready: 0, total: 0 } };
  }

  const { data: versions, error: versionError } = await supabase
    .from("agent_versions")
    .select("id,agent_id,runtime_type,execution_mode,workspace_mode,created_at,agents!inner(id,name,slug,status,creator_id,active_version_id)")
    .in("runtime_type", ["workflow_automation", "creator_endpoint"])
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AdvancedAgentVersionRow[]>();

  if (versionError) {
    return { diagnostics: [], error: "advanced-agents-load-failed", summary: { blocked: 0, ready: 0, total: 0 } };
  }

  const normalizedVersions: Array<AdvancedAgentVersionRow & { agent: AdvancedAgentRow }> = [];

  for (const version of versions ?? []) {
    const agent = readSingle(version.agents) as AdvancedAgentRow | null;

    if (agent) {
      normalizedVersions.push({ ...version, agent });
    }
  }
  const versionIds = [...new Set(normalizedVersions.map((version) => version.id))];
  const creatorIds = [...new Set(normalizedVersions.map((version) => version.agent.creator_id))];

  const [
    creatorsResult,
    runtimeSettingsResult,
    accessResult,
    workflowsResult,
    endpointConfigsResult,
    securityReviewsResult,
    runsResult,
  ] = await Promise.all([
    creatorIds.length
      ? supabase
          .from("creator_profiles")
          .select("id,public_name,profiles!creator_profiles_user_id_fkey(email)")
          .in("id", creatorIds)
          .returns<CreatorIdentityRow[]>()
      : Promise.resolve({ data: [] as CreatorIdentityRow[], error: null }),
    supabase
      .from("agent_runtime_settings")
      .select("runtime_type,enabled,creator_visible,run_enabled,description,updated_at")
      .in("runtime_type", ["workflow_automation", "creator_endpoint"])
      .returns<RuntimeSettingRow[]>(),
    creatorIds.length
      ? supabase
          .from("creator_runtime_access")
          .select("creator_id,runtime_type,enabled,notes,updated_at")
          .in("creator_id", creatorIds)
          .in("runtime_type", ["workflow_automation", "creator_endpoint"])
          .returns<(RuntimeAccessRow & { creator_id: string })[]>()
      : Promise.resolve({ data: [] as Array<RuntimeAccessRow & { creator_id: string }>, error: null }),
    versionIds.length
      ? supabase
          .from("agent_version_workflows")
          .select("id,agent_version_id,status,definition,created_at")
          .in("agent_version_id", versionIds)
          .returns<(WorkflowDiagnosticRow & { created_at: string })[]>()
      : Promise.resolve({ data: [] as Array<WorkflowDiagnosticRow & { created_at: string }>, error: null }),
    versionIds.length
      ? supabase
          .from("agent_version_creator_endpoints")
          .select("id,agent_version_id,endpoint_id,status,created_at,creator_api_endpoints!agent_version_creator_endpoints_endpoint_id_fkey(id,name,status,endpoint_url)")
          .in("agent_version_id", versionIds)
          .returns<(EndpointDiagnosticConfigRow & { created_at: string })[]>()
      : Promise.resolve({ data: [] as Array<EndpointDiagnosticConfigRow & { created_at: string }>, error: null }),
    versionIds.length
      ? supabase
          .from("security_reviews")
          .select("id,agent_version_id,runtime_type,status,created_at")
          .in("agent_version_id", versionIds)
          .order("created_at", { ascending: false })
          .returns<SecurityReviewDiagnosticRow[]>()
      : Promise.resolve({ data: [] as SecurityReviewDiagnosticRow[], error: null }),
    versionIds.length
      ? supabase
          .from("agent_runs")
          .select("id,agent_version_id,status,provider,error_code,created_at")
          .in("agent_version_id", versionIds)
          .order("created_at", { ascending: false })
          .returns<AgentRunDiagnosticRow[]>()
      : Promise.resolve({ data: [] as AgentRunDiagnosticRow[], error: null }),
  ]);

  if (
    creatorsResult.error ||
    runtimeSettingsResult.error ||
    accessResult.error ||
    workflowsResult.error ||
    endpointConfigsResult.error ||
    securityReviewsResult.error ||
    runsResult.error
  ) {
    return { diagnostics: [], error: "advanced-agents-related-data-failed", summary: { blocked: 0, ready: 0, total: 0 } };
  }

  const creatorsById = new Map((creatorsResult.data ?? []).map((creator) => [creator.id, creator]));
  const settingsByRuntime = new Map((runtimeSettingsResult.data ?? []).map((setting) => [setting.runtime_type, setting]));
  const accessByCreatorRuntime = new Map(
    (accessResult.data ?? []).map((access) => [`${access.creator_id}:${access.runtime_type}`, access]),
  );
  const workflowByVersion = latestByVersion(workflowsResult.data);
  const endpointConfigByVersion = latestByVersion(endpointConfigsResult.data);
  const reviewByVersion = latestByVersion(securityReviewsResult.data);
  const runByVersion = latestByVersion(runsResult.data);

  const diagnostics = normalizedVersions.map((version) => {
    const setting = settingsByRuntime.get(version.runtime_type);
    const creator = creatorsById.get(version.agent.creator_id);
    const creatorProfile = readSingle(creator?.profiles ?? null);
    const access = accessByCreatorRuntime.get(`${version.agent.creator_id}:${version.runtime_type}`);
    const workflow = workflowByVersion.get(version.id);
    const workflowDefinition = normalizeWorkflowDefinition(workflow?.definition);
    const endpointConfig = endpointConfigByVersion.get(version.id);
    const endpoint = readSingle(endpointConfig?.creator_api_endpoints ?? null);
    const securityReview = reviewByVersion.get(version.id);
    const latestRun = runByVersion.get(version.id);
    const assetLabel = version.runtime_type === "workflow_automation" ? "Workflow asset" : "Endpoint asset";
    const assetApproved =
      version.runtime_type === "workflow_automation"
        ? Boolean(workflow && workflow.status === "approved" && workflowDefinition)
        : Boolean(endpointConfig && endpointConfig.status === "approved" && endpoint?.status === "approved");

    const checks = [
      diagnosticCheck({
        key: "active-version",
        label: "Version active",
        ok: version.agent.active_version_id === version.id,
        detail: version.agent.active_version_id === version.id ? null : "cette version n’est pas la version active de l’agent",
      }),
      diagnosticCheck({
        key: "runtime-setting",
        label: "Runtime enabled/run_enabled",
        ok: Boolean(setting?.enabled && setting.run_enabled),
        detail: setting ? `enabled=${setting.enabled}, run_enabled=${setting.run_enabled}` : "runtime setting introuvable",
      }),
      diagnosticCheck({
        key: "creator-allowlist",
        label: "Creator allowlist",
        ok: Boolean(access?.enabled),
        detail: access ? `enabled=${access.enabled}` : "creator non allowlisté pour ce runtime",
      }),
      diagnosticCheck({
        key: "asset-approved",
        label: assetLabel,
        ok: assetApproved,
        detail:
          version.runtime_type === "workflow_automation"
            ? workflow
              ? `status=${workflow.status}, steps=${workflowDefinition?.steps.length ?? 0}`
              : "workflow manquant"
            : endpointConfig
              ? `config=${endpointConfig.status}, endpoint=${endpoint?.status ?? "missing"}`
              : "endpoint config manquante",
      }),
      diagnosticCheck({
        key: "security-review",
        label: "Security review",
        ok: Boolean(securityReview && ["passed", "waived"].includes(securityReview.status)),
        detail: securityReview ? `status=${securityReview.status}` : "security review manquante",
      }),
      diagnosticCheck({
        key: "agent-published",
        label: "Publication marketplace",
        ok: version.agent.status === "approved",
        detail: `agent=${version.agent.status}`,
      }),
      diagnosticCheck({
        key: "latest-run",
        label: "Dernier run",
        ok: !latestRun || latestRun.status === "succeeded",
        detail: latestRun ? `${latestRun.status}${latestRun.error_code ? ` / ${latestRun.error_code}` : ""}` : "aucun run encore enregistré",
      }),
    ];
    const blocker = firstBlocker(checks);

    return {
      agent: {
        id: version.agent.id,
        name: version.agent.name,
        slug: version.agent.slug,
        status: version.agent.status,
      },
      asset: {
        endpointName: endpoint?.name ?? null,
        endpointStatus: endpoint?.status ?? null,
        endpointUrl: endpoint?.endpoint_url ?? null,
        workflowStatus: workflow?.status ?? null,
        workflowSteps: workflowDefinition?.steps.map((step) => ({ label: step.label, type: step.type })) ?? [],
      },
      checks,
      creator: {
        email: creatorProfile?.email ?? "Email introuvable",
        id: version.agent.creator_id,
        publicName: creator?.public_name ?? "Créateur inconnu",
      },
      firstBlocker: blocker,
      latestRun: latestRun
        ? {
            createdAt: latestRun.created_at,
            errorCode: latestRun.error_code,
            id: latestRun.id,
            provider: latestRun.provider,
            status: latestRun.status,
          }
        : null,
      ready: !blocker,
      runtimeType: version.runtime_type,
      securityReview: securityReview
        ? {
            id: securityReview.id,
            status: securityReview.status,
          }
        : null,
      versionId: version.id,
    };
  });

  return {
    diagnostics,
    error: null,
    summary: {
      blocked: diagnostics.filter((item) => !item.ready).length,
      ready: diagnostics.filter((item) => item.ready).length,
      total: diagnostics.length,
    },
  };
}

export async function getAdminDashboardSnapshot() {
  const [creators, runtimes, endpoints, security, payments, ops] = await Promise.all([
    getAdminCreators(),
    getAdminRuntimeSettings(),
    getAdminEndpoints(),
    getAdminSecurityReviews(),
    getAdminPayments(),
    getAdminOpsSnapshot(),
  ]);

  return {
    creators,
    runtimes,
    endpoints,
    security,
    payments,
    ops,
  };
}

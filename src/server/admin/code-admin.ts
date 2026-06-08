import "server-only";

import type { AgentRuntimeType } from "@/lib/agent-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { creators: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("creator_profiles")
    .select(
      "id,public_name,verified_at,created_at,creator_runtime_access(runtime_type,enabled,notes,updated_at),agents(id,status)",
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

      return {
        id: creator.id,
        publicName: creator.public_name,
        email: "masqué en beta",
        displayName: null,
        role: "creator",
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
  const supabase = await createSupabaseServerClient();

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
  const supabase = await createSupabaseServerClient();

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

import "server-only";

import type { AgentRuntimeType } from "@/lib/agent-contract";
import { serverEnv } from "@/lib/env.server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildWorkspaceCompatibilityDiagnostic } from "@/server/agents/workspace-compatibility";
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
  creator_profiles:
    | { profiles: { email: string | null } | { email: string | null }[] | null; public_name: string }
    | { profiles: { email: string | null } | { email: string | null }[] | null; public_name: string }[]
    | null;
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

type EndpointHealthAuditRow = {
  created_at: string;
  entity_id: string | null;
  metadata: { code?: unknown; ok?: unknown } | null;
};

type ReviewableAgentPrecheckRow = {
  active_version_id: string | null;
  id: string;
  name: string;
  status: string;
};

type SecurityPrecheckOpsRow = {
  agent_version_id: string;
  created_at: string;
  status: string;
};

type PaymentLedgerCheckRow = {
  id: string;
};

type PaymentAccessLedgerCheckRow = {
  id: string;
  rental_request_id: string | null;
};

type RentalRequestLedgerCheckRow = {
  id: string;
};

type LedgerPaymentEventRow = {
  payment_id: string | null;
};

const OPS_LEDGER_PAGE_SIZE = 1000;

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function countMissingLedgerEvents(input: {
  eventType: "access_created" | "access_stopped" | "activation_blocked" | "payment_paid";
  paymentIds: string[];
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
}) {
  if (input.paymentIds.length === 0) {
    return 0;
  }

  const recordedPaymentIds = new Set<string>();

  for (let index = 0; index < input.paymentIds.length; index += OPS_LEDGER_PAGE_SIZE) {
    const paymentIds = input.paymentIds.slice(index, index + OPS_LEDGER_PAGE_SIZE);
    const { data } = await input.supabase
      .from("creator_revenue_ledger")
      .select("payment_id")
      .eq("event_type", input.eventType)
      .in("payment_id", paymentIds)
      .returns<LedgerPaymentEventRow[]>();

    for (const row of data ?? []) {
      if (row.payment_id) {
        recordedPaymentIds.add(row.payment_id);
      }
    }
  }

  return input.paymentIds.filter((paymentId) => !recordedPaymentIds.has(paymentId)).length;
}

async function loadLedgerGapCounts(supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>) {
  const paidPaymentIds: string[] = [];
  const blockedPaymentIds: string[] = [];
  const paidAccessPaymentIds: string[] = [];
  const stoppedRentalIds: string[] = [];
  const stoppedAccessPaymentIds: string[] = [];

  for (let from = 0; ; from += OPS_LEDGER_PAGE_SIZE) {
    const { data } = await supabase
      .from("payments")
      .select("id,status")
      .in("status", ["paid", "paid_blocked"])
      .range(from, from + OPS_LEDGER_PAGE_SIZE - 1)
      .returns<Array<PaymentLedgerCheckRow & { status: "paid" | "paid_blocked" }>>();
    const rows = data ?? [];

    paidPaymentIds.push(...rows.filter((row) => row.status === "paid").map((row) => row.id));
    blockedPaymentIds.push(...rows.filter((row) => row.status === "paid_blocked").map((row) => row.id));

    if (rows.length < OPS_LEDGER_PAGE_SIZE) {
      break;
    }
  }

  for (let from = 0; ; from += OPS_LEDGER_PAGE_SIZE) {
    const { data } = await supabase
      .from("payments")
      .select("id,rental_request_id")
      .eq("status", "paid")
      .not("rental_request_id", "is", null)
      .range(from, from + OPS_LEDGER_PAGE_SIZE - 1)
      .returns<PaymentAccessLedgerCheckRow[]>();
    const rows = data ?? [];

    paidAccessPaymentIds.push(...rows.map((row) => row.id));

    if (rows.length < OPS_LEDGER_PAGE_SIZE) {
      break;
    }
  }

  for (let from = 0; ; from += OPS_LEDGER_PAGE_SIZE) {
    const { data } = await supabase
      .from("rental_requests")
      .select("id")
      .eq("status", "stopped")
      .range(from, from + OPS_LEDGER_PAGE_SIZE - 1)
      .returns<RentalRequestLedgerCheckRow[]>();
    const rows = data ?? [];

    stoppedRentalIds.push(...rows.map((row) => row.id));

    if (rows.length < OPS_LEDGER_PAGE_SIZE) {
      break;
    }
  }

  for (let index = 0; index < stoppedRentalIds.length; index += OPS_LEDGER_PAGE_SIZE) {
    const rentalIds = stoppedRentalIds.slice(index, index + OPS_LEDGER_PAGE_SIZE);
    const { data } = await supabase
      .from("payments")
      .select("id,rental_request_id")
      .eq("status", "paid")
      .in("rental_request_id", rentalIds)
      .returns<PaymentAccessLedgerCheckRow[]>();

    stoppedAccessPaymentIds.push(...(data ?? []).map((row) => row.id));
  }

  const [missingPaymentPaid, missingActivationBlocked, missingAccessCreated, missingAccessStopped] = await Promise.all([
    countMissingLedgerEvents({
      eventType: "payment_paid",
      paymentIds: paidPaymentIds,
      supabase,
    }),
    countMissingLedgerEvents({
      eventType: "activation_blocked",
      paymentIds: blockedPaymentIds,
      supabase,
    }),
    countMissingLedgerEvents({
      eventType: "access_created",
      paymentIds: paidAccessPaymentIds,
      supabase,
    }),
    countMissingLedgerEvents({
      eventType: "access_stopped",
      paymentIds: stoppedAccessPaymentIds,
      supabase,
    }),
  ]);

  return {
    missingAccessCreated,
    missingAccessStopped,
    missingActivationBlocked,
    missingPaymentPaid,
  };
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
      .select("id,creator_id,name,endpoint_url,status,verification_notes,approved_at,created_at,creator_profiles(public_name,profiles!creator_profiles_user_id_fkey(email))")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<WorkflowEndpointRow[]>(),
    supabase
      .from("creator_api_endpoints")
      .select("id,creator_id,name,endpoint_url,status,verification_notes,approved_at,created_at,creator_profiles(public_name,profiles!creator_profiles_user_id_fkey(email))")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<CreatorApiEndpointRow[]>(),
  ]);

  if (workflowResult.error || apiResult.error) {
    return { workflowEndpoints: [], creatorApiEndpoints: [], error: "endpoints-load-failed" };
  }

  const workflowEndpointIds = (workflowResult.data ?? []).map((endpoint) => endpoint.id);
  const apiEndpointIds = (apiResult.data ?? []).map((endpoint) => endpoint.id);
  const [workflowHealthResult, apiHealthResult] = await Promise.all([
    workflowEndpointIds.length
      ? supabase
          .from("audit_logs")
          .select("entity_id,metadata,created_at")
          .eq("entity_type", "creator_webhook_endpoints")
          .eq("action", "endpoint.workflow_webhook.health_check")
          .in("entity_id", workflowEndpointIds)
          .order("created_at", { ascending: false })
          .returns<EndpointHealthAuditRow[]>()
      : Promise.resolve({ data: [] as EndpointHealthAuditRow[], error: null }),
    apiEndpointIds.length
      ? supabase
          .from("audit_logs")
          .select("entity_id,metadata,created_at")
          .eq("entity_type", "creator_api_endpoints")
          .eq("action", "endpoint.creator_api.health_check")
          .in("entity_id", apiEndpointIds)
          .order("created_at", { ascending: false })
          .returns<EndpointHealthAuditRow[]>()
      : Promise.resolve({ data: [] as EndpointHealthAuditRow[], error: null }),
  ]);
  const workflowHealthById = latestHealthByEndpoint(workflowHealthResult.error ? [] : workflowHealthResult.data);
  const apiHealthById = latestHealthByEndpoint(apiHealthResult.error ? [] : apiHealthResult.data);

  const mapEndpoint = (endpoint: WorkflowEndpointRow, healthById: Map<string, EndpointHealthAuditRow>) => {
    const creatorProfile = readSingle(endpoint.creator_profiles);
    const linkedProfile = readSingle(creatorProfile?.profiles ?? null);

    return {
      id: endpoint.id,
      creatorId: endpoint.creator_id,
      creatorEmail: linkedProfile?.email ?? null,
      creatorName: creatorProfile?.public_name ?? "Créateur inconnu",
      name: endpoint.name,
      endpointUrl: endpoint.endpoint_url,
      status: endpoint.status,
      verificationNotes: endpoint.verification_notes,
      approvedAt: endpoint.approved_at,
      createdAt: endpoint.created_at,
      healthCheck: endpointHealthDiagnostic(healthById.get(endpoint.id)),
    };
  };

  return {
    workflowEndpoints: (workflowResult.data ?? []).map((endpoint) => mapEndpoint(endpoint, workflowHealthById)),
    creatorApiEndpoints: (apiResult.data ?? []).map((endpoint) => mapEndpoint(endpoint, apiHealthById)),
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
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const [
    pendingPayments,
    paidWithoutAccess,
    failedRuns,
    staleRuns,
    ledgerEarned,
    ledgerBlocked,
    ledgerPayoutReady,
    ledgerGaps,
    reviewableAgentsResult,
    attentionPrechecks,
    stuckPrechecks,
    blockingPrechecks,
    auditLogs,
  ] = await Promise.all([
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", oneDayAgo),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid").is("rental_request_id", null),
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("status", "failed").gt("created_at", oneDayAgo),
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("status", "running").lt("created_at", oneHourAgo),
    supabase.from("creator_revenue_ledger").select("id", { count: "exact", head: true }).eq("status", "earned"),
    supabase.from("creator_revenue_ledger").select("id", { count: "exact", head: true }).eq("status", "blocked"),
    supabase.from("creator_revenue_ledger").select("id", { count: "exact", head: true }).eq("status", "payout_ready"),
    loadLedgerGapCounts(supabase),
    supabase
      .from("agents")
      .select("id,name,status,active_version_id")
      .in("status", ["submitted", "in_review"])
      .returns<ReviewableAgentPrecheckRow[]>(),
    supabase
      .from("agent_security_prechecks")
      .select("id", { count: "exact", head: true })
      .in("status", ["stale", "error"]),
    supabase
      .from("agent_security_prechecks")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "running"])
      .lt("created_at", tenMinutesAgo),
    supabase
      .from("agent_security_prechecks")
      .select("id", { count: "exact", head: true })
      .in("status", ["warning", "failed"])
      .in("recommended_action", ["block_publication", "reject_candidate", "request_changes", "require_security_review", "manual_review"]),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,entity_id,metadata,created_at,profiles(email)")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AuditLogRow[]>(),
  ]);

  const reviewableVersionIds = [
    ...new Set((reviewableAgentsResult.data ?? []).map((agent) => agent.active_version_id).filter((id): id is string => Boolean(id))),
  ];
  let missingFinalPrecheckCount = 0;

  if (reviewableVersionIds.length > 0) {
    const { data: prechecks } = await supabase
      .from("agent_security_prechecks")
      .select("agent_version_id,status,created_at")
      .in("agent_version_id", reviewableVersionIds)
      .order("created_at", { ascending: false })
      .returns<SecurityPrecheckOpsRow[]>();
    const latestByAgentVersion = latestByVersion(prechecks ?? []);

    missingFinalPrecheckCount = (reviewableAgentsResult.data ?? []).filter((agent) => {
      if (!agent.active_version_id) {
        return true;
      }

      const latestPrecheck = latestByAgentVersion.get(agent.active_version_id);

      return !latestPrecheck || !["passed", "warning", "failed"].includes(latestPrecheck.status);
    }).length;
  }

  const securityPrecheckAttentionCount = (attentionPrechecks.count ?? 0) + (stuckPrechecks.count ?? 0);

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
      { key: "ledger-earned", label: "Ledger earned", value: ledgerEarned.count ?? 0, tone: "success" },
      { key: "ledger-blocked", label: "Ledger bloqué", value: ledgerBlocked.count ?? 0, tone: (ledgerBlocked.count ?? 0) > 0 ? "warning" : "success" },
      { key: "ledger-payout-ready", label: "Ledger payout-ready", value: ledgerPayoutReady.count ?? 0, tone: "neutral" },
      { key: "ledger-missing-payment-paid", label: "Ledger paiement manquant", value: ledgerGaps.missingPaymentPaid, tone: ledgerGaps.missingPaymentPaid > 0 ? "error" : "success" },
      { key: "ledger-missing-activation-blocked", label: "Ledger blocage manquant", value: ledgerGaps.missingActivationBlocked, tone: ledgerGaps.missingActivationBlocked > 0 ? "warning" : "success" },
      { key: "ledger-missing-access-created", label: "Ledger accès manquant", value: ledgerGaps.missingAccessCreated, tone: ledgerGaps.missingAccessCreated > 0 ? "error" : "success" },
      { key: "ledger-missing-access-stopped", label: "Ledger arrêt accès manquant", value: ledgerGaps.missingAccessStopped, tone: ledgerGaps.missingAccessStopped > 0 ? "warning" : "success" },
      { key: "security-precheck-missing", label: "Préchecks manquants", value: missingFinalPrecheckCount, tone: missingFinalPrecheckCount > 0 ? "error" : "success" },
      { key: "security-precheck-attention", label: "Préchecks à reprendre", value: securityPrecheckAttentionCount, tone: securityPrecheckAttentionCount > 0 ? "warning" : "success" },
      { key: "security-precheck-blocking", label: "Préchecks bloquants", value: blockingPrechecks.count ?? 0, tone: (blockingPrechecks.count ?? 0) > 0 ? "warning" : "success" },
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

function checkIsOk(checks: Array<{ key: string; ok: boolean }>, key: string) {
  return checks.find((check) => check.key === key)?.ok ?? false;
}

function latestHealthByEndpoint(rows: EndpointHealthAuditRow[] | null | undefined) {
  const result = new Map<string, EndpointHealthAuditRow>();

  for (const row of rows ?? []) {
    if (!row.entity_id || result.has(row.entity_id)) {
      continue;
    }

    result.set(row.entity_id, row);
  }

  return result;
}

function endpointHealthDiagnostic(row: EndpointHealthAuditRow | null | undefined) {
  if (!row) {
    return {
      code: "not_checked",
      detail: "Aucun test endpoint enregistré",
      ok: false,
      status: "not_checked",
      testedAt: null,
    };
  }

  const ok = row.metadata?.ok === true;
  const code = typeof row.metadata?.code === "string" ? row.metadata.code : ok ? "ok" : "unknown_error";

  return {
    code,
    detail: `${code} · ${row.created_at}`,
    ok,
    status: ok ? "ok" : "failed",
    testedAt: row.created_at,
  };
}

function workflowWebhookHealthDiagnostic(input: {
  endpointIds: string[];
  healthByEndpoint: Map<string, EndpointHealthAuditRow>;
}) {
  const endpointIds = [...new Set(input.endpointIds.filter(Boolean))];

  if (endpointIds.length === 0) {
    return null;
  }

  const diagnostics = endpointIds.map((endpointId) => endpointHealthDiagnostic(input.healthByEndpoint.get(endpointId)));
  const failed = diagnostics.filter((diagnostic) => !diagnostic.ok);

  return {
    code: failed.length > 0 ? failed[0]?.code ?? "failed" : "ok",
    detail:
      failed.length > 0
        ? `${failed.length}/${endpointIds.length} webhook health check à reprendre`
        : `${endpointIds.length}/${endpointIds.length} webhook health check OK`,
    ok: failed.length === 0,
    status: failed.length === 0 ? "ok" : "failed",
    testedAt: diagnostics.find((diagnostic) => diagnostic.testedAt)?.testedAt ?? null,
  };
}

function calculateReadinessScore(input: {
  checks: Array<{ key: string; label: string; ok: boolean }>;
  endpointHealth?: { ok: boolean; status: string } | null;
  workflowWebhookHealth?: { ok: boolean; status: string } | null;
  runtimeType: string;
}) {
  let score = 100;
  const blockers: string[] = [];

  const subtract = (condition: boolean, points: number, label: string) => {
    if (!condition) {
      score -= points;
      blockers.push(label);
    }
  };

  subtract(checkIsOk(input.checks, "runtime-setting"), 25, "runtime disabled");
  subtract(checkIsOk(input.checks, "runner-env"), 15, "runner env missing");
  subtract(checkIsOk(input.checks, "creator-allowlist"), 20, "creator not allowlisted");
  subtract(checkIsOk(input.checks, "asset-approved"), 20, "asset not approved");
  subtract(checkIsOk(input.checks, "security-review"), 15, "security review missing");
  subtract(checkIsOk(input.checks, "agent-published"), 10, "agent not approved");

  if (input.runtimeType === "creator_endpoint") {
    subtract(Boolean(input.endpointHealth?.ok), 10, "endpoint health missing or failed");
  }

  if (input.runtimeType === "workflow_automation" && input.workflowWebhookHealth) {
    subtract(Boolean(input.workflowWebhookHealth.ok), 10, "workflow webhook health missing or failed");
  }

  subtract(checkIsOk(input.checks, "latest-run"), 10, "latest run failed");

  const normalizedScore = Math.max(0, score);

  return {
    blockers,
    label: normalizedScore >= 90 ? "Runnable beta" : normalizedScore >= 70 ? "À surveiller" : "Bloquer",
    score: normalizedScore,
    tone: normalizedScore >= 90 ? "success" : normalizedScore >= 70 ? "warning" : "error",
  };
}

function runtimeEnvDiagnostic(runtimeType: string) {
  if (runtimeType === "workflow_automation") {
    return {
      detail: `WORKFLOW_RUNS_ENABLED=${serverEnv.workflowRunsEnabled}, WORKFLOW_WORKER_SECRET=${serverEnv.workflowWorkerSecret ? "configured" : "missing"}`,
      ok: serverEnv.workflowRunsEnabled && Boolean(serverEnv.workflowWorkerSecret),
    };
  }

  if (runtimeType === "creator_endpoint") {
    return {
      detail: `CREATOR_ENDPOINT_RUNS_ENABLED=${serverEnv.creatorEndpointRunsEnabled}, CREATOR_ENDPOINT_SIGNING_SECRET=${serverEnv.creatorEndpointSigningSecret ? "configured" : "missing"}`,
      ok: serverEnv.creatorEndpointRunsEnabled && Boolean(serverEnv.creatorEndpointSigningSecret),
    };
  }

  return {
    detail: null,
    ok: true,
  };
}

export async function getAdvancedAgentDiagnostics() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { diagnostics: [], error: "missing-config", summary: { averageReadiness: 0, blocked: 0, fallbackRequired: 0, ready: 0, total: 0 } };
  }

  const { data: versions, error: versionError } = await supabase
    .from("agent_versions")
    .select(
      "id,agent_id,runtime_type,execution_mode,workspace_mode,created_at,agents!agent_versions_agent_id_fkey!inner(id,name,slug,status,creator_id,active_version_id)",
    )
    .in("runtime_type", ["workflow_automation", "creator_endpoint"])
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AdvancedAgentVersionRow[]>();

  if (versionError) {
    return { diagnostics: [], error: "advanced-agents-load-failed", summary: { averageReadiness: 0, blocked: 0, fallbackRequired: 0, ready: 0, total: 0 } };
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
    return { diagnostics: [], error: "advanced-agents-related-data-failed", summary: { averageReadiness: 0, blocked: 0, fallbackRequired: 0, ready: 0, total: 0 } };
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
  const workflowWebhookEndpointIds = [
    ...new Set(
      (workflowsResult.data ?? [])
        .flatMap((workflow) => normalizeWorkflowDefinition(workflow.definition)?.steps ?? [])
        .filter((step) => step.type === "webhook_step" && Boolean(step.endpointId))
        .map((step) => step.endpointId)
        .filter((endpointId): endpointId is string => Boolean(endpointId)),
    ),
  ];
  const endpointIds = [
    ...new Set(
      (endpointConfigsResult.data ?? [])
        .map((config) => config.endpoint_id)
        .filter((endpointId): endpointId is string => Boolean(endpointId)),
    ),
  ];
  const endpointHealthResult = endpointIds.length
    ? await supabase
        .from("audit_logs")
        .select("entity_id,metadata,created_at")
        .eq("entity_type", "creator_api_endpoints")
        .in("entity_id", endpointIds)
        .eq("action", "endpoint.creator_api.health_check")
        .order("created_at", { ascending: false })
        .returns<EndpointHealthAuditRow[]>()
    : { data: [] as EndpointHealthAuditRow[], error: null };
  const workflowWebhookHealthResult = workflowWebhookEndpointIds.length
    ? await supabase
        .from("audit_logs")
        .select("entity_id,metadata,created_at")
        .eq("entity_type", "creator_webhook_endpoints")
        .in("entity_id", workflowWebhookEndpointIds)
        .eq("action", "endpoint.workflow_webhook.health_check")
        .order("created_at", { ascending: false })
        .returns<EndpointHealthAuditRow[]>()
    : { data: [] as EndpointHealthAuditRow[], error: null };

  const endpointHealthById = latestHealthByEndpoint(endpointHealthResult.error ? [] : endpointHealthResult.data);
  const workflowWebhookHealthById = latestHealthByEndpoint(workflowWebhookHealthResult.error ? [] : workflowWebhookHealthResult.data);

  const diagnostics = normalizedVersions.map((version) => {
    const setting = settingsByRuntime.get(version.runtime_type);
    const creator = creatorsById.get(version.agent.creator_id);
    const creatorProfile = readSingle(creator?.profiles ?? null);
    const access = accessByCreatorRuntime.get(`${version.agent.creator_id}:${version.runtime_type}`);
    const workflow = workflowByVersion.get(version.id);
    const workflowDefinition = normalizeWorkflowDefinition(workflow?.definition);
    const workflowWebhookEndpointIdsForVersion =
      workflowDefinition?.steps
        .filter((step) => step.type === "webhook_step" && Boolean(step.endpointId))
        .map((step) => step.endpointId)
        .filter((endpointId): endpointId is string => Boolean(endpointId)) ?? [];
    const workflowWebhookHealth =
      version.runtime_type === "workflow_automation"
        ? workflowWebhookHealthDiagnostic({
            endpointIds: workflowWebhookEndpointIdsForVersion,
            healthByEndpoint: workflowWebhookHealthById,
          })
        : null;
    const endpointConfig = endpointConfigByVersion.get(version.id);
    const endpoint = readSingle(endpointConfig?.creator_api_endpoints ?? null);
    const securityReview = reviewByVersion.get(version.id);
    const latestRun = runByVersion.get(version.id);
    const endpointHealth =
      version.runtime_type === "creator_endpoint"
        ? endpointHealthDiagnostic(endpointConfig?.endpoint_id ? endpointHealthById.get(endpointConfig.endpoint_id) : null)
        : null;
    const securityReviewWaived = securityReview?.status === "waived";
    const assetLabel = version.runtime_type === "workflow_automation" ? "Workflow asset" : "Endpoint asset";
    const assetApproved =
      version.runtime_type === "workflow_automation"
        ? Boolean(workflow && workflow.status === "approved" && workflowDefinition)
        : Boolean(endpointConfig && endpointConfig.status === "approved" && endpoint?.status === "approved");
    const envDiagnostic = runtimeEnvDiagnostic(version.runtime_type);
    const workflowWebhookStepCount =
      version.runtime_type === "workflow_automation"
        ? workflowDefinition?.steps.filter((step) => step.type === "webhook_step").length ?? 0
        : 0;

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
        key: "runner-env",
        label: "Env runner serveur",
        ok: envDiagnostic.ok,
        detail: envDiagnostic.detail,
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
      ...(version.runtime_type === "creator_endpoint"
        ? [
            diagnosticCheck({
              key: "endpoint-health",
              label: "Endpoint health check",
              ok: Boolean(endpointHealth?.ok || securityReviewWaived),
              detail: endpointHealth?.ok
                ? endpointHealth.detail
                : securityReviewWaived
                  ? "health check waived by security review"
                  : endpointHealth?.detail ?? "Aucun test endpoint enregistré",
            }),
          ]
        : []),
      ...(version.runtime_type === "workflow_automation" && workflowWebhookHealth
        ? [
            diagnosticCheck({
              key: "workflow-webhook-health",
              label: "Webhook health checks",
              ok: Boolean(workflowWebhookHealth.ok || securityReviewWaived),
              detail: workflowWebhookHealth.ok
                ? workflowWebhookHealth.detail
                : securityReviewWaived
                  ? "webhook health waived by security review"
                  : workflowWebhookHealth.detail,
            }),
          ]
        : []),
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
    const readiness = calculateReadinessScore({
      checks,
      endpointHealth: securityReviewWaived ? { ok: true, status: "waived" } : endpointHealth,
      workflowWebhookHealth: securityReviewWaived ? { ok: true, status: "waived" } : workflowWebhookHealth,
      runtimeType: version.runtime_type,
    });
    const workspaceCompatibility = buildWorkspaceCompatibilityDiagnostic({
      agentStatus: version.agent.status,
      assetApproved,
      endpointHealth,
      runtimeSetting: setting,
      runtimeType: version.runtime_type,
      securityReviewStatus: securityReview?.status ?? null,
      securityReviewWaived,
      workflowWebhookHealth,
      workflowWebhookStepCount,
    });

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
      infra: {
        fallbackMode:
          version.runtime_type === "creator_endpoint"
            ? "creator_hosted"
            : workflowWebhookHealth
              ? "hybrid_webhook"
              : version.runtime_type === "workflow_automation"
                ? "agenthub_orchestrated"
                : "agenthub_native",
        health: endpointHealth ?? workflowWebhookHealth,
      },
      latestRun: latestRun
        ? {
            createdAt: latestRun.created_at,
            errorCode: latestRun.error_code,
            id: latestRun.id,
            provider: latestRun.provider,
            status: latestRun.status,
          }
        : null,
      readiness,
      ready: !blocker,
      runtimeType: version.runtime_type,
      securityReview: securityReview
        ? {
            id: securityReview.id,
            status: securityReview.status,
          }
        : null,
      versionId: version.id,
      workspaceCompatibility,
    };
  });

  return {
    diagnostics,
    error: null,
    summary: {
      averageReadiness: diagnostics.length
        ? Math.round(diagnostics.reduce((sum, item) => sum + item.readiness.score, 0) / diagnostics.length)
        : 0,
      blocked: diagnostics.filter((item) => !item.ready).length,
      fallbackRequired: diagnostics.filter((item) => item.workspaceCompatibility.decision.fallbackRequired).length,
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

import "server-only";

import type { AgentRuntimeType } from "@/lib/agent-contract";
import { AGENT_RUNTIME_TYPE_LABELS } from "@/lib/agent-contract";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

export type RevenuePeriod = "30d" | "all";

export type RevenueAnalyticsBucket = {
  key: string;
  label: string;
  amountCents: number;
  purchaseCount: number;
};

export type RevenueAnalyticsTopAgent = RevenueAnalyticsBucket & {
  slug: string;
};

export type RevenueAnalytics = {
  period: RevenuePeriod;
  currency: string;
  activatedGmvCents: number;
  pendingCents: number;
  attentionCents: number;
  paidWithoutAccessCount: number;
  paidBlockedCount: number;
  pendingCount: number;
  purchaseCount: number;
  activeAgentCount: number;
  averageOrderCents: number;
  sectors: RevenueAnalyticsBucket[];
  runtimes: RevenueAnalyticsBucket[];
  topAgents: RevenueAnalyticsTopAgent[];
  sandboxNotice: string;
};

export type RevenueAnalyticsResult = {
  analytics: RevenueAnalytics | null;
  error: string | null;
};

type PaymentRevenueRow = {
  amount_cents: number;
  currency: string | null;
  rental_request_id: string | null;
  status: string;
  agents:
    | {
        id: string;
        name: string;
        slug: string | null;
        agent_categories: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
      }
    | {
        id: string;
        name: string;
        slug: string | null;
        agent_categories: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
      }[]
    | null;
  agent_versions:
    | {
        runtime_type: string | null;
      }
    | {
        runtime_type: string | null;
      }[]
    | null;
};

const SANDBOX_NOTICE = "Montants sandbox, aucun payout réel en beta.";
const REVENUE_PAGE_SIZE = 1000;

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getPeriodStart(period: RevenuePeriod) {
  if (period === "all") {
    return null;
  }

  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

export function normalizeRevenuePeriod(value?: string | null): RevenuePeriod {
  return value === "all" ? "all" : "30d";
}

function addBucket(map: Map<string, RevenueAnalyticsBucket>, key: string, label: string, amountCents: number) {
  const current = map.get(key) ?? {
    key,
    label,
    amountCents: 0,
    purchaseCount: 0,
  };

  current.amountCents += amountCents;
  current.purchaseCount += 1;
  map.set(key, current);
}

function runtimeLabel(runtimeType: string | null) {
  if (runtimeType && runtimeType in AGENT_RUNTIME_TYPE_LABELS) {
    return AGENT_RUNTIME_TYPE_LABELS[runtimeType as AgentRuntimeType];
  }

  return "Runtime non défini";
}

function aggregateRevenue(rows: PaymentRevenueRow[], period: RevenuePeriod): RevenueAnalytics {
  let activatedGmvCents = 0;
  let pendingCents = 0;
  let attentionCents = 0;
  let paidWithoutAccessCount = 0;
  let paidBlockedCount = 0;
  let pendingCount = 0;
  let purchaseCount = 0;
  const activeAgentIds = new Set<string>();
  const sectorBuckets = new Map<string, RevenueAnalyticsBucket>();
  const runtimeBuckets = new Map<string, RevenueAnalyticsBucket>();
  const agentBuckets = new Map<string, RevenueAnalyticsTopAgent>();
  const currency = rows.find((row) => row.currency)?.currency ?? "eur";

  for (const row of rows) {
    const amount = row.amount_cents ?? 0;
    const paidWithAccess = row.status === "paid" && Boolean(row.rental_request_id);
    const paidWithoutAccess = row.status === "paid" && !row.rental_request_id;
    const paidBlocked = row.status === "paid_blocked";
    const pending = row.status === "pending";

    if (pending) {
      pendingCents += amount;
      pendingCount += 1;
    }

    if (paidBlocked || paidWithoutAccess) {
      attentionCents += amount;
      paidBlockedCount += paidBlocked ? 1 : 0;
      paidWithoutAccessCount += paidWithoutAccess ? 1 : 0;
    }

    if (!paidWithAccess) {
      continue;
    }

    const agent = readSingle(row.agents);
    const category = readSingle(agent?.agent_categories ?? null);
    const version = readSingle(row.agent_versions);
    const sectorKey = category?.slug || "uncategorized";
    const sectorLabel = category?.name || "Non catégorisé";
    const runtimeKey = version?.runtime_type || "unknown";
    const agentKey = agent?.id || "unknown-agent";
    const agentLabel = agent?.name || "Agent inconnu";
    const agentSlug = agent?.slug || "";

    activatedGmvCents += amount;
    purchaseCount += 1;
    if (agent?.id) {
      activeAgentIds.add(agent.id);
    }

    addBucket(sectorBuckets, sectorKey, sectorLabel, amount);
    addBucket(runtimeBuckets, runtimeKey, runtimeLabel(version?.runtime_type ?? null), amount);

    const currentAgent = agentBuckets.get(agentKey) ?? {
      key: agentKey,
      label: agentLabel,
      slug: agentSlug,
      amountCents: 0,
      purchaseCount: 0,
    };
    currentAgent.amountCents += amount;
    currentAgent.purchaseCount += 1;
    agentBuckets.set(agentKey, currentAgent);
  }

  const sortByAmount = <T extends RevenueAnalyticsBucket>(items: T[]) =>
    items.sort((a, b) => b.amountCents - a.amountCents || b.purchaseCount - a.purchaseCount);

  return {
    period,
    currency,
    activatedGmvCents,
    pendingCents,
    attentionCents,
    paidWithoutAccessCount,
    paidBlockedCount,
    pendingCount,
    purchaseCount,
    activeAgentCount: activeAgentIds.size,
    averageOrderCents: purchaseCount > 0 ? Math.round(activatedGmvCents / purchaseCount) : 0,
    sectors: sortByAmount(Array.from(sectorBuckets.values())).slice(0, 6),
    runtimes: sortByAmount(Array.from(runtimeBuckets.values())).slice(0, 6),
    topAgents: sortByAmount(Array.from(agentBuckets.values())).slice(0, 6),
    sandboxNotice: SANDBOX_NOTICE,
  };
}

async function loadRevenueRows(period: RevenuePeriod, creatorId?: string | null): Promise<RevenueAnalyticsResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { analytics: null, error: "missing-config" };
  }

  const periodStart = getPeriodStart(period);
  const rows: PaymentRevenueRow[] = [];

  for (let from = 0; ; from += REVENUE_PAGE_SIZE) {
    let query = supabase
      .from("payments")
      .select(
        "status,amount_cents,currency,rental_request_id,agents!inner(id,name,slug,creator_id,agent_categories(name,slug)),agent_versions(runtime_type)",
      )
      .in("status", ["pending", "paid", "paid_blocked"])
      .order("created_at", { ascending: false })
      .range(from, from + REVENUE_PAGE_SIZE - 1);

    if (periodStart) {
      query = query.gte("created_at", periodStart);
    }

    if (creatorId) {
      query = query.eq("agents.creator_id", creatorId);
    }

    const { data, error } = await query.returns<PaymentRevenueRow[]>();

    if (error) {
      return { analytics: null, error: "revenue-analytics-load-failed" };
    }

    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < REVENUE_PAGE_SIZE) {
      break;
    }
  }

  return {
    analytics: aggregateRevenue(rows, period),
    error: null,
  };
}

export async function getCreatorRevenueAnalyticsForUser(period: RevenuePeriod = "30d"): Promise<RevenueAnalyticsResult> {
  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error) {
    return { analytics: null, error: creatorProfile.error };
  }

  if (creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    return {
      analytics: aggregateRevenue([], period),
      error: null,
    };
  }

  return loadRevenueRows(period, creatorProfile.id);
}

export async function getAdminRevenueAnalytics(period: RevenuePeriod = "30d"): Promise<RevenueAnalyticsResult> {
  return loadRevenueRows(period);
}

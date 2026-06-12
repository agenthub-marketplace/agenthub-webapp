import "server-only";

import type { AgentRuntimeType } from "@/lib/agent-contract";
import { AGENT_RUNTIME_TYPE_LABELS } from "@/lib/agent-contract";
import { publicEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import { createClient } from "@supabase/supabase-js";

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

export type RevenuePayoutPathStage = {
  detail: string;
  key: string;
  label: string;
  status: "blocked" | "current" | "done" | "future";
};

export type RevenueAnalytics = {
  period: RevenuePeriod;
  currency: string;
  activatedGmvCents: number;
  ledger: {
    blockedCount: number;
    blockedCents: number;
    earnedCount: number;
    earnedCents: number;
    eventCount: number;
    holdCount: number;
    holdCents: number;
    payoutReadyCount: number;
    payoutReadyCents: number;
    pendingAccessCount: number;
    pendingAccessCents: number;
  };
  ledgerCoverage: {
    blockedCount: number;
    coveredPurchaseCount: number;
    detail: string;
    label: string;
    missingEarnedCount: number;
    pendingAccessCount: number;
    status: "attention" | "clean" | "empty";
  };
  revenueReadiness: {
    blockers: string[];
    detail: string;
    label: string;
    nextSteps: string[];
    status: "attention" | "blocked" | "empty" | "ready";
  };
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
  payoutReadiness: {
    detail: string;
    label: string;
    nextSteps: string[];
    status: "not_configured";
  };
  payoutPath: {
    detail: string;
    label: string;
    stages: RevenuePayoutPathStage[];
  };
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
        category_id: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string | null;
        category_id: string | null;
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
const PAYOUT_READINESS: RevenueAnalytics["payoutReadiness"] = {
  status: "not_configured",
  label: "Payouts non configurés",
  detail: "GMV sandbox uniquement. Stripe Connect et les payouts creator ne sont pas activés en beta.",
  nextSteps: [
    "Stabiliser les achats sandbox et les accès actifs.",
    "Définir la commission AgentHub et les règles de remboursement.",
    "Activer Stripe Connect dans une phase dédiée.",
  ],
};
const REVENUE_PAGE_SIZE = 1000;

type CategoryRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

type RevenueLedgerRow = {
  creator_gross_cents: number | null;
  gross_amount_cents: number;
  status: string;
};

type CategoryMap = Map<string, { name: string; slug: string }>;

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

function aggregateRevenue(rows: PaymentRevenueRow[], period: RevenuePeriod, categoryMap: CategoryMap): RevenueAnalytics {
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
    const version = readSingle(row.agent_versions);
    const category = agent?.category_id ? categoryMap.get(agent.category_id) ?? null : null;
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
    ledger: emptyLedgerSummary(),
    ledgerCoverage: emptyLedgerCoverage(),
    revenueReadiness: emptyRevenueReadiness(),
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
    payoutReadiness: PAYOUT_READINESS,
    payoutPath: emptyPayoutPath(),
  };
}

function emptyLedgerSummary(): RevenueAnalytics["ledger"] {
  return {
    blockedCount: 0,
    blockedCents: 0,
    earnedCount: 0,
    earnedCents: 0,
    eventCount: 0,
    holdCount: 0,
    holdCents: 0,
    payoutReadyCount: 0,
    payoutReadyCents: 0,
    pendingAccessCount: 0,
    pendingAccessCents: 0,
  };
}

function emptyLedgerCoverage(): RevenueAnalytics["ledgerCoverage"] {
  return {
    blockedCount: 0,
    coveredPurchaseCount: 0,
    detail: "Aucun achat activé à rapprocher du ledger pour cette période.",
    label: "Aucun rapprochement requis",
    missingEarnedCount: 0,
    pendingAccessCount: 0,
    status: "empty",
  };
}

function emptyRevenueReadiness(): RevenueAnalytics["revenueReadiness"] {
  return {
    blockers: [],
    detail: "Aucun achat sandbox activé pour cette période. Rien à rapprocher avant la suite payout.",
    label: "Aucune donnée revenue",
    nextSteps: [
      "Publier au moins un agent achetable.",
      "Valider un achat Stripe sandbox jusqu’à l’accès actif.",
      "Vérifier que le ledger reçoit un événement earned.",
    ],
    status: "empty",
  };
}

function emptyPayoutPath(): RevenueAnalytics["payoutPath"] {
  return {
    detail: "Aucun achat sandbox activé. Le chemin payout reste au premier jalon.",
    label: "Chemin payout non démarré",
    stages: [
      {
        detail: "Créer un achat Stripe sandbox avec accès actif.",
        key: "sandbox-gmv",
        label: "GMV sandbox",
        status: "current",
      },
      {
        detail: "Rapprocher chaque achat activé avec un événement ledger earned.",
        key: "ledger-audit",
        label: "Ledger auditable",
        status: "future",
      },
      {
        detail: "Verrouiller commission, remboursements, support et fenêtre de hold.",
        key: "payout-rules",
        label: "Règles payout",
        status: "future",
      },
      {
        detail: "Activer Stripe Connect seulement après audit ledger cohérent.",
        key: "stripe-connect",
        label: "Stripe Connect",
        status: "future",
      },
    ],
  };
}

function buildLedgerCoverage(input: {
  activatedPurchaseCount: number;
  ledger: RevenueAnalytics["ledger"];
}): RevenueAnalytics["ledgerCoverage"] {
  if (input.activatedPurchaseCount === 0 && input.ledger.eventCount === 0) {
    return emptyLedgerCoverage();
  }

  const missingEarnedCount = Math.max(0, input.activatedPurchaseCount - input.ledger.earnedCount);
  const needsAttention = missingEarnedCount > 0 || input.ledger.pendingAccessCount > 0 || input.ledger.blockedCount > 0;

  if (needsAttention) {
    return {
      blockedCount: input.ledger.blockedCount,
      coveredPurchaseCount: input.ledger.earnedCount,
      detail: `${missingEarnedCount} achat(s) activé(s) sans événement earned, ${input.ledger.pendingAccessCount} paiement(s) en attente d'accès, ${input.ledger.blockedCount} activation(s) bloquée(s).`,
      label: "Rapprochement à surveiller",
      missingEarnedCount,
      pendingAccessCount: input.ledger.pendingAccessCount,
      status: "attention",
    };
  }

  return {
    blockedCount: 0,
    coveredPurchaseCount: input.ledger.earnedCount,
    detail: "Chaque achat activé de la période possède un événement earned dans le ledger beta.",
    label: "Ledger cohérent",
    missingEarnedCount: 0,
    pendingAccessCount: 0,
    status: "clean",
  };
}

function buildRevenueReadiness(input: {
  analytics: RevenueAnalytics;
  ledger: RevenueAnalytics["ledger"];
  ledgerCoverage: RevenueAnalytics["ledgerCoverage"];
}): RevenueAnalytics["revenueReadiness"] {
  const blockers: string[] = [];

  if (input.analytics.purchaseCount === 0 && input.ledger.eventCount === 0) {
    return {
      blockers: [],
      detail: "Aucun achat sandbox activé pour cette période. Rien à rapprocher avant la suite payout.",
      label: "Aucune donnée revenue",
      nextSteps: [
        "Publier au moins un agent achetable.",
        "Valider un achat Stripe sandbox jusqu’à l’accès actif.",
        "Vérifier que le ledger reçoit un événement earned.",
      ],
      status: "empty",
    };
  }

  if (input.ledgerCoverage.missingEarnedCount > 0) {
    blockers.push(`${input.ledgerCoverage.missingEarnedCount} achat(s) activé(s) sans événement earned.`);
  }

  if (input.ledgerCoverage.pendingAccessCount > 0) {
    blockers.push(`${input.ledgerCoverage.pendingAccessCount} paiement(s) en attente d’accès.`);
  }

  if (input.ledgerCoverage.blockedCount > 0) {
    blockers.push(`${input.ledgerCoverage.blockedCount} activation(s) bloquée(s) à reviewer.`);
  }

  if (input.analytics.paidWithoutAccessCount > 0) {
    blockers.push(`${input.analytics.paidWithoutAccessCount} paiement(s) paid sans accès lié.`);
  }

  if (input.analytics.paidBlockedCount > 0) {
    blockers.push(`${input.analytics.paidBlockedCount} paiement(s) paid_blocked.`);
  }

  if (blockers.length > 0) {
    return {
      blockers: [...new Set(blockers)].slice(0, 6),
      detail: "Corriger les écarts d’activation et de ledger avant d’envisager des payouts creator.",
      label: "Audit revenue à corriger",
      nextSteps: [
        "Traiter les paiements paid sans accès ou paid_blocked.",
        "Vérifier que chaque accès payé possède un événement earned.",
        "Garder Stripe Connect désactivé tant que ces écarts existent.",
      ],
      status: "blocked",
    };
  }

  if (input.analytics.pendingCount > 0 || input.ledger.holdCount > 0) {
    return {
      blockers: [],
      detail: "Le ledger des accès activés est cohérent, mais certains paiements ou revenus restent en attente.",
      label: "Revenus à surveiller",
      nextSteps: [
        "Laisser expirer ou finaliser les paiements pending.",
        "Suivre les éventuels holds avant tout passage payout.",
        "Continuer le smoke test checkout -> accès -> ledger.",
      ],
      status: "attention",
    };
  }

  return {
    blockers: [],
    detail: "Les achats activés de la période sont rapprochés avec le ledger beta. Cela reste du sandbox, pas un payout réel.",
    label: "Audit revenue cohérent",
    nextSteps: [
      "Documenter commission, remboursements et seuils payout.",
      "Préparer Stripe Connect dans une phase séparée.",
      "Maintenir les sanity checks ledger avant chaque beta élargie.",
    ],
    status: "ready",
  };
}

function buildPayoutPath(input: {
  analytics: RevenueAnalytics;
  ledgerCoverage: RevenueAnalytics["ledgerCoverage"];
  revenueReadiness: RevenueAnalytics["revenueReadiness"];
}): RevenueAnalytics["payoutPath"] {
  if (input.analytics.purchaseCount === 0 && input.analytics.ledger.eventCount === 0) {
    return emptyPayoutPath();
  }

  const ledgerBlocked = input.revenueReadiness.status === "blocked";
  const ledgerDone = input.ledgerCoverage.status === "clean" && !ledgerBlocked;
  const payoutRulesCurrent = input.revenueReadiness.status === "ready";

  return {
    detail: payoutRulesCurrent
      ? "Le ledger beta est cohérent. La prochaine étape reste produit/ops : règles payout, commission, refund window et support."
      : ledgerBlocked
        ? "Le chemin payout est bloqué tant que les écarts ledger ou activation ne sont pas corrigés."
        : "Le chemin payout progresse, mais certains paiements ou holds restent à surveiller.",
    label: payoutRulesCurrent
      ? "Prochaine étape : règles payout"
      : ledgerBlocked
        ? "Chemin payout bloqué"
        : "Chemin payout à surveiller",
    stages: [
      {
        detail: "Des achats sandbox avec accès actif existent pour cette période.",
        key: "sandbox-gmv",
        label: "GMV sandbox",
        status: "done",
      },
      {
        detail: ledgerBlocked
          ? input.ledgerCoverage.detail
          : "Chaque achat activé doit être rapproché avec un événement ledger earned.",
        key: "ledger-audit",
        label: "Ledger auditable",
        status: ledgerBlocked ? "blocked" : ledgerDone ? "done" : "current",
      },
      {
        detail: "Définir commission AgentHub, règles de remboursement, support, hold et seuil payout.",
        key: "payout-rules",
        label: "Règles payout",
        status: payoutRulesCurrent ? "current" : "future",
      },
      {
        detail: "Configurer Connect et payouts dans une phase séparée après validation des règles.",
        key: "stripe-connect",
        label: "Stripe Connect",
        status: "future",
      },
    ],
  };
}

async function loadLedgerSummary(input: {
  creatorId?: string | null;
  period: RevenuePeriod;
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
}): Promise<RevenueAnalytics["ledger"]> {
  const periodStart = getPeriodStart(input.period);
  const rows: RevenueLedgerRow[] = [];

  for (let from = 0; ; from += REVENUE_PAGE_SIZE) {
    let query = input.supabase
      .from("creator_revenue_ledger")
      .select("status,gross_amount_cents,creator_gross_cents")
      .order("created_at", { ascending: false })
      .range(from, from + REVENUE_PAGE_SIZE - 1);

    if (periodStart) {
      query = query.gte("created_at", periodStart);
    }

    if (input.creatorId) {
      query = query.eq("creator_id", input.creatorId);
    }

    const { data, error } = await query.returns<RevenueLedgerRow[]>();

    if (error) {
      return emptyLedgerSummary();
    }

    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < REVENUE_PAGE_SIZE) {
      break;
    }
  }

  const summary = emptyLedgerSummary();
  summary.eventCount = rows.length;

  for (const row of rows) {
    const amount = row.creator_gross_cents ?? row.gross_amount_cents ?? 0;

    if (row.status === "earned") {
      summary.earnedCount += 1;
      summary.earnedCents += amount;
    } else if (row.status === "blocked") {
      summary.blockedCount += 1;
      summary.blockedCents += amount;
    } else if (row.status === "hold") {
      summary.holdCount += 1;
      summary.holdCents += amount;
    } else if (row.status === "payout_ready") {
      summary.payoutReadyCount += 1;
      summary.payoutReadyCents += amount;
    } else if (row.status === "pending_access") {
      summary.pendingAccessCount += 1;
      summary.pendingAccessCents += amount;
    }
  }

  return summary;
}

async function loadCategoryMap(rows: PaymentRevenueRow[]): Promise<CategoryMap> {
  const categoryIds = Array.from(
    new Set(
      rows
        .map((row) => readSingle(row.agents)?.category_id ?? null)
        .filter((categoryId): categoryId is string => Boolean(categoryId)),
    ),
  );

  if (categoryIds.length === 0 || !publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return new Map();
  }

  const supabase = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("agent_categories")
    .select("id,name,slug")
    .in("id", categoryIds)
    .returns<CategoryRow[]>();

  if (error) {
    return new Map();
  }

  return new Map(
    (data ?? []).map((category) => [
      category.id,
      {
        name: category.name || "Non catégorisé",
        slug: category.slug || category.id,
      },
    ]),
  );
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
        "status,amount_cents,currency,rental_request_id,agents!inner(id,name,slug,creator_id,category_id),agent_versions(runtime_type)",
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

  const [categoryMap, ledger] = await Promise.all([
    loadCategoryMap(rows),
    loadLedgerSummary({
      creatorId,
      period,
      supabase,
    }),
  ]);
  const analytics = aggregateRevenue(rows, period, categoryMap);
  const ledgerCoverage = buildLedgerCoverage({
    activatedPurchaseCount: analytics.purchaseCount,
    ledger,
  });
  const revenueReadiness = buildRevenueReadiness({
    analytics,
    ledger,
    ledgerCoverage,
  });
  const payoutPath = buildPayoutPath({
    analytics: {
      ...analytics,
      ledger,
      ledgerCoverage,
      revenueReadiness,
    },
    ledgerCoverage,
    revenueReadiness,
  });

  return {
    analytics: {
      ...analytics,
      ledger,
      ledgerCoverage,
      payoutPath,
      revenueReadiness,
    },
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
      analytics: aggregateRevenue([], period, new Map()),
      error: null,
    };
  }

  return loadRevenueRows(period, creatorProfile.id);
}

export async function getAdminRevenueAnalytics(period: RevenuePeriod = "30d"): Promise<RevenueAnalyticsResult> {
  return loadRevenueRows(period);
}

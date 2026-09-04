import "server-only";

import { getMarketplaceAgents, type MarketplaceAgent, type MarketplaceCategory } from "@/server/marketplace/agents";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";

export const LEADERBOARD_PERIODS = ["week", "month", "all"] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const LEADERBOARD_SORTS = ["score", "access", "rating", "reviews", "newest"] as const;
export type LeaderboardSort = (typeof LEADERBOARD_SORTS)[number];

export type LeaderboardAgent = MarketplaceAgent & {
  rank: number;
  score: number;
  periodAccesses: number;
  totalAccesses: number;
  publishedAt: string | null;
};

type AccessRow = {
  agent_id: string;
  created_at: string;
  status: string;
};

const COUNTED_ACCESS_STATUSES = [...ACCESS_OPEN_STATUSES, "stopped", "expired"] as const;

function normalizePeriod(value?: string | null): LeaderboardPeriod {
  return LEADERBOARD_PERIODS.includes(value as LeaderboardPeriod) ? (value as LeaderboardPeriod) : "month";
}

function normalizeSort(value?: string | null): LeaderboardSort {
  return LEADERBOARD_SORTS.includes(value as LeaderboardSort) ? (value as LeaderboardSort) : "score";
}

function periodStart(period: LeaderboardPeriod) {
  if (period === "all") {
    return null;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (period === "week" ? 7 : 30));

  return start;
}

function countAccesses(rows: AccessRow[], period: LeaderboardPeriod) {
  const start = periodStart(period);
  const periodCounts = new Map<string, number>();
  const totalCounts = new Map<string, number>();

  for (const row of rows) {
    totalCounts.set(row.agent_id, (totalCounts.get(row.agent_id) ?? 0) + 1);

    if (!start || new Date(row.created_at).getTime() >= start.getTime()) {
      periodCounts.set(row.agent_id, (periodCounts.get(row.agent_id) ?? 0) + 1);
    }
  }

  return { periodCounts, totalCounts };
}

function scoreAgent(agent: MarketplaceAgent, periodAccesses: number, totalAccesses: number) {
  const rating = agent.reviews > 0 ? agent.rating : 0;
  const verifiedReviewWeight = Math.min(agent.reviews, 20) * 2.5;
  const accessWeight = periodAccesses * 12 + Math.min(totalAccesses, 50) * 1.5;
  const ratingWeight = rating > 0 ? rating * 18 : 0;
  const readinessWeight = agent.certified ? 8 : 0;

  return Math.round((accessWeight + ratingWeight + verifiedReviewWeight + readinessWeight) * 10) / 10;
}

function sortLeaderboard(agents: LeaderboardAgent[], sort: LeaderboardSort) {
  const sorted = [...agents];

  sorted.sort((a, b) => {
    if (sort === "access") {
      return b.periodAccesses - a.periodAccesses || b.totalAccesses - a.totalAccesses || b.score - a.score;
    }

    if (sort === "rating") {
      return b.rating - a.rating || b.reviews - a.reviews || b.score - a.score;
    }

    if (sort === "reviews") {
      return b.reviews - a.reviews || b.rating - a.rating || b.score - a.score;
    }

    if (sort === "newest") {
      return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
    }

    return b.score - a.score || b.periodAccesses - a.periodAccesses || b.rating - a.rating;
  });

  return sorted.map((agent, index) => ({ ...agent, rank: index + 1 }));
}

async function getAccessRows() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { rows: [] as AccessRow[], error: "leaderboard-stats-unavailable" as const };
  }

  const { data, error } = await supabase
    .from("rental_requests")
    .select("agent_id,status,created_at")
    .in("status", COUNTED_ACCESS_STATUSES as unknown as string[])
    .returns<AccessRow[]>();

  if (error) {
    return { rows: [] as AccessRow[], error: "leaderboard-stats-unavailable" as const };
  }

  return { rows: data ?? [], error: null };
}

export async function getLeaderboardAgents(options: {
  category?: string | null;
  period?: string | null;
  sort?: string | null;
} = {}): Promise<{
  agents: LeaderboardAgent[];
  categories: MarketplaceCategory[];
  error: string | null;
  period: LeaderboardPeriod;
  sort: LeaderboardSort;
  updatedAt: string;
}> {
  const period = normalizePeriod(options.period);
  const sort = normalizeSort(options.sort);
  const [marketplace, accessResult] = await Promise.all([getMarketplaceAgents(), getAccessRows()]);
  const { periodCounts, totalCounts } = countAccesses(accessResult.rows, period);
  const selectedCategory = options.category && options.category !== "all" ? options.category : null;

  const agents = marketplace.agents
    .filter((agent) => !selectedCategory || agent.categoryId === selectedCategory)
    .map((agent) => {
      const periodAccesses = periodCounts.get(agent.id) ?? 0;
      const totalAccesses = totalCounts.get(agent.id) ?? 0;

      return {
        ...agent,
        rank: 0,
        rentals: periodAccesses,
        periodAccesses,
        totalAccesses,
        publishedAt: agent.createdAt,
        score: scoreAgent(agent, periodAccesses, totalAccesses),
      };
    });

  return {
    agents: sortLeaderboard(agents, sort),
    categories: marketplace.categories,
    error: marketplace.error ?? accessResult.error,
    period,
    sort,
    updatedAt: new Date().toISOString(),
  };
}

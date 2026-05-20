import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MarketplaceAgent = {
  id: string;
  slug: string;
  name: string;
  pitch: string;
  description: string;
  category: string;
  categoryId: string;
  rating: number;
  reviews: number;
  fromPrice: number;
  priceMode: "task" | "project";
  creator: {
    name: string;
    avatar: string;
  };
  certified: boolean;
  trending: boolean;
  gradient: number;
  level: "beginner" | "intermediate" | "advanced";
  languages: string[];
  tools: string[];
  rentals: number;
  pricingType: "task" | "project";
  riskLevel: "low" | "medium" | "high" | "forbidden_beta";
  estimatedTurnaround: string | null;
  capabilities: string[];
  requiredInputs: string[];
  deliverables: string[];
  limitations: string[];
  dataHandlingNotes: string | null;
  reviewSummaries: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAt: string;
  }[];
};

export type MarketplaceCategory = {
  id: string;
  name: string;
  count: number;
  icon: string;
};

type AgentRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  pricing_type: "task" | "project";
  starting_price_cents: number | null;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  estimated_turnaround: string | null;
  created_at: string;
  agent_categories: { slug: string; name: string } | { slug: string; name: string }[] | null;
  creator_profiles: { public_name: string | null } | { public_name: string | null }[] | null;
  agent_versions:
    | {
        capabilities: string[] | null;
        required_inputs: string[] | null;
        deliverables: string[] | null;
        limitations: string[] | null;
        data_handling_notes: string | null;
      }
    | {
        capabilities: string[] | null;
        required_inputs: string[] | null;
        deliverables: string[] | null;
        limitations: string[] | null;
        data_handling_notes: string | null;
      }[]
    | null;
  agent_reviews:
    | {
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
        created_at: string;
      }
    | {
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
        created_at: string;
      }[]
    | null;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function mapAgent(row: AgentRow, index: number): MarketplaceAgent {
  const category = readSingle(row.agent_categories);
  const creator = readSingle(row.creator_profiles);
  const version = readSingle(row.agent_versions);
  const creatorName = creator?.public_name ?? "AgentHub Creator";
  const reviews = Array.isArray(row.agent_reviews) ? row.agent_reviews : row.agent_reviews ? [row.agent_reviews] : [];
  const rating = reviews.length > 0 ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length : 0;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    pitch: row.summary,
    description: row.description,
    category: category?.name ?? "Business agents",
    categoryId: category?.slug ?? "business-agents",
    rating,
    reviews: reviews.length,
    fromPrice: Math.max(0, Math.round((row.starting_price_cents ?? 0) / 100)),
    priceMode: row.pricing_type,
    creator: {
      name: creatorName,
      avatar: initials(creatorName) || "AH",
    },
    certified: true,
    trending: index < 2,
    gradient: index % 8,
    level: row.risk_level === "high" ? "advanced" : row.risk_level === "medium" ? "intermediate" : "beginner",
    languages: ["Français"],
    tools: [],
    rentals: 0,
    pricingType: row.pricing_type,
    riskLevel: row.risk_level,
    estimatedTurnaround: row.estimated_turnaround,
    capabilities: version?.capabilities ?? [],
    requiredInputs: version?.required_inputs ?? [],
    deliverables: version?.deliverables ?? [],
    limitations: version?.limitations ?? [],
    dataHandlingNotes: version?.data_handling_notes ?? null,
    reviewSummaries: reviews
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.created_at,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

export async function getMarketplaceAgents() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { agents: [], categories: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("agents")
    .select(
      "id,slug,name,summary,description,pricing_type,starting_price_cents,risk_level,estimated_turnaround,created_at,agent_categories(slug,name),creator_profiles(public_name),agent_versions!agents_active_version_id_fkey(capabilities,required_inputs,deliverables,limitations,data_handling_notes),agent_reviews(id,rating,title,body,created_at)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .returns<AgentRow[]>();

  if (error) {
    return { agents: [], categories: [], error: "marketplace-load-failed" };
  }

  const agents = (data ?? []).map(mapAgent);
  const categoryCounts = new Map<string, MarketplaceCategory>();

  for (const agent of agents) {
    const existing = categoryCounts.get(agent.categoryId);
    categoryCounts.set(agent.categoryId, {
      id: agent.categoryId,
      name: agent.category,
      count: (existing?.count ?? 0) + 1,
      icon: "Sparkles",
    });
  }

  return {
    agents,
    categories: Array.from(categoryCounts.values()).sort((a, b) => a.name.localeCompare(b.name)),
    error: null,
  };
}

export async function getMarketplaceAgentBySlug(slug: string) {
  const { agents, error } = await getMarketplaceAgents();

  return {
    agent: agents.find((agent) => agent.slug === slug) ?? null,
    error,
  };
}

import "server-only";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
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
  fromPrice: number | null;
  priceLabel: string | null;
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
  createdAt: string;
  contract: AgentContract;
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
        workspace_mode: string | null;
        setup_requirements: unknown;
        output_promise: unknown;
        execution_mode: string | null;
        runtime_type?: string | null;
        data_policy: unknown;
      }
    | {
        capabilities: string[] | null;
        required_inputs: string[] | null;
        deliverables: string[] | null;
        limitations: string[] | null;
        data_handling_notes: string | null;
        workspace_mode: string | null;
        setup_requirements: unknown;
        output_promise: unknown;
        execution_mode: string | null;
        runtime_type?: string | null;
        data_policy: unknown;
      }[]
    | null;
  agent_reviews:
    | {
        id: string;
        rating: number;
        title?: string | null;
        body?: string | null;
        created_at: string;
      }
    | {
        id: string;
        rating: number;
        title?: string | null;
        body?: string | null;
        created_at: string;
      }[]
    | null;
};

type RuntimeSettingRow = {
  enabled: boolean;
  run_enabled: boolean;
  runtime_type: string;
};

const MARKETPLACE_SELECT_WITH_CONTRACT =
  "id,slug,name,summary,description,pricing_type,starting_price_cents,risk_level,estimated_turnaround,created_at,agent_categories(slug,name),creator_profiles(public_name),agent_versions!agents_active_version_id_fkey(capabilities,required_inputs,deliverables,limitations,data_handling_notes,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy),agent_reviews(id,rating,title,body,created_at)";

const MARKETPLACE_SELECT_LEGACY =
  "id,slug,name,summary,description,pricing_type,starting_price_cents,risk_level,estimated_turnaround,created_at,agent_categories(slug,name),creator_profiles(public_name),agent_versions!agents_active_version_id_fkey(capabilities,required_inputs,deliverables,limitations,data_handling_notes),agent_reviews(id,rating,title,body,created_at)";

const MARKETPLACE_LIST_SELECT_WITH_CONTRACT =
  "id,slug,name,summary,description,pricing_type,starting_price_cents,risk_level,estimated_turnaround,created_at,agent_categories(slug,name),creator_profiles(public_name),agent_versions!agents_active_version_id_fkey(capabilities,required_inputs,deliverables,limitations,data_handling_notes,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy),agent_reviews(id,rating,title,body,created_at)";

const MARKETPLACE_LIST_SELECT_LEGACY =
  "id,slug,name,summary,description,pricing_type,starting_price_cents,risk_level,estimated_turnaround,created_at,agent_categories(slug,name),creator_profiles(public_name),agent_versions!agents_active_version_id_fkey(capabilities,required_inputs,deliverables,limitations,data_handling_notes),agent_reviews(id,rating,title,body,created_at)";

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

function formatEuroPrice(cents: number | null) {
  if (typeof cents !== "number" || cents <= 0) {
    return null;
  }

  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

function isMissingContractColumnError(error: { code?: string; details?: string | null; message?: string | null }) {
  const text = `${error.code ?? ""} ${error.details ?? ""} ${error.message ?? ""}`.toLowerCase();

  return (
    text.includes("workspace_mode") ||
    text.includes("setup_requirements") ||
    text.includes("output_promise") ||
    text.includes("execution_mode") ||
    text.includes("runtime_type") ||
    text.includes("data_policy")
  );
}

async function fetchMarketplaceRows(
  selectClause: string,
  options: {
    limit?: number;
    slug?: string;
  } = {},
) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { data: null, error: { message: "missing-config" } };
  }

  let query = supabase
    .from("agents")
    .select(selectClause)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (options.slug) {
    query = query.eq("slug", options.slug);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query.returns<AgentRow[]>();
}

function mapAgent(row: AgentRow, index: number): MarketplaceAgent {
  const category = readSingle(row.agent_categories);
  const creator = readSingle(row.creator_profiles);
  const version = readSingle(row.agent_versions);
  const contract = normalizeAgentContract({
    workspaceMode: version?.workspace_mode,
    setupRequirements: version?.setup_requirements,
    outputPromise: version?.output_promise,
    executionMode: version?.execution_mode,
    runtimeType: version?.runtime_type,
    dataPolicy: version?.data_policy,
  });
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
    fromPrice:
      typeof row.starting_price_cents === "number" && row.starting_price_cents > 0
        ? row.starting_price_cents / 100
        : null,
    priceLabel: formatEuroPrice(row.starting_price_cents),
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
    createdAt: row.created_at,
    contract,
    reviewSummaries: reviews
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title ?? null,
        body: review.body ?? null,
        createdAt: review.created_at,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

async function loadRuntimeSettings() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("agent_runtime_settings")
    .select("runtime_type,enabled,run_enabled")
    .returns<RuntimeSettingRow[]>();

  if (error) {
    return null;
  }

  return new Map((data ?? []).map((setting) => [setting.runtime_type, setting]));
}

function isMarketplaceUsableAgent(agent: MarketplaceAgent, runtimeSettings: Map<string, RuntimeSettingRow> | null) {
  if (!runtimeSettings) {
    return false;
  }

  const setting = runtimeSettings.get(agent.contract.runtimeType);

  if (!setting?.enabled) {
    return false;
  }

  return agent.contract.runtimeType === "static_guided" || setting.run_enabled;
}

export async function getMarketplaceAgents(options: { limit?: number } = {}) {
  const fetchLimit = options.limit ? options.limit * 4 : undefined;
  let { data, error } = await fetchMarketplaceRows(MARKETPLACE_LIST_SELECT_WITH_CONTRACT, {
    limit: fetchLimit,
  });

  if (error && isMissingContractColumnError(error)) {
    const fallback = await fetchMarketplaceRows(MARKETPLACE_LIST_SELECT_LEGACY, {
      limit: fetchLimit,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { agents: [], categories: [], error: "marketplace-load-failed" };
  }

  const runtimeSettings = await loadRuntimeSettings();
  const agents = (data ?? [])
    .map(mapAgent)
    .filter((agent) => isMarketplaceUsableAgent(agent, runtimeSettings))
    .slice(0, options.limit);
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
  let { data, error } = await fetchMarketplaceRows(MARKETPLACE_SELECT_WITH_CONTRACT, {
    limit: 1,
    slug,
  });

  if (error && isMissingContractColumnError(error)) {
    const fallback = await fetchMarketplaceRows(MARKETPLACE_SELECT_LEGACY, {
      limit: 1,
      slug,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { agent: null, error: "marketplace-load-failed" };
  }

  const runtimeSettings = await loadRuntimeSettings();
  const agent = data?.[0] ? mapAgent(data[0], 0) : null;

  return {
    agent: agent && isMarketplaceUsableAgent(agent, runtimeSettings) ? agent : null,
    error: null,
  };
}

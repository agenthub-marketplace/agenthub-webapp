import "server-only";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
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

export type CreatorAgentDetailItem = CreatorAgentListItem & {
  description: string;
  accessStats: CreatorAgentAccessStats;
  recentRuns: CreatorAgentRunSummary[];
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

type AdminReviewFeedbackRow = {
  agent_id: string;
  decision: AgentStatus;
  notes: string | null;
  created_at: string;
};

type AgentRunSummaryRow = {
  id: string;
  agent_id: string;
  action_label: string;
  status: "running" | "succeeded" | "failed";
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
};

type RentalAccessStatusRow = {
  status: string;
};

const ACTIVE_ACCESS_STATUSES = ["active", "accepted", "in_progress", "delivered"];

export type CreatorAgentsResult = {
  agents: CreatorAgentListItem[];
  recentRuns: CreatorAgentRunSummary[];
  creatorProfileMissing: boolean;
  error: string | null;
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

async function loadCreatorAgentRunSummaries(
  agentIds: string[],
  agentNameById: Map<string, string>,
  limit = 6,
): Promise<CreatorAgentRunSummary[]> {
  if (agentIds.length === 0) {
    return [];
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return [];
  }

  const { data, error } = await serviceClient
    .from("agent_runs")
    .select("id,agent_id,action_label,status,error_code,created_at,completed_at")
    .in("agent_id", agentIds)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AgentRunSummaryRow[]>();

  if (error) {
    return [];
  }

  return (data ?? []).map((run) => ({
    id: run.id,
    agentId: run.agent_id,
    agentName: agentNameById.get(run.agent_id) ?? "AgentHub agent",
    actionLabel: run.action_label,
    status: run.status,
    errorCode: run.error_code,
    createdAt: run.created_at,
    completedAt: run.completed_at,
  }));
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
    };
  }

  const creatorProfileLookup = await getCreatorProfileForUser();

  if (creatorProfileLookup.error) {
    return {
      agents: [],
      recentRuns: [],
      creatorProfileMissing: false,
      error: creatorProfileLookup.error,
    };
  }

  if (creatorProfileLookup.creatorProfileMissing || !creatorProfileLookup.id) {
    return {
      agents: [],
      recentRuns: [],
      creatorProfileMissing: true,
      error: null,
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
    };
  }

  const agentRows = data ?? [];
  const agentIds = agentRows.map((agent) => agent.id);
  const versionIds = agentRows.map((agent) => agent.active_version_id).filter((id): id is string => Boolean(id));
  const agentNameById = new Map(agentRows.map((agent) => [agent.id, agent.name]));
  const latestReviewsByAgent = new Map<string, CreatorAgentListItem["latestAdminReview"]>();
  const versionsById = new Map<string, AgentVersionListRow>();
  const reviewStatsByAgent = new Map<string, { rating: number; reviews: number }>();
  let recentRuns: CreatorAgentRunSummary[] = [];

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

    recentRuns = await loadCreatorAgentRunSummaries(agentIds, agentNameById, 6);
  }

  if (versionIds.length > 0) {
    const { data: versions } = await supabase
      .from("agent_versions")
      .select("id,workspace_mode,execution_mode,runtime_type")
      .in("id", versionIds)
      .returns<AgentVersionListRow[]>();

    for (const version of versions ?? []) {
      versionsById.set(version.id, version);
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
  let rating = 0;
  let reviews = 0;
  let recentRuns: CreatorAgentRunSummary[] = [];
  const accessStats: CreatorAgentAccessStats = {
    total: 0,
    active: 0,
    stopped: 0,
    expired: 0,
    cancelled: 0,
  };

  const [reviewResponse, latestReviewResponse, recentRunSummaries, rentalsResponse] = await Promise.all([
    supabase.from("agent_reviews").select("rating").eq("agent_id", agent.id).returns<Pick<AgentReviewRatingRow, "rating">[]>(),
    supabase
      .from("admin_reviews")
      .select("decision,notes,created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Omit<AdminReviewFeedbackRow, "agent_id">>(),
    loadCreatorAgentRunSummaries([agent.id], new Map([[agent.id, agent.name]]), 8),
    supabase.from("rental_requests").select("status").eq("agent_id", agent.id).returns<RentalAccessStatusRow[]>(),
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

  recentRuns = recentRunSummaries;

  if (!rentalsResponse.error) {
    for (const rental of rentalsResponse.data ?? []) {
      accessStats.total += 1;
      if (ACTIVE_ACCESS_STATUSES.includes(rental.status)) {
        accessStats.active += 1;
      } else if (rental.status === "stopped") {
        accessStats.stopped += 1;
      } else if (rental.status === "expired") {
        accessStats.expired += 1;
      } else if (rental.status === "cancelled") {
        accessStats.cancelled += 1;
      }
    }
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

  return {
    agent: {
      id: agent.id,
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
      latestAdminReview,
      accessStats,
      recentRuns,
    },
    creatorProfileMissing: false,
    error: null,
  };
}

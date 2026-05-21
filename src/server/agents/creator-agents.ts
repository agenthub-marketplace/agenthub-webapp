import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AgentStatus, PricingType } from "@/types/agent";

export type AgentCategoryOption = {
  id: string;
  name: string;
};

export type CreatorAgentListItem = {
  id: string;
  name: string;
  summary: string;
  status: AgentStatus;
  pricingType: PricingType;
  riskLevel: "low" | "medium" | "high" | "forbidden_beta";
  categoryName: string | null;
  createdAt: string;
  latestAdminReview: {
    decision: AgentStatus;
    notes: string | null;
    createdAt: string;
    isChangesRequest: boolean;
  } | null;
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
  } | null;
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
};

type CreatorProfileRow = {
  id: string;
};

type CreatorAgentRow = {
  id: string;
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
  agent_categories: { name: string } | { name: string }[] | null;
};

type AgentVersionEditRow = {
  capabilities: string[] | null;
  required_inputs: string[] | null;
  deliverables: string[] | null;
  limitations: string[] | null;
};

type AdminReviewFeedbackRow = {
  agent_id: string;
  decision: AgentStatus;
  notes: string | null;
  created_at: string;
};

export type CreatorAgentsResult = {
  agents: CreatorAgentListItem[];
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

export async function getAgentCategoryOptions(): Promise<AgentCategoryOption[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("agent_categories")
    .select("id,name")
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

export async function getCreatorAgentsForUser(): Promise<CreatorAgentsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      agents: [],
      creatorProfileMissing: false,
      error: "missing-config",
    };
  }

  const creatorProfileLookup = await getCreatorProfileForUser();

  if (creatorProfileLookup.error) {
    return {
      agents: [],
      creatorProfileMissing: false,
      error: creatorProfileLookup.error,
    };
  }

  if (creatorProfileLookup.creatorProfileMissing || !creatorProfileLookup.id) {
    return {
      agents: [],
      creatorProfileMissing: true,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("agents")
    .select("id,name,summary,status,pricing_type,risk_level,created_at,agent_categories(name)")
    .eq("creator_id", creatorProfileLookup.id)
    .order("created_at", { ascending: false })
    .returns<CreatorAgentRow[]>();

  if (error) {
    return {
      agents: [],
      creatorProfileMissing: false,
      error: "agents-error",
    };
  }

  const agentRows = data ?? [];
  const agentIds = agentRows.map((agent) => agent.id);
  const latestReviewsByAgent = new Map<string, CreatorAgentListItem["latestAdminReview"]>();

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
  }

  return {
    agents: agentRows.map((agent) => {
      const latestAdminReview = latestReviewsByAgent.get(agent.id) ?? null;

      return {
        id: agent.id,
        name: agent.name,
        summary: agent.summary,
        status: agent.status,
        pricingType: agent.pricing_type,
        riskLevel: agent.risk_level,
        categoryName: readCategoryName(agent.agent_categories),
        createdAt: agent.created_at,
        latestAdminReview: latestAdminReview
          ? {
              ...latestAdminReview,
              isChangesRequest: agent.status === "in_review" && latestAdminReview.isChangesRequest,
            }
          : null,
      };
    }),
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
      .select("capabilities,required_inputs,deliverables,limitations")
      .eq("id", agent.active_version_id)
      .maybeSingle<AgentVersionEditRow>();

    if (versionRow) {
      version = {
        capabilities: versionRow.capabilities ?? [],
        requiredInputs: versionRow.required_inputs ?? [],
        deliverables: versionRow.deliverables ?? [],
        limitations: versionRow.limitations ?? [],
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

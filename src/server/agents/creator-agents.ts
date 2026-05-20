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
  name: string;
  summary: string;
  status: AgentStatus;
  pricing_type: PricingType;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  created_at: string;
  agent_categories: { name: string } | { name: string }[] | null;
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

  return {
    agents: (data ?? []).map((agent) => ({
      id: agent.id,
      name: agent.name,
      summary: agent.summary,
      status: agent.status,
      pricingType: agent.pricing_type,
      riskLevel: agent.risk_level,
      categoryName: readCategoryName(agent.agent_categories),
      createdAt: agent.created_at,
    })),
    creatorProfileMissing: false,
    error: null,
  };
}

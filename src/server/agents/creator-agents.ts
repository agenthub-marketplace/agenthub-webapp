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

type CreatorProfileRow = {
  id: string;
  public_name: string;
};

type AgentCategoryRow = {
  id: string;
  name: string;
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

export async function getCreatorProfileForUser(userId: string): Promise<CreatorProfileLookup> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      creatorProfileMissing: false,
      error: "missing-config",
    };
  }

  const { data, error } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<Pick<CreatorProfileRow, "id">>();

  if (error) {
    return {
      creatorProfileMissing: false,
      error: "creator-profile-error",
    };
  }

  return {
    creatorProfileMissing: !data,
    error: null,
  };
}

export async function getCreatorAgentsForUser(userId: string): Promise<CreatorAgentsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      agents: [],
      creatorProfileMissing: false,
      error: "missing-config",
    };
  }

  const { data: creatorProfile, error: creatorProfileError } = await supabase
    .from("creator_profiles")
    .select("id,public_name")
    .eq("user_id", userId)
    .maybeSingle<CreatorProfileRow>();

  if (creatorProfileError) {
    return {
      agents: [],
      creatorProfileMissing: false,
      error: "creator-profile-error",
    };
  }

  if (!creatorProfile) {
    return {
      agents: [],
      creatorProfileMissing: true,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("agents")
    .select("id,name,summary,status,pricing_type,risk_level,created_at,agent_categories(name)")
    .eq("creator_id", creatorProfile.id)
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

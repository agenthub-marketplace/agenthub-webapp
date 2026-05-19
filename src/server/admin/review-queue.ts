import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminReviewQueueItem = {
  id: string;
  name: string;
  summary: string;
  description: string;
  status: "submitted" | "in_review";
  riskLevel: "low" | "medium" | "high" | "forbidden_beta";
  pricingType: "task" | "project";
  categoryName: string | null;
  creatorName: string | null;
  createdAt: string;
};

type AgentQueueRow = {
  id: string;
  name: string;
  summary: string;
  description: string;
  status: "submitted" | "in_review";
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  pricing_type: "task" | "project";
  created_at: string;
  agent_categories: { name: string } | { name: string }[] | null;
  creator_profiles: { public_name: string } | { public_name: string }[] | null;
};

export type AdminReviewQueueResult = {
  queue: AdminReviewQueueItem[];
  error: string | null;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getAdminReviewQueue(): Promise<AdminReviewQueueResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { queue: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("agents")
    .select(
      "id,name,summary,description,status,risk_level,pricing_type,created_at,agent_categories(name),creator_profiles(public_name)",
    )
    .in("status", ["submitted", "in_review"])
    .order("created_at", { ascending: true })
    .returns<AgentQueueRow[]>();

  if (error) {
    return { queue: [], error: "queue-load-failed" };
  }

  return {
    queue: (data ?? []).map((agent) => ({
      id: agent.id,
      name: agent.name,
      summary: agent.summary,
      description: agent.description,
      status: agent.status,
      riskLevel: agent.risk_level,
      pricingType: agent.pricing_type,
      categoryName: readSingle(agent.agent_categories)?.name ?? null,
      creatorName: readSingle(agent.creator_profiles)?.public_name ?? null,
      createdAt: agent.created_at,
    })),
    error: null,
  };
}

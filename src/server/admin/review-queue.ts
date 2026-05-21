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
  latestAdminReview: {
    decision: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended";
    notes: string | null;
    createdAt: string;
  } | null;
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

type AdminReviewFeedbackRow = {
  agent_id: string;
  decision: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended";
  notes: string | null;
  created_at: string;
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

  const agentRows = data ?? [];
  const agentIds = agentRows.map((agent) => agent.id);
  const latestReviewsByAgent = new Map<string, AdminReviewQueueItem["latestAdminReview"]>();

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
        });
      }
    }
  }

  return {
    queue: agentRows.map((agent) => ({
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
      latestAdminReview: latestReviewsByAgent.get(agent.id) ?? null,
    })),
    error: null,
  };
}

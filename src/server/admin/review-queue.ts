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
  resubmissionChangelog: string | null;
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
  active_version_id: string | null;
  created_at: string;
  agent_categories: { name: string } | { name: string }[] | null;
  creator_profiles: { public_name: string } | { public_name: string }[] | null;
};

type AgentVersionReviewRow = {
  id: string;
  changelog: string | null;
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
      "id,name,summary,description,status,risk_level,pricing_type,active_version_id,created_at,agent_categories(name),creator_profiles(public_name)",
    )
    .in("status", ["submitted", "in_review"])
    .order("created_at", { ascending: true })
    .returns<AgentQueueRow[]>();

  if (error) {
    return { queue: [], error: "queue-load-failed" };
  }

  const agentRows = data ?? [];
  const agentIds = agentRows.map((agent) => agent.id);
  const activeVersionIds = agentRows
    .map((agent) => agent.active_version_id)
    .filter((versionId): versionId is string => Boolean(versionId));
  const latestReviewsByAgent = new Map<string, AdminReviewQueueItem["latestAdminReview"]>();
  const changelogByVersion = new Map<string, string | null>();

  const uniqueActiveVersionIds = Array.from(new Set(activeVersionIds));

  if (uniqueActiveVersionIds.length > 0) {
    const { data: versionsData } = await supabase.rpc("get_admin_agent_version_changelogs", {
      p_version_ids: uniqueActiveVersionIds,
    });
    const versions = Array.isArray(versionsData) ? (versionsData as AgentVersionReviewRow[]) : [];

    for (const version of versions) {
      changelogByVersion.set(version.id, version.changelog);
    }
  }

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
      resubmissionChangelog: agent.active_version_id ? changelogByVersion.get(agent.active_version_id) ?? null : null,
      latestAdminReview: latestReviewsByAgent.get(agent.id) ?? null,
    })),
    error: null,
  };
}

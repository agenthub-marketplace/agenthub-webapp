import "server-only";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
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
  contract: AgentContract;
  latestAdminReview: {
    decision: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended";
    notes: string | null;
    createdAt: string;
  } | null;
};

export type AdminAgentManagementItem = {
  id: string;
  name: string;
  summary: string;
  status: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended" | "archived";
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
  active_version_id: string | null;
  created_at: string;
  agent_categories: { name: string } | { name: string }[] | null;
  creator_profiles: { public_name: string } | { public_name: string }[] | null;
};

type AgentManagementRow = {
  id: string;
  name: string;
  summary: string;
  status: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended" | "archived";
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  pricing_type: "task" | "project";
  created_at: string;
  agent_categories: { name: string } | { name: string }[] | null;
  creator_profiles: { public_name: string } | { public_name: string }[] | null;
};

type AgentVersionReviewRow = {
  id: string;
  changelog: string | null;
  workspace_mode: string | null;
  setup_requirements: unknown;
  output_promise: unknown;
  execution_mode: string | null;
  data_policy: unknown;
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

export type AdminAgentManagementResult = {
  agents: AdminAgentManagementItem[];
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
  const contractByVersion = new Map<string, AgentContract>();

  const uniqueActiveVersionIds = Array.from(new Set(activeVersionIds));

  if (uniqueActiveVersionIds.length > 0) {
    const { data: versions } = await supabase
      .from("agent_versions")
      .select("id,changelog,workspace_mode,setup_requirements,output_promise,execution_mode,data_policy")
      .in("id", uniqueActiveVersionIds)
      .returns<AgentVersionReviewRow[]>();

    for (const version of versions ?? []) {
      changelogByVersion.set(version.id, version.changelog);
      contractByVersion.set(
        version.id,
        normalizeAgentContract({
          workspaceMode: version.workspace_mode,
          setupRequirements: version.setup_requirements,
          outputPromise: version.output_promise,
          executionMode: version.execution_mode,
          dataPolicy: version.data_policy,
        }),
      );
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
      contract: agent.active_version_id ? contractByVersion.get(agent.active_version_id) ?? normalizeAgentContract({}) : normalizeAgentContract({}),
      latestAdminReview: latestReviewsByAgent.get(agent.id) ?? null,
    })),
    error: null,
  };
}

export async function getAdminAgentManagementList(): Promise<AdminAgentManagementResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { agents: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("agents")
    .select("id,name,summary,status,risk_level,pricing_type,created_at,agent_categories(name),creator_profiles(public_name)")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(100)
    .returns<AgentManagementRow[]>();

  if (error) {
    return { agents: [], error: "agents-load-failed" };
  }

  return {
    agents: (data ?? []).map((agent) => ({
      id: agent.id,
      name: agent.name,
      summary: agent.summary,
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

import "server-only";

import { normalizeAgentContract, type AgentContract, type AgentRuntimeType } from "@/lib/agent-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAgentManifest, type AgentManifestV1 } from "@/server/agents/manifest";
import { normalizeWorkflowDefinition } from "@/server/workflows/runtime";

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
  runtimeSetting: {
    creatorVisible: boolean;
    enabled: boolean;
    runEnabled: boolean;
  } | null;
  workflow: {
    id: string;
    status: string;
    steps: {
      endpointId: string | null;
      endpointStatus: string | null;
      label: string;
      type: string;
    }[];
  } | null;
  creatorEndpoint: {
    endpointStatus: string | null;
    id: string;
    status: string;
  } | null;
  securityReview: {
    id: string;
    status: string;
  } | null;
  manifest: AgentManifestV1 | null;
  manifestError: string | null;
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
  agent_id: string;
  id: string;
  changelog: string | null;
  workspace_mode: string | null;
  setup_requirements: unknown;
  output_promise: unknown;
  execution_mode: string | null;
  runtime_type: string | null;
  data_policy: unknown;
};

type RuntimeSettingRow = {
  creator_visible: boolean;
  enabled: boolean;
  run_enabled: boolean;
  runtime_type: AgentRuntimeType;
};

type WorkflowReviewRow = {
  agent_version_id: string;
  definition: unknown;
  id: string;
  status: string;
};

type WebhookEndpointReviewRow = {
  id: string;
  status: string;
};

type CreatorEndpointReviewRow = {
  agent_version_id: string;
  endpoint_id: string;
  id: string;
  status: string;
};

type SecurityReviewSummaryRow = {
  agent_version_id: string | null;
  id: string;
  status: string;
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
  const reviewVersionIdByAgent = new Map<string, string>();
  const latestReviewsByAgent = new Map<string, AdminReviewQueueItem["latestAdminReview"]>();
  const changelogByVersion = new Map<string, string | null>();
  const contractByVersion = new Map<string, AgentContract>();
  const runtimeSettingsByType = new Map<AgentRuntimeType, AdminReviewQueueItem["runtimeSetting"]>();
  const workflowByVersion = new Map<string, AdminReviewQueueItem["workflow"]>();
  const creatorEndpointByVersion = new Map<string, AdminReviewQueueItem["creatorEndpoint"]>();
  const securityReviewByVersion = new Map<string, AdminReviewQueueItem["securityReview"]>();
  const manifestByVersion = new Map<string, AgentManifestV1 | null>();
  const manifestErrorByVersion = new Map<string, string | null>();

  if (agentIds.length > 0) {
    const { data: versions } = await supabase
      .from("agent_versions")
      .select("agent_id,id,changelog,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy,version_number,created_at")
      .in("agent_id", agentIds)
      .order("version_number", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<AgentVersionReviewRow[]>();

    for (const version of versions ?? []) {
      if (!reviewVersionIdByAgent.has(version.agent_id)) {
        reviewVersionIdByAgent.set(version.agent_id, version.id);
      }

      changelogByVersion.set(version.id, version.changelog);
      contractByVersion.set(
        version.id,
        normalizeAgentContract({
          workspaceMode: version.workspace_mode,
          setupRequirements: version.setup_requirements,
          outputPromise: version.output_promise,
          executionMode: version.execution_mode,
          runtimeType: version.runtime_type,
          dataPolicy: version.data_policy,
        }),
      );
    }
  }

  for (const agent of agentRows) {
    if (!reviewVersionIdByAgent.has(agent.id) && agent.active_version_id) {
      reviewVersionIdByAgent.set(agent.id, agent.active_version_id);
    }
  }

  const reviewVersionIds = Array.from(new Set([...reviewVersionIdByAgent.values()]));

  await Promise.all(
    reviewVersionIds.map(async (versionId) => {
      const result = await buildAgentManifest(versionId);
      manifestByVersion.set(versionId, result.manifest);
      manifestErrorByVersion.set(versionId, result.error);
    }),
  );

  const { data: runtimeSettings } = await supabase
    .from("agent_runtime_settings")
    .select("runtime_type,enabled,creator_visible,run_enabled")
    .returns<RuntimeSettingRow[]>();

  for (const setting of runtimeSettings ?? []) {
    runtimeSettingsByType.set(setting.runtime_type, {
      creatorVisible: setting.creator_visible,
      enabled: setting.enabled,
      runEnabled: setting.run_enabled,
    });
  }

  if (reviewVersionIds.length > 0) {
    const { data: workflows } = await supabase
      .from("agent_version_workflows")
      .select("id,agent_version_id,status,definition")
      .in("agent_version_id", reviewVersionIds)
      .returns<WorkflowReviewRow[]>();
    const endpointIds = new Set<string>();
    const parsedWorkflows = (workflows ?? [])
      .map((workflow) => {
        const definition = normalizeWorkflowDefinition(workflow.definition);

        if (!definition) {
          return null;
        }

        for (const step of definition.steps) {
          if (step.endpointId) {
            endpointIds.add(step.endpointId);
          }
        }

        return { definition, workflow };
      })
      .filter(Boolean) as { definition: NonNullable<ReturnType<typeof normalizeWorkflowDefinition>>; workflow: WorkflowReviewRow }[];
    const endpointStatusById = new Map<string, string>();

    if (endpointIds.size > 0) {
      const { data: endpoints } = await supabase
        .from("creator_webhook_endpoints")
        .select("id,status")
        .in("id", [...endpointIds])
        .returns<WebhookEndpointReviewRow[]>();

      for (const endpoint of endpoints ?? []) {
        endpointStatusById.set(endpoint.id, endpoint.status);
      }
    }

    for (const item of parsedWorkflows) {
      workflowByVersion.set(item.workflow.agent_version_id, {
        id: item.workflow.id,
        status: item.workflow.status,
        steps: item.definition.steps.map((step) => ({
          endpointId: step.endpointId ?? null,
          endpointStatus: step.endpointId ? endpointStatusById.get(step.endpointId) ?? null : null,
          label: step.label,
          type: step.type,
        })),
      });
    }

    const { data: creatorEndpoints } = await supabase
      .from("agent_version_creator_endpoints")
      .select("id,agent_version_id,endpoint_id,status")
      .in("agent_version_id", reviewVersionIds)
      .returns<CreatorEndpointReviewRow[]>();
    const creatorEndpointIds = [...new Set((creatorEndpoints ?? []).map((endpoint) => endpoint.endpoint_id))];
    const creatorEndpointStatusById = new Map<string, string>();

    if (creatorEndpointIds.length > 0) {
      const { data: endpointRows } = await supabase
        .from("creator_api_endpoints")
        .select("id,status")
        .in("id", creatorEndpointIds)
        .returns<WebhookEndpointReviewRow[]>();

      for (const endpoint of endpointRows ?? []) {
        creatorEndpointStatusById.set(endpoint.id, endpoint.status);
      }
    }

    for (const endpointConfig of creatorEndpoints ?? []) {
      creatorEndpointByVersion.set(endpointConfig.agent_version_id, {
        endpointStatus: creatorEndpointStatusById.get(endpointConfig.endpoint_id) ?? null,
        id: endpointConfig.id,
        status: endpointConfig.status,
      });
    }

    const { data: securityReviews } = await supabase
      .from("security_reviews")
      .select("id,agent_version_id,status")
      .in("agent_version_id", reviewVersionIds)
      .order("created_at", { ascending: false })
      .returns<SecurityReviewSummaryRow[]>();

    for (const review of securityReviews ?? []) {
      if (review.agent_version_id && !securityReviewByVersion.has(review.agent_version_id)) {
        securityReviewByVersion.set(review.agent_version_id, {
          id: review.id,
          status: review.status,
        });
      }
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
    queue: agentRows.map((agent) => {
      const versionId = reviewVersionIdByAgent.get(agent.id) ?? null;
      const contract = versionId ? contractByVersion.get(versionId) ?? normalizeAgentContract({}) : normalizeAgentContract({});

      return {
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
        resubmissionChangelog: versionId ? changelogByVersion.get(versionId) ?? null : null,
        contract,
        runtimeSetting: runtimeSettingsByType.get(contract.runtimeType) ?? null,
        workflow: versionId ? workflowByVersion.get(versionId) ?? null : null,
        creatorEndpoint: versionId ? creatorEndpointByVersion.get(versionId) ?? null : null,
        securityReview: versionId ? securityReviewByVersion.get(versionId) ?? null : null,
        manifest: versionId ? manifestByVersion.get(versionId) ?? null : null,
        manifestError: versionId ? manifestErrorByVersion.get(versionId) ?? null : null,
        latestAdminReview: latestReviewsByAgent.get(agent.id) ?? null,
      };
    }),
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

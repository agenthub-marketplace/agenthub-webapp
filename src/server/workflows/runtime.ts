import "server-only";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
import { serverEnv } from "@/lib/env.server";
import { publicEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";

export type WorkflowStepType = "llm_step" | "webhook_step";

export type WorkflowStepDefinition = {
  endpointId: string | null;
  key: string;
  label: string;
  type: WorkflowStepType;
};

export type WorkflowDefinition = {
  steps: WorkflowStepDefinition[];
  version: 1;
};

export type WorkflowRuntimeError = {
  error: string;
  statusCode: number;
};

type AgentRow = {
  description: string;
  id: string;
  name: string;
  slug: string;
  status: string;
  summary: string;
};

type RentalRunRow = {
  agent_id: string;
  agent_version_id: string | null;
  agents: AgentRow | AgentRow[] | null;
  id: string;
  status: string;
  user_id: string;
};

type AgentVersionRow = {
  capabilities: string[] | null;
  data_policy: unknown;
  deliverables: string[] | null;
  execution_mode: string | null;
  id: string;
  limitations: string[] | null;
  output_promise: unknown;
  required_inputs: string[] | null;
  runtime_type: string | null;
  setup_requirements: unknown;
  workspace_mode: string | null;
};

type RuntimeSettingRow = {
  enabled: boolean;
  run_enabled: boolean;
};

type WorkflowRow = {
  definition: unknown;
  id: string;
  status: string;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function fail(statusCode: number, error: string): WorkflowRuntimeError {
  return { error, statusCode };
}

function stableKey(index: number, label: string) {
  const normalized = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `workflow_${index + 1}_${normalized || createHash("sha1").update(label).digest("hex").slice(0, 8)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseWorkflowStepsText(input: string, endpointId?: string | null): WorkflowDefinition | null {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || lines.length > serverEnv.workflowMaxSteps) {
    return null;
  }

  const steps: Array<WorkflowStepDefinition | null> = lines.map((line, index) => {
    const match = /^(llm|webhook)\s*:\s*(.+)$/i.exec(line);

    if (!match) {
      return null;
    }

    const type = match[1].toLowerCase() === "webhook" ? "webhook_step" : "llm_step";
    const label = match[2].trim().slice(0, 120);

    if (!label) {
      return null;
    }

    return {
      endpointId: type === "webhook_step" ? endpointId ?? null : null,
      key: stableKey(index, label),
      label,
      type,
    } satisfies WorkflowStepDefinition;
  });

  if (steps.some((step) => !step)) {
    return null;
  }

  const normalizedSteps = steps.filter((step): step is WorkflowStepDefinition => step !== null);
  const webhookCount = normalizedSteps.filter((step) => step.type === "webhook_step").length;

  if (webhookCount > serverEnv.workflowMaxWebhookSteps) {
    return null;
  }

  if (webhookCount > 0 && !endpointId) {
    return null;
  }

  return {
    steps: normalizedSteps,
    version: 1,
  };
}

export function normalizeWorkflowDefinition(value: unknown): WorkflowDefinition | null {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.steps)) {
    return null;
  }

  if (value.steps.length < 2 || value.steps.length > serverEnv.workflowMaxSteps) {
    return null;
  }

  const steps: Array<WorkflowStepDefinition | null> = value.steps.map((step, index) => {
    if (!isObject(step)) {
      return null;
    }

    const type = step.type === "webhook_step" ? "webhook_step" : step.type === "llm_step" ? "llm_step" : null;
    const label = typeof step.label === "string" ? step.label.trim().slice(0, 120) : "";
    const key = typeof step.key === "string" && step.key.trim() ? step.key.trim().slice(0, 80) : stableKey(index, label);
    const endpointId = typeof step.endpointId === "string" ? step.endpointId : typeof step.endpoint_id === "string" ? step.endpoint_id : null;

    if (!type || !label) {
      return null;
    }

    if (type === "webhook_step" && !endpointId) {
      return null;
    }

    return {
      endpointId: type === "webhook_step" ? endpointId : null,
      key,
      label,
      type,
    } satisfies WorkflowStepDefinition;
  });

  if (steps.some((step) => !step)) {
    return null;
  }

  const normalizedSteps = steps.filter((step): step is WorkflowStepDefinition => step !== null);
  const webhookCount = normalizedSteps.filter((step) => step.type === "webhook_step").length;

  if (webhookCount > serverEnv.workflowMaxWebhookSteps) {
    return null;
  }

  return {
    steps: normalizedSteps,
    version: 1,
  };
}

export function isSafeWorkflowEndpointUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }

  if (url.username || url.password) {
    return false;
  }

  const hostname = normalizeHostname(url.hostname);

  return !isBlockedWorkflowHostname(hostname);
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function ipv4FromHexGroups(high: string, low: string) {
  const highValue = Number.parseInt(high, 16);
  const lowValue = Number.parseInt(low, 16);

  if (!Number.isInteger(highValue) || !Number.isInteger(lowValue)) {
    return null;
  }

  return [
    (highValue >> 8) & 255,
    highValue & 255,
    (lowValue >> 8) & 255,
    lowValue & 255,
  ].join(".");
}

function ipv4MappedAddress(hostname: string) {
  const dottedMatch = /(?:^|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(hostname);

  if (dottedMatch) {
    return dottedMatch[1];
  }

  const hexMatch = /(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(hostname);

  if (hexMatch) {
    return ipv4FromHexGroups(hexMatch[1], hexMatch[2]);
  }

  return null;
}

function isBlockedWorkflowHostname(hostname: string) {
  const mappedIpv4 = ipv4MappedAddress(hostname);

  if (mappedIpv4) {
    return isBlockedWorkflowHostname(mappedIpv4);
  }

  return !(
    hostname !== "localhost" &&
    hostname !== "0.0.0.0" &&
    hostname !== "::" &&
    hostname !== "::1" &&
    !hostname.startsWith("127.") &&
    !hostname.startsWith("10.") &&
    !hostname.startsWith("169.254.") &&
    !hostname.startsWith("192.168.") &&
    !hostname.startsWith("100.64.") &&
    !hostname.startsWith("198.18.") &&
    !/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) &&
    !/^(22[4-9]|23\d)\./.test(hostname) &&
    !/^24\d\./.test(hostname) &&
    !/^25[0-5]\./.test(hostname) &&
    !hostname.startsWith("fc") &&
    !hostname.startsWith("fd") &&
    !hostname.startsWith("fe80:") &&
    !hostname.startsWith("::ffff:127.") &&
    !hostname.startsWith("::ffff:10.") &&
    !hostname.startsWith("::ffff:169.254.") &&
    !hostname.startsWith("::ffff:192.168.")
  );
}

export async function resolveSafeWorkflowEndpointUrl(value: string) {
  if (!isSafeWorkflowEndpointUrl(value)) {
    return null;
  }

  const url = new URL(value);
  const hostname = normalizeHostname(url.hostname);
  const port = url.port ? Number.parseInt(url.port, 10) : 443;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    if (isBlockedWorkflowHostname(hostname)) {
      return null;
    }

    return {
      addresses: [
        {
          address: hostname,
          family: hostname.includes(":") ? 6 : 4,
        },
      ],
      hostname,
      port,
      url,
    };
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    const safeAddresses = addresses.filter((address) => !isBlockedWorkflowHostname(normalizeHostname(address.address)));

    if (addresses.length === 0 || safeAddresses.length !== addresses.length) {
      return null;
    }

    return {
      addresses: safeAddresses,
      hostname,
      port,
      url,
    };
  } catch {
    return null;
  }
}

export async function isSafeResolvedWorkflowEndpointUrl(value: string) {
  return Boolean(await resolveSafeWorkflowEndpointUrl(value));
}

export async function isCreatorWorkflowRuntimeEnabled(creatorId: string) {
  const supabase = createSupabaseServiceClient();

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

export async function isWorkflowRuntimeRunEnabled() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", "workflow_automation")
    .maybeSingle<RuntimeSettingRow>();

  return !error && Boolean(data?.enabled && data.run_enabled);
}

export async function loadWorkflowRuntimeContext(input: {
  profileId: string;
  rentalId: string;
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
}): Promise<
  | {
      context: {
        agent: AgentRow;
        contract: AgentContract;
        rental: RentalRunRow;
        version: AgentVersionRow;
        workflow: WorkflowRow & { definition: WorkflowDefinition };
      };
      error: null;
    }
  | { context: null; error: WorkflowRuntimeError }
> {
  const { data: rental, error: rentalError } = await input.supabase
    .from("rental_requests")
    .select("id,user_id,agent_id,agent_version_id,status,agents!rental_requests_agent_id_fkey(id,name,slug,summary,description,status)")
    .eq("id", input.rentalId)
    .maybeSingle<RentalRunRow>();

  const agent = readSingle(rental?.agents ?? null);

  if (rentalError || !rental || !agent || rental.user_id !== input.profileId) {
    return { context: null, error: fail(404, "access-not-found") };
  }

  if (!(ACCESS_OPEN_STATUSES as readonly string[]).includes(rental.status)) {
    return { context: null, error: fail(403, "access-not-active") };
  }

  if (!rental.agent_version_id) {
    return { context: null, error: fail(403, "missing-agent-version") };
  }

  if (agent.status !== "approved") {
    return { context: null, error: fail(403, agent.status === "archived" ? "agent-archived" : "agent-not-approved") };
  }

  const { data: version, error: versionError } = await input.supabase
    .from("agent_versions")
    .select("id,capabilities,required_inputs,deliverables,limitations,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy")
    .eq("id", rental.agent_version_id)
    .eq("agent_id", rental.agent_id)
    .maybeSingle<AgentVersionRow>();

  if (versionError || !version) {
    return { context: null, error: fail(403, "agent-version-not-found") };
  }

  const contract = normalizeAgentContract({
    dataPolicy: version.data_policy,
    executionMode: version.execution_mode,
    outputPromise: version.output_promise,
    runtimeType: version.runtime_type,
    setupRequirements: version.setup_requirements,
    workspaceMode: version.workspace_mode,
  });

  if (contract.runtimeType !== "workflow_automation" || contract.executionMode !== "llm_prompt") {
    return { context: null, error: fail(403, "agent-not-workflow-enabled") };
  }

  const { data: runtimeSetting, error: runtimeSettingError } = await input.supabase
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", contract.runtimeType)
    .maybeSingle<RuntimeSettingRow>();

  if (runtimeSettingError || !runtimeSetting?.enabled || !runtimeSetting.run_enabled) {
    return { context: null, error: fail(403, "workflow-runtime-disabled") };
  }

  const { data: workflow, error: workflowError } = await input.supabase
    .from("agent_version_workflows")
    .select("id,status,definition")
    .eq("agent_version_id", rental.agent_version_id)
    .eq("agent_id", rental.agent_id)
    .maybeSingle<WorkflowRow>();

  const definition = normalizeWorkflowDefinition(workflow?.definition);

  if (workflowError || !workflow || workflow.status !== "approved" || !definition) {
    return { context: null, error: fail(403, "workflow-not-approved") };
  }

  return {
    context: {
      agent,
      contract,
      rental,
      version,
      workflow: {
        ...workflow,
        definition,
      },
    },
    error: null,
  };
}

export async function triggerWorkflowWorker(runId: string) {
  if (!publicEnv.supabaseUrl || !serverEnv.workflowWorkerSecret) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`${publicEnv.supabaseUrl}/functions/v1/agent-workflow-worker`, {
      body: JSON.stringify({ runId }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-agenthub-worker-secret": serverEnv.workflowWorkerSecret,
      },
      method: "POST",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

import "server-only";

import { createHmac } from "node:crypto";
import { request as httpsRequest } from "node:https";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
import { serverEnv } from "@/lib/env.server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";
import { isSafeResolvedWorkflowEndpointUrl, resolveSafeWorkflowEndpointUrl } from "@/server/workflows/runtime";

export type CreatorEndpointRuntimeError = {
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

type EndpointConfigRow = {
  creator_api_endpoints: CreatorApiEndpointRow | CreatorApiEndpointRow[] | null;
  endpoint_id: string;
  id: string;
  request_schema: unknown;
  status: string;
};

type CreatorApiEndpointRow = {
  endpoint_url: string;
  id: string;
  name: string;
  status: string;
};

export type CreatorEndpointRuntimeContext = {
  agent: AgentRow;
  contract: AgentContract;
  endpoint: CreatorApiEndpointRow;
  endpointConfig: EndpointConfigRow;
  rental: RentalRunRow;
  version: AgentVersionRow;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function fail(statusCode: number, error: string): CreatorEndpointRuntimeError {
  return { error, statusCode };
}

async function postJsonToPinnedEndpoint(input: {
  body: string;
  endpointUrl: string;
  headers: Record<string, string>;
  maxResponseChars: number;
  timeoutMs: number;
}) {
  const resolved = await resolveSafeWorkflowEndpointUrl(input.endpointUrl);

  if (!resolved) {
    return { error: "creator-endpoint-url-not-safe", text: null };
  }

  const bodyBuffer = Buffer.from(input.body);
  let lastError: Error | null = null;

  for (const resolvedAddress of resolved.addresses) {
    try {
      const responseText = await new Promise<string>((resolve, reject) => {
        const request = httpsRequest(
          {
            family: resolvedAddress.family,
            headers: {
              ...input.headers,
              "Accept-Encoding": "identity",
              "Content-Length": bodyBuffer.byteLength.toString(),
              Host: resolved.url.host,
            },
            hostname: resolved.hostname,
            lookup: (_hostname, _options, callback) => callback(null, resolvedAddress.address, resolvedAddress.family),
            method: "POST",
            path: `${resolved.url.pathname}${resolved.url.search}`,
            port: resolved.port,
            servername: resolved.hostname,
            timeout: input.timeoutMs,
          },
          (response) => {
            const statusCode = response.statusCode ?? 0;

            if (statusCode >= 300 && statusCode < 400) {
              response.resume();
              reject(new Error("creator-endpoint-redirect-blocked"));
              return;
            }

            if (statusCode < 200 || statusCode >= 300) {
              response.resume();
              reject(new Error(`creator-endpoint-http-${statusCode}`));
              return;
            }

            const contentLength = Number(response.headers["content-length"]);

            if (Number.isFinite(contentLength) && contentLength > input.maxResponseChars) {
              response.destroy(new Error("creator-endpoint-response-too-large"));
              return;
            }

            const chunks: Buffer[] = [];
            let totalBytes = 0;

            response.on("data", (chunk: Buffer) => {
              totalBytes += chunk.byteLength;

              if (totalBytes > input.maxResponseChars) {
                response.destroy(new Error("creator-endpoint-response-too-large"));
                return;
              }

              chunks.push(chunk);
            });
            response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            response.on("error", reject);
          },
        );

        request.on("timeout", () => request.destroy(new Error("creator-endpoint-timeout-or-network")));
        request.on("error", reject);
        request.end(bodyBuffer);
      });

      return { error: null, text: responseText };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("creator-endpoint-timeout-or-network");
    }
  }

  return { error: lastError?.message || "creator-endpoint-timeout-or-network", text: null };
}

export async function isCreatorEndpointRuntimeRunEnabled() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", "creator_endpoint")
    .maybeSingle<RuntimeSettingRow>();

  return !error && Boolean(data?.enabled && data.run_enabled);
}

export async function isCreatorEndpointRuntimeEnabled(creatorId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("creator_runtime_access")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("runtime_type", "creator_endpoint")
    .eq("enabled", true)
    .limit(1);

  return !error && Boolean(data?.length);
}

export async function loadCreatorEndpointRuntimeContext(input: {
  profileId: string;
  rentalId: string;
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
}): Promise<
  | { context: CreatorEndpointRuntimeContext; error: null }
  | { context: null; error: CreatorEndpointRuntimeError }
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

  if (contract.runtimeType !== "creator_endpoint" || contract.executionMode !== "llm_prompt") {
    return { context: null, error: fail(403, "agent-not-endpoint-enabled") };
  }

  if (contract.dataPolicy.requires_files || contract.dataPolicy.external_tools.length > 0) {
    return { context: null, error: fail(403, "agent-requires-unsupported-tools") };
  }

  const { data: runtimeSetting, error: runtimeSettingError } = await input.supabase
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", contract.runtimeType)
    .maybeSingle<RuntimeSettingRow>();

  if (runtimeSettingError || !runtimeSetting?.enabled || !runtimeSetting.run_enabled) {
    return { context: null, error: fail(403, "creator-endpoint-runtime-disabled") };
  }

  const { data: endpointConfig, error: endpointConfigError } = await input.supabase
    .from("agent_version_creator_endpoints")
    .select("id,endpoint_id,status,request_schema,creator_api_endpoints!agent_version_creator_endpoints_endpoint_id_fkey(id,name,endpoint_url,status)")
    .eq("agent_version_id", rental.agent_version_id)
    .eq("agent_id", rental.agent_id)
    .maybeSingle<EndpointConfigRow>();

  const endpoint = readSingle(endpointConfig?.creator_api_endpoints ?? null);

  if (endpointConfigError || !endpointConfig || endpointConfig.status !== "approved" || !endpoint) {
    return { context: null, error: fail(403, "creator-endpoint-not-approved") };
  }

  if (endpoint.status !== "approved") {
    return { context: null, error: fail(403, "creator-endpoint-not-approved") };
  }

  if (!(await isSafeResolvedWorkflowEndpointUrl(endpoint.endpoint_url))) {
    return { context: null, error: fail(403, "creator-endpoint-url-not-safe") };
  }

  return {
    context: {
      agent,
      contract,
      endpoint,
      endpointConfig,
      rental,
      version,
    },
    error: null,
  };
}

export function signCreatorEndpointPayload(body: string) {
  if (!serverEnv.creatorEndpointSigningSecret) {
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", serverEnv.creatorEndpointSigningSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return {
    signature,
    timestamp,
  };
}

export async function callCreatorEndpoint(input: {
  body: Record<string, unknown>;
  endpointUrl: string;
}) {
  const body = JSON.stringify(input.body);
  const signed = signCreatorEndpointPayload(body);

  if (!signed) {
    return { error: "creator-endpoint-signing-secret-missing", outputText: null };
  }

  try {
    const responseBody = await postJsonToPinnedEndpoint({
      body,
      endpointUrl: input.endpointUrl,
      headers: {
        "Content-Type": "application/json",
        "x-agenthub-signature": signed.signature,
        "x-agenthub-timestamp": signed.timestamp,
      },
      maxResponseChars: serverEnv.creatorEndpointMaxResponseChars,
      timeoutMs: serverEnv.creatorEndpointTimeoutMs,
    });

    if (responseBody.error || responseBody.text === null) {
      return { error: responseBody.error ?? "creator-endpoint-failed", outputText: null };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(responseBody.text);
    } catch {
      return { error: "creator-endpoint-invalid-json", outputText: null };
    }

    const outputText =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as { output_text?: unknown }).output_text === "string"
        ? (parsed as { output_text: string }).output_text.trim()
        : "";

    if (!outputText) {
      return { error: "creator-endpoint-missing-output", outputText: null };
    }

    return {
      error: null,
      outputText: outputText.slice(0, serverEnv.creatorEndpointMaxResponseChars),
    };
  } catch {
    return { error: "creator-endpoint-timeout-or-network", outputText: null };
  }
}

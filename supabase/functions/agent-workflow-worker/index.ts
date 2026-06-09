import { createClient } from "npm:@supabase/supabase-js@2";

type ClaimedRun = {
  agent_id: string;
  agent_run_id: string;
  agent_version_id: string;
  id: string;
  input_text: string;
  rental_request_id: string;
  user_id: string;
  workflow_id: string;
};

type WorkflowStep = {
  endpoint_id: string | null;
  id: string;
  output_text: string | null;
  step_index: number;
  step_key: string;
  step_label: string;
  status: "queued" | "running" | "succeeded" | "failed" | "skipped";
  step_type: "llm_step" | "webhook_step";
};

type WorkflowEndpoint = {
  endpoint_url: string;
  id: string;
  name: string;
  status: string;
};

type AgentRow = {
  description: string;
  name: string;
  status: string;
  summary: string;
};

type RentalRow = {
  status: string;
  user_id: string;
};

type VersionRow = {
  capabilities: string[] | null;
  deliverables: string[] | null;
  limitations: string[] | null;
  output_promise: unknown;
  required_inputs: string[] | null;
};

const corsHeaders = {
  "content-type": "application/json",
};

function env(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim().length > 0 ? value : undefined;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders,
    status,
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function readRequestedRunId(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const runId = typeof body.runId === "string" ? body.runId.trim() : "";

    if (!runId) {
      return null;
    }

    return isUuid(runId) ? runId : "invalid";
  } catch {
    return null;
  }
}

function truncate(value: string, max = 12_000) {
  return value.trim().slice(0, max);
}

function isOpenAccessStatus(status: string) {
  return ["active", "accepted", "in_progress", "delivered"].includes(status);
}

function isSafeWebhookUrl(value: string) {
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

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  const mappedIpv4 = ipv4MappedAddress(hostname);

  if (mappedIpv4) {
    return isSafeWebhookUrl(`https://${mappedIpv4}`);
  }

  return !(
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::" ||
    hostname === "::1" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("169.254.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("100.64.") ||
    hostname.startsWith("198.18.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    /^(22[4-9]|23\d)\./.test(hostname) ||
    /^24\d\./.test(hostname) ||
    /^25[0-5]\./.test(hostname) ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("::ffff:127.") ||
    hostname.startsWith("::ffff:10.") ||
    hostname.startsWith("::ffff:169.254.") ||
    hostname.startsWith("::ffff:192.168.")
  );
}

function ipv4MappedAddress(hostname: string) {
  const dottedMatch = /(?:^|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(hostname);

  if (dottedMatch) {
    return dottedMatch[1];
  }

  const hexMatch = /(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(hostname);

  if (!hexMatch) {
    return null;
  }

  const highValue = Number.parseInt(hexMatch[1], 16);
  const lowValue = Number.parseInt(hexMatch[2], 16);

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

type ResolvedWebhookUrl = {
  addresses: string[];
  hostname: string;
  port: number;
  url: URL;
};

async function resolveSafeWebhookUrl(value: string): Promise<ResolvedWebhookUrl | null> {
  if (!isSafeWebhookUrl(value)) {
    return null;
  }

  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const port = url.port ? Number.parseInt(url.port, 10) : 443;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    return {
      addresses: [hostname],
      hostname,
      port,
      url,
    };
  }

  const addresses = await Promise.all([
    Deno.resolveDns(hostname, "A").catch(() => [] as string[]),
    Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]),
  ]);
  const resolvedAddresses = addresses.flat();
  const safeAddresses = resolvedAddresses.filter((address) => isSafeWebhookUrl(`https://${address.includes(":") ? `[${address}]` : address}`));

  if (resolvedAddresses.length === 0 || safeAddresses.length !== resolvedAddresses.length) {
    return null;
  }

  return {
    addresses: safeAddresses,
    hostname,
    port,
    url,
  };
}

async function isSafeResolvedWebhookUrl(value: string) {
  return Boolean(await resolveSafeWebhookUrl(value));
}

function concatBytes(chunks: Uint8Array[], totalLength: number) {
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}

function indexOfCrlf(bytes: Uint8Array, start: number) {
  for (let index = start; index < bytes.length - 1; index += 1) {
    if (bytes[index] === 13 && bytes[index + 1] === 10) {
      return index;
    }
  }

  return -1;
}

function findHeaderEnd(bytes: Uint8Array) {
  for (let index = 0; index < bytes.length - 3; index += 1) {
    if (bytes[index] === 13 && bytes[index + 1] === 10 && bytes[index + 2] === 13 && bytes[index + 3] === 10) {
      return index;
    }
  }

  return -1;
}

function decodeChunkedBody(bytes: Uint8Array, maxBytes: number) {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  let offset = 0;

  while (offset < bytes.length) {
    const lineEnd = indexOfCrlf(bytes, offset);

    if (lineEnd < 0) {
      throw new Error("webhook-invalid-chunked-response");
    }

    const sizeLine = new TextDecoder().decode(bytes.slice(offset, lineEnd)).split(";", 1)[0]?.trim() ?? "";
    const size = Number.parseInt(sizeLine, 16);

    if (!Number.isFinite(size) || size < 0) {
      throw new Error("webhook-invalid-chunked-response");
    }

    offset = lineEnd + 2;

    if (size === 0) {
      break;
    }

    const chunkEnd = offset + size;

    if (chunkEnd > bytes.length) {
      throw new Error("webhook-invalid-chunked-response");
    }

    totalLength += size;

    if (totalLength > maxBytes) {
      throw new Error("webhook-response-too-large");
    }

    chunks.push(bytes.slice(offset, chunkEnd));
    offset = chunkEnd + 2;
  }

  return concatBytes(chunks, totalLength);
}

function parsePinnedHttpsResponse(bytes: Uint8Array, maxBytes: number) {
  const headerEnd = findHeaderEnd(bytes);

  if (headerEnd < 0) {
    throw new Error("webhook-invalid-response");
  }

  const headerText = new TextDecoder().decode(bytes.slice(0, headerEnd));
  const [statusLine, ...headerLines] = headerText.split("\r\n");
  const statusCode = Number.parseInt(statusLine?.split(/\s+/)[1] ?? "", 10);

  if (!Number.isInteger(statusCode)) {
    throw new Error("webhook-invalid-response");
  }

  if (statusCode >= 300 && statusCode < 400) {
    throw new Error("webhook-redirect-blocked");
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`webhook-http-${statusCode}`);
  }

  const headers = new Map<string, string>();

  for (const line of headerLines) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex > 0) {
      headers.set(line.slice(0, separatorIndex).trim().toLowerCase(), line.slice(separatorIndex + 1).trim().toLowerCase());
    }
  }

  const contentLength = Number(headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("webhook-response-too-large");
  }

  const bodyBytes = bytes.slice(headerEnd + 4);
  const decodedBody = headers.get("transfer-encoding")?.includes("chunked") ? decodeChunkedBody(bodyBytes, maxBytes) : bodyBytes;

  if (decodedBody.byteLength > maxBytes) {
    throw new Error("webhook-response-too-large");
  }

  return new TextDecoder().decode(decodedBody);
}

async function postJsonToPinnedWebhook(input: {
  body: string;
  endpointUrl: string;
  headers: Record<string, string>;
  maxResponseBytes: number;
  timeoutMs: number;
}) {
  const resolved = await resolveSafeWebhookUrl(input.endpointUrl);

  if (!resolved) {
    throw new Error("webhook-endpoint-unsafe");
  }

  const bodyBytes = new TextEncoder().encode(input.body);
  const hostHeader = resolved.url.port ? `${resolved.hostname}:${resolved.port}` : resolved.hostname;
  const path = `${resolved.url.pathname}${resolved.url.search}`;
  let lastError: Error | null = null;

  for (const address of resolved.addresses) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const connection = await Promise.race([
        Deno.connectTls({
          hostname: address,
          port: resolved.port,
          serverName: resolved.hostname,
        }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => reject(new DOMException("Timeout", "AbortError")), { once: true });
        }),
      ]);

      try {
        const headerLines = [
          `POST ${path || "/"} HTTP/1.1`,
          `Host: ${hostHeader}`,
          "Connection: close",
          "Accept-Encoding: identity",
          `Content-Length: ${bodyBytes.byteLength}`,
          ...Object.entries(input.headers).map(([key, value]) => `${key}: ${value}`),
          "",
          "",
        ];

        await connection.write(new TextEncoder().encode(headerLines.join("\r\n")));
        await connection.write(bodyBytes);

        const chunks: Uint8Array[] = [];
        let totalLength = 0;
        const buffer = new Uint8Array(4096);

        while (true) {
          const bytesRead = await connection.read(buffer);

          if (bytesRead === null) {
            break;
          }

          totalLength += bytesRead;

          if (totalLength > input.maxResponseBytes + 65536) {
            throw new Error("webhook-response-too-large");
          }

          chunks.push(buffer.slice(0, bytesRead));
        }

        return parsePinnedHttpsResponse(concatBytes(chunks, totalLength), input.maxResponseBytes);
      } finally {
        try {
          connection.close();
        } catch {
          // Ignore close errors after network failures.
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new Error("webhook-timeout");
      } else {
        lastError = error instanceof Error ? error : new Error("webhook-network-error");
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("webhook-network-error");
}

type OpenAIContentPart = {
  text?: unknown;
};

type OpenAIOutputItem = {
  content?: OpenAIContentPart[];
};

type OpenAIResponseBody = {
  output?: OpenAIOutputItem[];
  output_text?: unknown;
};

function outputFromOpenAI(data: OpenAIResponseBody) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text: unknown): text is string => typeof text === "string" && text.trim().length > 0) ?? [];

  return chunks.join("\n\n").trim();
}

async function signWebhookPayload(secret: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function runOpenAI(input: {
  agent: AgentRow;
  maxOutputTokens: number;
  model: string;
  openaiApiKey: string;
  previousOutputs: string[];
  step: WorkflowStep;
  userInput: string;
  version: VersionRow;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: [
              {
                text:
                  "You are AgentHub workflow automation runtime v0. " +
                  "Execute only the current internal text step. Do not browse the web, call tools, or invent missing facts. " +
                  "Use the approved agent description, user input, and previous step outputs only.",
                type: "input_text",
              },
            ],
            role: "developer",
          },
          {
            content: [
              {
                text: JSON.stringify(
                  {
                    agent: {
                      description: input.agent.description,
                      name: input.agent.name,
                      summary: input.agent.summary,
                    },
                    current_step: {
                      key: input.step.step_key,
                      label: input.step.step_label,
                    },
                    previous_outputs: input.previousOutputs,
                    user_input: input.userInput,
                    version: {
                      capabilities: input.version.capabilities ?? [],
                      deliverables: input.version.deliverables ?? [],
                      limitations: input.version.limitations ?? [],
                      output_promise: input.version.output_promise,
                      required_inputs: input.version.required_inputs ?? [],
                    },
                  },
                  null,
                  2,
                ),
                type: "input_text",
              },
            ],
            role: "user",
          },
        ],
        max_output_tokens: input.maxOutputTokens,
        model: input.model,
        stream: false,
        tools: [],
      }),
      headers: {
        authorization: `Bearer ${input.openaiApiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.type || data?.error?.message || "openai-request-failed");
    }

    const output = outputFromOpenAI(data);

    if (!output) {
      throw new Error("openai-empty-output");
    }

    return {
      output: truncate(output),
      inputTokens: data?.usage?.input_tokens ?? null,
      outputTokens: data?.usage?.output_tokens ?? null,
      totalTokens: data?.usage?.total_tokens ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("openai-timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function callWebhook(input: {
  endpoint: WorkflowEndpoint;
  signingSecret: string;
  step: WorkflowStep;
  timeoutMs: number;
  workflowRun: ClaimedRun;
  previousOutputs: string[];
}) {
  if (input.endpoint.status !== "approved") {
    throw new Error("webhook-endpoint-not-approved");
  }

  if (!(await isSafeResolvedWebhookUrl(input.endpoint.endpoint_url))) {
    throw new Error("webhook-endpoint-unsafe");
  }

  const payload = {
    agent_id: input.workflowRun.agent_id,
    agent_run_id: input.workflowRun.agent_run_id,
    agent_version_id: input.workflowRun.agent_version_id,
    previous_outputs: input.previousOutputs.map((output) => output.slice(0, 4000)),
    rental_request_id: input.workflowRun.rental_request_id,
    run_id: input.workflowRun.id,
    step: {
      index: input.step.step_index,
      key: input.step.step_key,
      label: input.step.step_label,
    },
    user_input: input.workflowRun.input_text,
  };
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signWebhookPayload(input.signingSecret, timestamp, body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const text = await postJsonToPinnedWebhook({
      body,
      endpointUrl: input.endpoint.endpoint_url,
      headers: {
        "content-type": "application/json",
        "x-agenthub-signature": signature,
        "x-agenthub-timestamp": timestamp,
      },
      maxResponseBytes: 12_000,
      timeoutMs: input.timeoutMs,
    });

    try {
      const data = JSON.parse(text);
      const output =
        typeof data.output === "string"
          ? data.output
          : typeof data.output_text === "string"
            ? data.output_text
            : typeof data.result === "string"
              ? data.result
              : JSON.stringify(data);

      return truncate(output);
    } catch {
      return truncate(text);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("webhook-timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request: Request) => {
  const workerSecret = env("WORKFLOW_WORKER_SECRET");
  const providedSecret = request.headers.get("x-agenthub-worker-secret");

  if (!workerSecret || providedSecret !== workerSecret) {
    return json(401, { error: "unauthorized" });
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const openaiApiKey = env("OPENAI_API_KEY");
  const webhookSigningSecret = env("WORKFLOW_WEBHOOK_SIGNING_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !openaiApiKey) {
    return json(500, { error: "worker-env-missing" });
  }

  const requestedRunId = await readRequestedRunId(request);

  if (requestedRunId === "invalid") {
    return json(400, { error: "invalid-run-id" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const workerId = `edge-${crypto.randomUUID()}`;
  const { data: claimedRuns, error: claimError } = await supabase.rpc("claim_next_agent_workflow_run", {
    p_agent_run_id: requestedRunId,
    p_lock_seconds: 120,
    p_worker_id: workerId,
  });

  if (claimError) {
    return json(500, { error: "workflow-claim-failed" });
  }

  const workflowRun = (claimedRuns?.[0] ?? null) as ClaimedRun | null;

  if (!workflowRun) {
    return json(200, { status: "idle" });
  }

  const completedAt = () => new Date().toISOString();
  const failRun = async (errorCode: string, stepId?: string) => {
    const now = completedAt();

    if (stepId) {
      await supabase
        .from("agent_workflow_steps")
        .update({ completed_at: now, error_code: errorCode, status: "failed" })
        .eq("id", stepId);
    }

    await supabase
      .from("agent_workflow_runs")
      .update({
        completed_at: now,
        error_code: errorCode,
        locked_until: null,
        status: "failed",
      })
      .eq("id", workflowRun.id);

    await supabase
      .from("agent_runs")
      .update({
        completed_at: now,
        error_code: errorCode,
        status: "failed",
      })
      .eq("id", workflowRun.agent_run_id)
      .eq("status", "running");
  };

  try {
    const [{ data: steps, error: stepsError }, { data: agent }, { data: rental }, { data: version }] = await Promise.all([
      supabase
        .from("agent_workflow_steps")
        .select("id,step_index,step_key,step_label,step_type,endpoint_id,status,output_text")
        .eq("workflow_run_id", workflowRun.id)
        .order("step_index", { ascending: true }),
      supabase
        .from("agents")
        .select("name,summary,description,status")
        .eq("id", workflowRun.agent_id)
        .maybeSingle<AgentRow>(),
      supabase
        .from("rental_requests")
        .select("status,user_id")
        .eq("id", workflowRun.rental_request_id)
        .eq("user_id", workflowRun.user_id)
        .maybeSingle<RentalRow>(),
      supabase
        .from("agent_versions")
        .select("capabilities,required_inputs,deliverables,limitations,output_promise")
        .eq("id", workflowRun.agent_version_id)
        .maybeSingle<VersionRow>(),
    ]);

    if (stepsError || !steps?.length || !agent || !rental || !version) {
      await failRun("workflow-context-load-failed");
      return json(500, { error: "workflow-context-load-failed", runId: workflowRun.agent_run_id });
    }

    if (agent.status !== "approved") {
      await failRun("agent-not-approved");
      return json(403, { error: "agent-not-approved", runId: workflowRun.agent_run_id });
    }

    if (!isOpenAccessStatus(rental.status)) {
      await failRun("access-not-active");
      return json(403, { error: "access-not-active", runId: workflowRun.agent_run_id });
    }

    const previousOutputs: string[] = [];
    const maxOutputTokens = Number.parseInt(env("LLM_RUN_MAX_OUTPUT_TOKENS") ?? "900", 10);
    const model = env("OPENAI_MODEL") ?? "gpt-5.4-mini";
    const timeoutMs = Math.min(15_000, Math.max(1_000, Number.parseInt(env("WORKFLOW_STEP_TIMEOUT_MS") ?? "15000", 10)));

    for (const step of steps as WorkflowStep[]) {
      if (step.status === "succeeded" && step.output_text) {
        previousOutputs.push(step.output_text);
        continue;
      }

      if (step.status !== "queued") {
        await failRun("workflow-step-replay-unsafe", step.id);
        return json(409, { error: "workflow-step-replay-unsafe", runId: workflowRun.agent_run_id });
      }

      const startedAt = completedAt();

      const { data: claimedStep, error: claimStepError } = await supabase
        .from("agent_workflow_steps")
        .update({
          input_snapshot: {
            previous_output_count: previousOutputs.length,
            previous_outputs_excerpt: previousOutputs.map((output) => output.slice(0, 1000)),
            user_input_excerpt: workflowRun.input_text.slice(0, 1000),
          },
          started_at: startedAt,
          status: "running",
        })
        .eq("id", step.id)
        .eq("status", "queued")
        .select("id")
        .maybeSingle<{ id: string }>();

      if (claimStepError || !claimedStep) {
        await failRun("workflow-step-claim-failed", step.id);
        return json(409, { error: "workflow-step-claim-failed", runId: workflowRun.agent_run_id });
      }

      await supabase
        .from("agent_workflow_runs")
        .update({
          current_step_index: step.step_index,
          locked_until: new Date(Date.now() + 120_000).toISOString(),
        })
        .eq("id", workflowRun.id);

      let output: string;

      try {
        if (step.step_type === "llm_step") {
          const result = await runOpenAI({
            agent,
            maxOutputTokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : 900,
            model,
            openaiApiKey,
            previousOutputs,
            step,
            userInput: workflowRun.input_text,
            version,
          });

          output = result.output;
        } else {
          if (!webhookSigningSecret) {
            throw new Error("workflow-webhook-signing-secret-missing");
          }

          const { data: endpoint, error: endpointError } = await supabase
            .from("creator_webhook_endpoints")
            .select("id,name,endpoint_url,status")
            .eq("id", step.endpoint_id)
            .maybeSingle<WorkflowEndpoint>();

          if (endpointError || !endpoint) {
            throw new Error("webhook-endpoint-not-found");
          }

          output = await callWebhook({
            endpoint,
            previousOutputs,
            signingSecret: webhookSigningSecret,
            step,
            timeoutMs,
            workflowRun,
          });
        }
      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 120) : "workflow-step-failed";
        await failRun(errorCode, step.id);
        return json(502, { error: errorCode, runId: workflowRun.agent_run_id });
      }

      previousOutputs.push(output);

      await supabase
        .from("agent_workflow_steps")
        .update({
          completed_at: completedAt(),
          output_text: output,
          status: "succeeded",
        })
        .eq("id", step.id);
    }

    const finalOutput = truncate(previousOutputs[previousOutputs.length - 1] ?? "");
    const now = completedAt();

    await supabase
      .from("agent_workflow_runs")
      .update({
        completed_at: now,
        final_output: finalOutput,
        locked_until: null,
        status: "succeeded",
      })
      .eq("id", workflowRun.id);

    await supabase
      .from("agent_runs")
      .update({
        completed_at: now,
        output_chars: finalOutput.length,
        output_text: finalOutput,
        status: "succeeded",
      })
      .eq("id", workflowRun.agent_run_id)
      .eq("status", "running");

    return json(200, {
      runId: workflowRun.agent_run_id,
      status: "succeeded",
      workflowRunId: workflowRun.id,
    });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 120) : "workflow-worker-failed";
    await failRun(errorCode);

    return json(500, {
      error: errorCode,
      runId: workflowRun.agent_run_id,
    });
  }
});

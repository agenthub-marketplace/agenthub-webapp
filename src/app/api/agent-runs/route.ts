import { NextResponse } from "next/server";

import { normalizeAgentContract } from "@/lib/agent-contract";
import { getCurrentProfile } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAgentTemplateByLabel } from "@/lib/agent-templates";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getWorkspaceActionLabels, type WorkspaceAction } from "@/lib/workspace-actions";
import { buildAgentRunPrompt } from "@/server/llm/prompt";
import { runOpenAIText } from "@/server/llm/openai";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  setup_requirements: unknown;
  workspace_mode: string | null;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function jsonError(statusCode: number, status: string, error: string) {
  return NextResponse.json({ error, status }, { status: statusCode });
}

async function parseRequest(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeInputText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length < 3 || trimmed.length > serverEnv.llmRunMaxInputChars) {
    return null;
  }

  return trimmed;
}

function normalizeActionIndex(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) {
    return null;
  }

  return value;
}

async function hasApprovedVersion(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  agentVersionId: string,
) {
  const { data, error } = await supabase
    .from("admin_reviews")
    .select("id")
    .eq("agent_version_id", agentVersionId)
    .eq("decision", "approved")
    .limit(1);

  return !error && Boolean(data?.length);
}

async function countRuns(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  filters: { rentalId?: string; since: string; userId: string },
) {
  let query = supabase
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", filters.userId)
    .gte("created_at", filters.since);

  if (filters.rentalId) {
    query = query.eq("rental_request_id", filters.rentalId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error("run-count-failed");
  }

  return count ?? 0;
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) {
    return "openai-request-failed";
  }

  if (
    [
      "openai-api-key-missing",
      "openai-empty-output",
      "openai-request-failed",
      "openai-timeout",
      "rate_limit_exceeded",
      "server_error",
    ].includes(error.message)
  ) {
    return error.message;
  }

  return "openai-request-failed";
}

function responseRun(input: {
  action: WorkspaceAction;
  completedAt: string | null;
  createdAt: string;
  errorCode?: string | null;
  id: string;
  inputText: string;
  outputText: string | null;
  status: "running" | "succeeded" | "failed";
}) {
  return {
    actionKey: input.action.key,
    actionLabel: input.action.label,
    completedAt: input.completedAt,
    createdAt: input.createdAt,
    errorCode: input.errorCode ?? null,
    id: input.id,
    inputText: input.inputText,
    outputText: input.outputText,
    status: input.status,
  };
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return jsonError(401, "unauthorized", "auth-required");
  }

  if (!serverEnv.llmRunsEnabled || !serverEnv.openaiApiKey) {
    return jsonError(403, "disabled", "llm-runs-disabled");
  }

  const body = await parseRequest(request);

  if (!body) {
    return jsonError(400, "failed", "invalid-json");
  }

  const rentalId = typeof body.rentalId === "string" ? body.rentalId : null;
  const actionIndex = normalizeActionIndex(body.actionIndex);
  const inputText = normalizeInputText(body.inputText);
  const locale = isLocale(body.locale) ? (body.locale as Locale) : null;

  if (!rentalId || actionIndex === null || !inputText || !locale) {
    return jsonError(400, "failed", "invalid-request");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return jsonError(500, "failed", "missing-service-client");
  }

  const { data: rental, error: rentalError } = await supabase
    .from("rental_requests")
    .select("id,user_id,agent_id,agent_version_id,status,agents!rental_requests_agent_id_fkey(id,name,slug,summary,description,status)")
    .eq("id", rentalId)
    .maybeSingle<RentalRunRow>();

  const agent = readSingle(rental?.agents ?? null);

  if (rentalError || !rental || !agent || rental.user_id !== profile.id) {
    return jsonError(404, "unauthorized", "access-not-found");
  }

  if (!(ACCESS_OPEN_STATUSES as readonly string[]).includes(rental.status)) {
    return jsonError(403, "not_eligible", "access-not-active");
  }

  if (!rental.agent_version_id) {
    return jsonError(403, "not_eligible", "missing-agent-version");
  }

  if (agent.status === "suspended" || agent.status === "archived") {
    return jsonError(403, "not_eligible", agent.status === "archived" ? "agent-archived" : "agent-suspended");
  }

  if (agent.status !== "approved" && !(await hasApprovedVersion(supabase, rental.agent_version_id))) {
    return jsonError(403, "not_eligible", "agent-not-approved");
  }

  const { data: version, error: versionError } = await supabase
    .from("agent_versions")
    .select("id,capabilities,required_inputs,deliverables,limitations,workspace_mode,setup_requirements,output_promise,execution_mode,data_policy")
    .eq("id", rental.agent_version_id)
    .eq("agent_id", rental.agent_id)
    .maybeSingle<AgentVersionRow>();

  if (versionError || !version) {
    return jsonError(403, "not_eligible", "agent-version-not-found");
  }

  const contract = normalizeAgentContract({
    dataPolicy: version.data_policy,
    executionMode: version.execution_mode,
    outputPromise: version.output_promise,
    setupRequirements: version.setup_requirements,
    workspaceMode: version.workspace_mode,
  });

  if (contract.executionMode !== "llm_prompt") {
    return jsonError(403, "not_eligible", "agent-not-llm-enabled");
  }

  if (contract.dataPolicy.requires_files || contract.dataPolicy.external_tools.length > 0) {
    return jsonError(403, "not_eligible", "agent-requires-unsupported-inputs");
  }

  const template = getAgentTemplateByLabel(agent.name);
  const actions = getWorkspaceActionLabels({
    locale,
    templateActions: template?.workspace_actions ?? [],
    templateActionsEn: template?.workspace_actions_en ?? [],
    workspaceMode: contract.workspaceMode,
  });
  const action = actions[actionIndex];

  if (!action) {
    return jsonError(400, "failed", "invalid-action");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const staleRunCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const staleRunCompletedAt = new Date().toISOString();

  const { error: staleRunError } = await supabase
    .from("agent_runs")
    .update({
      completed_at: staleRunCompletedAt,
      error_code: "stale-running-run",
      status: "failed",
    })
    .eq("user_id", profile.id)
    .eq("rental_request_id", rental.id)
    .eq("status", "running")
    .lt("created_at", staleRunCutoff);

  if (staleRunError) {
    return jsonError(500, "failed", "run-state-load-failed");
  }

  const { data: runningRuns, error: runningError } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("user_id", profile.id)
    .eq("rental_request_id", rental.id)
    .eq("status", "running")
    .limit(1);

  if (runningError) {
    return jsonError(500, "failed", "run-state-load-failed");
  }

  if (runningRuns && runningRuns.length > 0) {
    return jsonError(409, "rate_limited", "run-already-in-progress");
  }

  let rentalRunCount = 0;
  let userRunCount = 0;

  try {
    [rentalRunCount, userRunCount] = await Promise.all([
      countRuns(supabase, { rentalId: rental.id, since, userId: profile.id }),
      countRuns(supabase, { since, userId: profile.id }),
    ]);
  } catch {
    return jsonError(500, "failed", "run-state-load-failed");
  }

  if (rentalRunCount >= serverEnv.llmRunsPerRentalPerDay) {
    return jsonError(429, "rate_limited", "rental-run-limit-reached");
  }

  if (userRunCount >= serverEnv.llmRunsPerUserPerDay) {
    return jsonError(429, "rate_limited", "user-run-limit-reached");
  }

  const normalizedVersion = {
    capabilities: version.capabilities ?? [],
    deliverables: version.deliverables ?? [],
    id: version.id,
    limitations: version.limitations ?? [],
    outputPromise: contract.outputPromise,
    requiredInputs: version.required_inputs ?? [],
  };
  const prompt = buildAgentRunPrompt({
    action,
    agent,
    locale,
    maxOutputTokens: serverEnv.llmRunMaxOutputTokens,
    model: serverEnv.openaiModel,
    userInput: inputText,
    version: normalizedVersion,
  });

  const { data: createdRun, error: createRunError } = await supabase
    .from("agent_runs")
    .insert({
      action_key: action.key,
      action_label: action.label,
      agent_id: rental.agent_id,
      agent_version_id: rental.agent_version_id,
      input_chars: inputText.length,
      input_text: inputText,
      model: serverEnv.openaiModel,
      prompt_snapshot: prompt.promptSnapshot,
      provider: "openai",
      rental_request_id: rental.id,
      status: "running",
      user_id: profile.id,
    })
    .select("id,created_at")
    .maybeSingle<{ created_at: string; id: string }>();

  if (createRunError?.code === "23505") {
    return jsonError(409, "rate_limited", "run-already-in-progress");
  }

  if (createRunError || !createdRun) {
    return jsonError(500, "failed", "run-create-failed");
  }

  try {
    const result = await runOpenAIText({
      developerMessage: prompt.developerMessage,
      maxOutputTokens: serverEnv.llmRunMaxOutputTokens,
      model: serverEnv.openaiModel,
      userMessage: prompt.userMessage,
    });
    const outputText = result.outputText.slice(0, 12000);
    const completedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("agent_runs")
      .update({
        completed_at: completedAt,
        input_tokens: result.inputTokens,
        output_chars: outputText.length,
        output_text: outputText,
        output_tokens: result.outputTokens,
        status: "succeeded",
        total_tokens: result.totalTokens,
      })
      .eq("id", createdRun.id)
      .eq("status", "running");

    if (updateError) {
      return jsonError(500, "failed", "run-update-failed");
    }

    return NextResponse.json({
      outputText,
      run: responseRun({
        action,
        completedAt,
        createdAt: createdRun.created_at,
        id: createdRun.id,
        inputText,
        outputText,
        status: "succeeded",
      }),
      runId: createdRun.id,
      status: "succeeded",
    });
  } catch (error) {
    const code = errorCode(error);
    const completedAt = new Date().toISOString();

    await supabase
      .from("agent_runs")
      .update({
        completed_at: completedAt,
        error_code: code,
        status: "failed",
      })
      .eq("id", createdRun.id)
      .eq("status", "running");

    return NextResponse.json(
      {
        error: code,
        run: responseRun({
          action,
          completedAt,
          createdAt: createdRun.created_at,
          errorCode: code,
          id: createdRun.id,
          inputText,
          outputText: null,
          status: "failed",
        }),
        runId: createdRun.id,
        status: "failed",
      },
      { status: code === "openai-timeout" ? 504 : 502 },
    );
  }
}

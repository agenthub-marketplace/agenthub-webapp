import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { loadWorkflowRuntimeContext, triggerWorkflowWorker } from "@/server/workflows/runtime";
import { revalidateWorkspaceRunSurfaces } from "@/server/workspace/revalidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WorkflowRunRow = {
  agent_run_id: string;
  completed_at: string | null;
  created_at: string;
  current_step_index: number;
  error_code: string | null;
  final_output: string | null;
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
};

type WorkflowStepRow = {
  completed_at: string | null;
  error_code: string | null;
  id: string;
  output_text: string | null;
  started_at: string | null;
  status: "queued" | "running" | "succeeded" | "failed" | "skipped";
  step_index: number;
  step_key: string;
  step_label: string;
  step_type: "llm_step" | "webhook_step";
};

type RunSurfaceRow = {
  agent_id: string | null;
  rental_request_id: string | null;
};

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

async function countWorkflowRuns(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  filters: { rentalId?: string; since: string; userId: string },
) {
  let query = supabase
    .from("agent_workflow_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", filters.userId)
    .gte("created_at", filters.since);

  if (filters.rentalId) {
    query = query.eq("rental_request_id", filters.rentalId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error("workflow-run-count-failed");
  }

  return count ?? 0;
}

function responseWorkflowRun(run: WorkflowRunRow, steps: WorkflowStepRow[] = []) {
  return {
    agentRunId: run.agent_run_id,
    completedAt: run.completed_at,
    createdAt: run.created_at,
    currentStepIndex: run.current_step_index,
    errorCode: run.error_code,
    finalOutput: run.final_output,
    id: run.id,
    status: run.status,
    steps: steps.map((step) => ({
      completedAt: step.completed_at,
      errorCode: step.error_code,
      id: step.id,
      outputText: step.output_text,
      startedAt: step.started_at,
      status: step.status,
      stepIndex: step.step_index,
      stepKey: step.step_key,
      stepLabel: step.step_label,
      stepType: step.step_type,
    })),
  };
}

async function loadWorkflowStatus(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  input: { agentRunId?: string; profileId: string; workflowRunId?: string },
) {
  let query = supabase
    .from("agent_workflow_runs")
    .select("id,agent_run_id,status,current_step_index,final_output,error_code,created_at,completed_at")
    .eq("user_id", input.profileId);

  if (input.workflowRunId) {
    query = query.eq("id", input.workflowRunId);
  } else if (input.agentRunId) {
    query = query.eq("agent_run_id", input.agentRunId);
  } else {
    return null;
  }

  const { data: workflowRun, error } = await query.maybeSingle<WorkflowRunRow>();

  if (error || !workflowRun) {
    return null;
  }

  const { data: steps } = await supabase
    .from("agent_workflow_steps")
    .select("id,step_index,step_key,step_label,step_type,status,output_text,error_code,started_at,completed_at")
    .eq("workflow_run_id", workflowRun.id)
    .order("step_index", { ascending: true })
    .returns<WorkflowStepRow[]>();

  return responseWorkflowRun(workflowRun, steps ?? []);
}

async function loadRunSurface(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  input: { profileId: string; runId: string },
) {
  const { data } = await supabase
    .from("agent_runs")
    .select("agent_id,rental_request_id")
    .eq("id", input.runId)
    .eq("user_id", input.profileId)
    .maybeSingle<RunSurfaceRow>();

  const { data: agent } = data?.agent_id
    ? await supabase.from("agents").select("slug").eq("id", data.agent_id).maybeSingle<{ slug: string | null }>()
    : { data: null };

  return {
    agentSlug: agent?.slug ?? null,
    rentalId: data?.rental_request_id ?? null,
  };
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return jsonError(401, "unauthorized", "auth-required");
  }

  if (!serverEnv.workflowRunsEnabled || !serverEnv.workflowWorkerSecret) {
    return jsonError(403, "disabled", "workflow-runs-disabled");
  }

  const body = await parseRequest(request);

  if (!body) {
    return jsonError(400, "failed", "invalid-json");
  }

  const rentalId = typeof body.rentalId === "string" ? body.rentalId : null;
  const inputText = normalizeInputText(body.inputText);
  const locale = isLocale(body.locale) ? (body.locale as Locale) : null;

  if (!rentalId || !inputText || !locale) {
    return jsonError(400, "failed", "invalid-request");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return jsonError(500, "failed", "missing-service-client");
  }

  const { context, error } = await loadWorkflowRuntimeContext({
    profileId: profile.id,
    rentalId,
    supabase,
  });

  if (error || !context) {
    return jsonError(error?.statusCode ?? 500, "not_eligible", error?.error ?? "workflow-runtime-unavailable");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const staleRunCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const staleRunCompletedAt = new Date().toISOString();

  await supabase
    .from("agent_workflow_runs")
    .update({
      completed_at: staleRunCompletedAt,
      error_code: "stale-workflow-run",
      status: "failed",
    })
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .in("status", ["queued", "running"])
    .lt("created_at", staleRunCutoff);

  await supabase
    .from("agent_runs")
    .update({
      completed_at: staleRunCompletedAt,
      error_code: "stale-workflow-run",
      status: "failed",
    })
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .eq("provider", "agenthub_workflow")
    .eq("status", "running")
    .lt("created_at", staleRunCutoff);

  const { data: activeWorkflowRuns, error: activeWorkflowError } = await supabase
    .from("agent_workflow_runs")
    .select("id,agent_run_id,status,current_step_index,final_output,error_code,created_at,completed_at")
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .in("status", ["queued", "running"])
    .limit(1)
    .returns<WorkflowRunRow[]>();

  if (activeWorkflowError) {
    return jsonError(500, "failed", "workflow-state-load-failed");
  }

  if (activeWorkflowRuns && activeWorkflowRuns.length > 0) {
    const existing = await loadWorkflowStatus(supabase, {
      profileId: profile.id,
      workflowRunId: activeWorkflowRuns[0].id,
    });

    return NextResponse.json({
      runId: activeWorkflowRuns[0].agent_run_id,
      status: "queued",
      workflowRun: existing,
    });
  }

  try {
    const [rentalRunCount, userRunCount] = await Promise.all([
      countWorkflowRuns(supabase, { rentalId: context.rental.id, since, userId: profile.id }),
      countWorkflowRuns(supabase, { since, userId: profile.id }),
    ]);

    if (rentalRunCount >= serverEnv.workflowRunsPerRentalPerDay) {
      return jsonError(429, "rate_limited", "rental-workflow-limit-reached");
    }

    if (userRunCount >= serverEnv.workflowRunsPerUserPerDay) {
      return jsonError(429, "rate_limited", "user-workflow-limit-reached");
    }
  } catch {
    return jsonError(500, "failed", "workflow-state-load-failed");
  }

  const promptSnapshot = {
    agent_id: context.agent.id,
    agent_version_id: context.version.id,
    input_excerpt: inputText.slice(0, 1000),
    locale,
    runtime_type: context.contract.runtimeType,
    workflow_id: context.workflow.id,
    workflow_steps: context.workflow.definition.steps.map((step) => ({
      key: step.key,
      label: step.label,
      type: step.type,
    })),
  };

  const { data: createdRun, error: createRunError } = await supabase
    .from("agent_runs")
    .insert({
      action_key: "workflow_automation",
      action_label: "Agent workflow",
      agent_id: context.rental.agent_id,
      agent_version_id: context.rental.agent_version_id,
      input_chars: inputText.length,
      input_text: inputText,
      model: "agenthub-workflow-v0",
      prompt_snapshot: promptSnapshot,
      provider: "agenthub_workflow",
      rental_request_id: context.rental.id,
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

  const { data: workflowRun, error: workflowCreateError } = await supabase
    .from("agent_workflow_runs")
    .insert({
      agent_id: context.rental.agent_id,
      agent_run_id: createdRun.id,
      agent_version_id: context.rental.agent_version_id,
      input_text: inputText,
      rental_request_id: context.rental.id,
      status: "queued",
      user_id: profile.id,
      workflow_id: context.workflow.id,
    })
    .select("id,agent_run_id,status,current_step_index,final_output,error_code,created_at,completed_at")
    .maybeSingle<WorkflowRunRow>();

  if (workflowCreateError || !workflowRun) {
    await supabase
      .from("agent_runs")
      .update({
        completed_at: new Date().toISOString(),
        error_code: "workflow-run-create-failed",
        status: "failed",
      })
      .eq("id", createdRun.id)
      .eq("status", "running");

    return jsonError(500, "failed", "workflow-run-create-failed");
  }

  const { error: stepsCreateError } = await supabase.from("agent_workflow_steps").insert(
    context.workflow.definition.steps.map((step, index) => ({
      endpoint_id: step.endpointId ?? null,
      step_index: index,
      step_key: step.key,
      step_label: step.label,
      step_type: step.type,
      status: "queued",
      workflow_run_id: workflowRun.id,
    })),
  );

  if (stepsCreateError) {
    await supabase
      .from("agent_workflow_runs")
      .update({
        completed_at: new Date().toISOString(),
        error_code: "workflow-steps-create-failed",
        status: "failed",
      })
      .eq("id", workflowRun.id);
    await supabase
      .from("agent_runs")
      .update({
        completed_at: new Date().toISOString(),
        error_code: "workflow-steps-create-failed",
        status: "failed",
      })
      .eq("id", createdRun.id)
      .eq("status", "running");

    return jsonError(500, "failed", "workflow-steps-create-failed");
  }

  await triggerWorkflowWorker(createdRun.id);

  const status = await loadWorkflowStatus(supabase, {
    agentRunId: createdRun.id,
    profileId: profile.id,
  });

  revalidateWorkspaceRunSurfaces({
    agentSlug: context.agent.slug,
    locale,
    rentalId: context.rental.id,
  });

  return NextResponse.json({
    runId: createdRun.id,
    status: status?.status ?? "queued",
    workflowRun: status,
  });
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return jsonError(401, "unauthorized", "auth-required");
  }

  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");

  if (!runId) {
    return jsonError(400, "failed", "missing-run-id");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return jsonError(500, "failed", "missing-service-client");
  }

  const status = await loadWorkflowStatus(supabase, {
    agentRunId: runId,
    profileId: profile.id,
  });

  if (!status) {
    return jsonError(404, "not_found", "workflow-run-not-found");
  }

  if ((status.status === "queued" || status.status === "running") && serverEnv.workflowRunsEnabled) {
    await triggerWorkflowWorker(runId);
  }

  if (["succeeded", "failed", "cancelled"].includes(status.status)) {
    const surface = await loadRunSurface(supabase, {
      profileId: profile.id,
      runId,
    });

    revalidateWorkspaceRunSurfaces({
      agentSlug: surface.agentSlug,
      rentalId: surface.rentalId,
    });
  }

  return NextResponse.json({
    status: status.status,
    workflowRun: status,
  });
}

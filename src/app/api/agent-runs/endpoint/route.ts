import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { callCreatorEndpoint, loadCreatorEndpointRuntimeContext } from "@/server/endpoints/runtime";
import { revalidateWorkspaceRunSurfaces } from "@/server/workspace/revalidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EndpointRunRow = {
  agent_run_id: string;
  completed_at: string | null;
  created_at: string;
  error_code: string | null;
  id: string;
  response_excerpt: string | null;
  status: "running" | "succeeded" | "failed" | "cancelled";
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

async function countEndpointRuns(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  filters: { rentalId?: string; since: string; userId: string },
) {
  let query = supabase
    .from("agent_endpoint_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", filters.userId)
    .gte("created_at", filters.since);

  if (filters.rentalId) {
    query = query.eq("rental_request_id", filters.rentalId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error("endpoint-run-count-failed");
  }

  return count ?? 0;
}

function responseRun(run: EndpointRunRow, outputText?: string | null) {
  return {
    actionLabel: "Creator endpoint",
    completedAt: run.completed_at,
    createdAt: run.created_at,
    errorCode: run.error_code,
    id: run.agent_run_id,
    outputText: outputText ?? run.response_excerpt,
    status: run.status,
  };
}

async function loadEndpointStatus(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  input: { agentRunId: string; profileId: string },
) {
  const { data, error } = await supabase
    .from("agent_endpoint_runs")
    .select("id,agent_run_id,status,response_excerpt,error_code,created_at,completed_at")
    .eq("agent_run_id", input.agentRunId)
    .eq("user_id", input.profileId)
    .maybeSingle<EndpointRunRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return jsonError(401, "unauthorized", "auth-required");
  }

  if (!serverEnv.creatorEndpointRunsEnabled || !serverEnv.creatorEndpointSigningSecret) {
    return jsonError(403, "disabled", "creator-endpoint-runs-disabled");
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

  const { context, error } = await loadCreatorEndpointRuntimeContext({
    profileId: profile.id,
    rentalId,
    supabase,
  });

  if (error || !context) {
    return jsonError(error?.statusCode ?? 500, "not_eligible", error?.error ?? "creator-endpoint-runtime-unavailable");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const staleRunCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const staleRunCompletedAt = new Date().toISOString();

  await supabase
    .from("agent_endpoint_runs")
    .update({
      completed_at: staleRunCompletedAt,
      error_code: "stale-creator-endpoint-run",
      status: "failed",
    })
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .eq("status", "running")
    .lt("created_at", staleRunCutoff);

  await supabase
    .from("agent_runs")
    .update({
      completed_at: staleRunCompletedAt,
      error_code: "stale-creator-endpoint-run",
      status: "failed",
    })
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .eq("provider", "agenthub_creator_endpoint")
    .eq("status", "running")
    .lt("created_at", staleRunCutoff);

  const { data: activeEndpointRuns, error: activeEndpointError } = await supabase
    .from("agent_endpoint_runs")
    .select("id,agent_run_id,status,response_excerpt,error_code,created_at,completed_at")
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .eq("status", "running")
    .limit(1)
    .returns<EndpointRunRow[]>();

  if (activeEndpointError) {
    return jsonError(500, "failed", "endpoint-state-load-failed");
  }

  if (activeEndpointRuns && activeEndpointRuns.length > 0) {
    return NextResponse.json({
      run: responseRun(activeEndpointRuns[0]),
      runId: activeEndpointRuns[0].agent_run_id,
      status: "running",
    });
  }

  try {
    const [rentalRunCount, userRunCount] = await Promise.all([
      countEndpointRuns(supabase, { rentalId: context.rental.id, since, userId: profile.id }),
      countEndpointRuns(supabase, { since, userId: profile.id }),
    ]);

    if (rentalRunCount >= serverEnv.creatorEndpointRunsPerRentalPerDay) {
      return jsonError(429, "rate_limited", "rental-endpoint-limit-reached");
    }

    if (userRunCount >= serverEnv.creatorEndpointRunsPerUserPerDay) {
      return jsonError(429, "rate_limited", "user-endpoint-limit-reached");
    }
  } catch {
    return jsonError(500, "failed", "endpoint-state-load-failed");
  }

  const promptSnapshot = {
    agent_id: context.agent.id,
    agent_version_id: context.version.id,
    endpoint_config_id: context.endpointConfig.id,
    endpoint_id: context.endpoint.id,
    input_excerpt: inputText.slice(0, 1000),
    locale,
    runtime_type: context.contract.runtimeType,
  };

  const { data: createdRun, error: createRunError } = await supabase
    .from("agent_runs")
    .insert({
      action_key: "creator_endpoint",
      action_label: "Creator endpoint",
      agent_id: context.rental.agent_id,
      agent_version_id: context.rental.agent_version_id,
      input_chars: inputText.length,
      input_text: inputText,
      model: "agenthub-creator-endpoint-v0",
      prompt_snapshot: promptSnapshot,
      provider: "agenthub_creator_endpoint",
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

  const { data: endpointRun, error: endpointRunError } = await supabase
    .from("agent_endpoint_runs")
    .insert({
      agent_id: context.rental.agent_id,
      agent_run_id: createdRun.id,
      agent_version_id: context.rental.agent_version_id,
      endpoint_config_id: context.endpointConfig.id,
      endpoint_id: context.endpoint.id,
      rental_request_id: context.rental.id,
      request_snapshot: {
        input_chars: inputText.length,
        input_excerpt: inputText.slice(0, 1000),
        locale,
      },
      started_at: new Date().toISOString(),
      status: "running",
      user_id: profile.id,
    })
    .select("id,agent_run_id,status,response_excerpt,error_code,created_at,completed_at")
    .maybeSingle<EndpointRunRow>();

  if (endpointRunError || !endpointRun) {
    await supabase
      .from("agent_runs")
      .update({
        completed_at: new Date().toISOString(),
        error_code: "endpoint-run-create-failed",
        status: "failed",
      })
      .eq("id", createdRun.id)
      .eq("status", "running");

    return jsonError(500, "failed", "endpoint-run-create-failed");
  }

  const endpointPayload = {
    agent: {
      id: context.agent.id,
      name: context.agent.name,
      summary: context.agent.summary,
    },
    agent_version_id: context.version.id,
    input_text: inputText,
    locale,
    run_id: createdRun.id,
  };

  const endpointResponse = await callCreatorEndpoint({
    body: endpointPayload,
    endpointUrl: context.endpoint.endpoint_url,
  });

  const completedAt = new Date().toISOString();

  if (endpointResponse.error || !endpointResponse.outputText) {
    await supabase
      .from("agent_endpoint_runs")
      .update({
        completed_at: completedAt,
        error_code: endpointResponse.error ?? "creator-endpoint-failed",
        status: "failed",
      })
      .eq("id", endpointRun.id);
    await supabase
      .from("agent_runs")
      .update({
        completed_at: completedAt,
        error_code: endpointResponse.error ?? "creator-endpoint-failed",
        status: "failed",
      })
      .eq("id", createdRun.id)
      .eq("status", "running");

    revalidateWorkspaceRunSurfaces({
      agentSlug: context.agent.slug,
      locale,
      rentalId: context.rental.id,
    });

    return jsonError(502, "failed", endpointResponse.error ?? "creator-endpoint-failed");
  }

  await supabase
    .from("agent_endpoint_runs")
    .update({
      completed_at: completedAt,
      response_excerpt: endpointResponse.outputText,
      status: "succeeded",
    })
    .eq("id", endpointRun.id);

  await supabase
    .from("agent_runs")
    .update({
      completed_at: completedAt,
      output_chars: endpointResponse.outputText.length,
      output_text: endpointResponse.outputText,
      status: "succeeded",
    })
    .eq("id", createdRun.id)
    .eq("status", "running");

  revalidateWorkspaceRunSurfaces({
    agentSlug: context.agent.slug,
    locale,
    rentalId: context.rental.id,
  });

  return NextResponse.json({
    outputText: endpointResponse.outputText,
    run: responseRun(
      {
        ...endpointRun,
        completed_at: completedAt,
        response_excerpt: endpointResponse.outputText,
        status: "succeeded",
      },
      endpointResponse.outputText,
    ),
    runId: createdRun.id,
    status: "succeeded",
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

  const staleRunCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const staleRunCompletedAt = new Date().toISOString();

  await supabase
    .from("agent_endpoint_runs")
    .update({
      completed_at: staleRunCompletedAt,
      error_code: "stale-creator-endpoint-run",
      status: "failed",
    })
    .eq("agent_run_id", runId)
    .eq("user_id", profile.id)
    .eq("status", "running")
    .lt("created_at", staleRunCutoff);

  await supabase
    .from("agent_runs")
    .update({
      completed_at: staleRunCompletedAt,
      error_code: "stale-creator-endpoint-run",
      status: "failed",
    })
    .eq("id", runId)
    .eq("user_id", profile.id)
    .eq("provider", "agenthub_creator_endpoint")
    .eq("status", "running")
    .lt("created_at", staleRunCutoff);

  const run = await loadEndpointStatus(supabase, {
    agentRunId: runId,
    profileId: profile.id,
  });

  if (!run) {
    return jsonError(404, "not_found", "endpoint-run-not-found");
  }

  return NextResponse.json({
    run: responseRun(run),
    status: run.status,
  });
}

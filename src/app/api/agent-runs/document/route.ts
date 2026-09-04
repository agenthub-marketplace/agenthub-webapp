import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAgentTemplateByLabel } from "@/lib/agent-templates";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getWorkspaceActionLabels, type WorkspaceAction } from "@/lib/workspace-actions";
import { loadDocumentRuntimeContext } from "@/server/documents/runtime";
import { buildDocumentRunPrompt } from "@/server/llm/document-prompt";
import { runOpenAIText } from "@/server/llm/openai";
import { revalidateWorkspaceRunSurfaces } from "@/server/workspace/revalidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DocumentFileRow = {
  agent_run_id: string | null;
  extracted_text: string | null;
  id: string;
  mime_type: string;
  original_filename: string;
  rental_request_id: string;
  size_bytes: number;
  status: string;
  user_id: string;
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

function normalizeActionIndex(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) {
    return null;
  }

  return value;
}

function normalizeInstruction(value: unknown, fallback: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const trimmed = value.trim();

  if (trimmed.length > serverEnv.llmRunMaxInputChars) {
    return null;
  }

  return trimmed;
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
  documentFile: DocumentFileRow;
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
    documentFile: {
      id: input.documentFile.id,
      mimeType: input.documentFile.mime_type,
      originalFilename: input.documentFile.original_filename,
      sizeBytes: input.documentFile.size_bytes,
      status: input.documentFile.status,
    },
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

  if (!serverEnv.documentRunsEnabled || !serverEnv.openaiApiKey) {
    return jsonError(403, "disabled", "document-runs-disabled");
  }

  const body = await parseRequest(request);

  if (!body) {
    return jsonError(400, "failed", "invalid-json");
  }

  const rentalId = typeof body.rentalId === "string" ? body.rentalId : null;
  const fileId = typeof body.fileId === "string" ? body.fileId : null;
  const actionIndex = normalizeActionIndex(body.actionIndex);
  const locale = isLocale(body.locale) ? (body.locale as Locale) : null;

  if (!rentalId || !fileId || actionIndex === null || !locale) {
    return jsonError(400, "failed", "invalid-request");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return jsonError(500, "failed", "missing-service-client");
  }

  const { context, error } = await loadDocumentRuntimeContext({
    profileId: profile.id,
    rentalId,
    supabase,
  });

  if (error || !context) {
    return jsonError(error?.statusCode ?? 500, "not_eligible", error?.error ?? "document-runtime-unavailable");
  }

  const template = getAgentTemplateByLabel(context.agent.name);
  const actions = getWorkspaceActionLabels({
    locale,
    templateActions: template?.workspace_actions ?? [],
    templateActionsEn: template?.workspace_actions_en ?? [],
    workspaceMode: context.contract.workspaceMode,
  });
  const action = actions[actionIndex];

  if (!action) {
    return jsonError(400, "failed", "invalid-action");
  }

  const inputText = normalizeInstruction(body.inputText, `Document action: ${action.label}`);

  if (!inputText) {
    return jsonError(400, "failed", "invalid-input");
  }

  const { data: documentFile, error: fileError } = await supabase
    .from("agent_run_files")
    .select("id,user_id,rental_request_id,agent_run_id,original_filename,mime_type,size_bytes,status,extracted_text")
    .eq("id", fileId)
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .maybeSingle<DocumentFileRow>();

  if (fileError || !documentFile) {
    return jsonError(404, "not_eligible", "document-file-not-found");
  }

  if (documentFile.agent_run_id) {
    return jsonError(409, "not_eligible", "document-file-already-used");
  }

  if (documentFile.status !== "extracted" || !documentFile.extracted_text?.trim()) {
    return jsonError(403, "not_eligible", "document-file-not-extracted");
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
    .eq("rental_request_id", context.rental.id)
    .eq("status", "running")
    .lt("created_at", staleRunCutoff);

  if (staleRunError) {
    return jsonError(500, "failed", "run-state-load-failed");
  }

  const { data: runningRuns, error: runningError } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("user_id", profile.id)
    .eq("rental_request_id", context.rental.id)
    .eq("status", "running")
    .limit(1);

  if (runningError) {
    return jsonError(500, "failed", "run-state-load-failed");
  }

  if (runningRuns && runningRuns.length > 0) {
    return jsonError(409, "rate_limited", "run-already-in-progress");
  }

  try {
    const [rentalRunCount, userRunCount] = await Promise.all([
      countRuns(supabase, { rentalId: context.rental.id, since, userId: profile.id }),
      countRuns(supabase, { since, userId: profile.id }),
    ]);

    if (rentalRunCount >= serverEnv.llmRunsPerRentalPerDay) {
      return jsonError(429, "rate_limited", "rental-run-limit-reached");
    }

    if (userRunCount >= serverEnv.llmRunsPerUserPerDay) {
      return jsonError(429, "rate_limited", "user-run-limit-reached");
    }
  } catch {
    return jsonError(500, "failed", "run-state-load-failed");
  }

  const normalizedVersion = {
    capabilities: context.version.capabilities ?? [],
    deliverables: context.version.deliverables ?? [],
    id: context.version.id,
    limitations: context.version.limitations ?? [],
    outputPromise: context.contract.outputPromise,
    requiredInputs: context.version.required_inputs ?? [],
  };
  const prompt = buildDocumentRunPrompt({
    action,
    agent: context.agent,
    document: {
      extractedText: documentFile.extracted_text.slice(0, serverEnv.documentMaxExtractedChars),
      id: documentFile.id,
      mimeType: documentFile.mime_type,
      originalFilename: documentFile.original_filename,
      sizeBytes: documentFile.size_bytes,
    },
    locale,
    maxOutputTokens: serverEnv.llmRunMaxOutputTokens,
    model: serverEnv.openaiModel,
    userInstruction: inputText,
    version: normalizedVersion,
  });

  const { data: createdRun, error: createRunError } = await supabase
    .from("agent_runs")
    .insert({
      action_key: action.key,
      action_label: action.label,
      agent_id: context.rental.agent_id,
      agent_version_id: context.rental.agent_version_id,
      input_chars: inputText.length,
      input_text: inputText,
      model: serverEnv.openaiModel,
      prompt_snapshot: prompt.promptSnapshot,
      provider: "openai",
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

  const { data: linkedFile, error: fileLinkError } = await supabase
    .from("agent_run_files")
    .update({ agent_run_id: createdRun.id })
    .eq("id", documentFile.id)
    .is("agent_run_id", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (fileLinkError || !linkedFile) {
    await supabase
      .from("agent_runs")
      .update({
        completed_at: new Date().toISOString(),
        error_code: fileLinkError ? "document-file-link-failed" : "document-file-already-used",
        status: "failed",
      })
      .eq("id", createdRun.id)
      .eq("status", "running");

    return jsonError(fileLinkError ? 500 : 409, "failed", fileLinkError ? "document-file-link-failed" : "document-file-already-used");
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

    revalidateWorkspaceRunSurfaces({
      agentSlug: context.agent.slug,
      locale,
      rentalId: context.rental.id,
    });

    return NextResponse.json({
      outputText,
      run: responseRun({
        action,
        completedAt,
        createdAt: createdRun.created_at,
        documentFile,
        id: createdRun.id,
        inputText,
        outputText,
        status: "succeeded",
      }),
      runId: createdRun.id,
      status: "succeeded",
    });
  } catch (runError) {
    const code = errorCode(runError);
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

    revalidateWorkspaceRunSurfaces({
      agentSlug: context.agent.slug,
      locale,
      rentalId: context.rental.id,
    });

    return NextResponse.json(
      {
        error: code,
        run: responseRun({
          action,
          completedAt,
          createdAt: createdRun.created_at,
          documentFile,
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

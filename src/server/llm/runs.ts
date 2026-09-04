import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AgentRunSummary = {
  actionKey: string;
  actionLabel: string;
  completedAt: string | null;
  createdAt: string;
  documentFile: {
    id: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    status: string;
  } | null;
  errorCode: string | null;
  id: string;
  inputText: string;
  outputText: string | null;
  status: "running" | "succeeded" | "failed";
};

type AgentRunRow = {
  action_key: string;
  action_label: string;
  completed_at: string | null;
  created_at: string;
  error_code: string | null;
  id: string;
  input_text: string;
  output_text: string | null;
  status: AgentRunSummary["status"];
};

type AgentRunFileRow = {
  agent_run_id: string | null;
  id: string;
  mime_type: string;
  original_filename: string;
  size_bytes: number;
  status: string;
};

export function isMissingAgentRunsSchemaError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  const errorText = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return errorText.includes("agent_runs") || errorText.includes("schema cache");
}

export async function getUserAgentRuns(userId: string, rentalId: string, limit = 20) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "missing-config", runs: [] };
  }

  const { data, error } = await supabase
    .from("agent_runs")
    .select("id,action_key,action_label,input_text,output_text,status,error_code,created_at,completed_at")
    .eq("user_id", userId)
    .eq("rental_request_id", rentalId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AgentRunRow[]>();

  if (error) {
    if (isMissingAgentRunsSchemaError(error)) {
      return { error: null, runs: [] };
    }

    return { error: "agent-runs-load-failed", runs: [] };
  }

  const runs = (data ?? []).map((run) => ({
    actionKey: run.action_key,
    actionLabel: run.action_label,
    completedAt: run.completed_at,
    createdAt: run.created_at,
    documentFile: null,
    errorCode: run.error_code,
    id: run.id,
    inputText: run.input_text,
    outputText: run.output_text,
    status: run.status,
  }));
  const runIds = runs.map((run) => run.id);
  const filesByRun = new Map<string, AgentRunSummary["documentFile"]>();

  if (runIds.length > 0) {
    const { data: files, error: filesError } = await supabase
      .from("agent_run_files")
      .select("id,agent_run_id,original_filename,mime_type,size_bytes,status")
      .in("agent_run_id", runIds)
      .eq("user_id", userId)
      .returns<AgentRunFileRow[]>();

    if (!filesError) {
      for (const file of files ?? []) {
        if (file.agent_run_id) {
          filesByRun.set(file.agent_run_id, {
            id: file.id,
            mimeType: file.mime_type,
            originalFilename: file.original_filename,
            sizeBytes: file.size_bytes,
            status: file.status,
          });
        }
      }
    }
  }

  return {
    error: null,
    runs: runs.map((run) => ({
      ...run,
      documentFile: filesByRun.get(run.id) ?? null,
    })),
  };
}

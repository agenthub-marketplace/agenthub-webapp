import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AgentRunSummary = {
  actionKey: string;
  actionLabel: string;
  completedAt: string | null;
  createdAt: string;
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

export function isMissingAgentRunsSchemaError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  const errorText = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return errorText.includes("agent_runs") || errorText.includes("schema cache");
}

export async function getUserAgentRuns(userId: string, rentalId: string) {
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
    .limit(5)
    .returns<AgentRunRow[]>();

  if (error) {
    if (isMissingAgentRunsSchemaError(error)) {
      return { error: null, runs: [] };
    }

    return { error: "agent-runs-load-failed", runs: [] };
  }

  return {
    error: null,
    runs: (data ?? []).map((run) => ({
      actionKey: run.action_key,
      actionLabel: run.action_label,
      completedAt: run.completed_at,
      createdAt: run.created_at,
      errorCode: run.error_code,
      id: run.id,
      inputText: run.input_text,
      outputText: run.output_text,
      status: run.status,
    })),
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReviewDecision = "approve" | "reject" | "changes";

type AgentReviewRow = {
  id: string;
  active_version_id: string | null;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  status: "submitted" | "in_review" | "approved" | "rejected" | "suspended" | "draft";
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isReviewDecision(value: string): value is ReviewDecision {
  return value === "approve" || value === "reject" || value === "changes";
}

function readLocale(formData: FormData): Locale {
  return readText(formData, "locale") === "en" ? "en" : "fr";
}

function redirectWithError(locale: Locale, error: string): never {
  redirect(`${localizedPath("/admin", locale)}?error=${encodeURIComponent(error)}`);
}

export async function reviewAgentAction(formData: FormData) {
  const locale = readLocale(formData);
  const profile = await requireAdminAccess(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError(locale, "missing-config");
  }

  const agentId = readText(formData, "agent_id");
  const decision = readText(formData, "decision");
  const notes = readText(formData, "notes");

  if (!agentId || !isReviewDecision(decision)) {
    redirectWithError(locale, "invalid-review");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,risk_level,status")
    .eq("id", agentId)
    .maybeSingle<AgentReviewRow>();

  if (agentError || !agent) {
    redirectWithError(locale, "agent-not-found");
  }

  if (agent.status !== "submitted" && agent.status !== "in_review") {
    redirectWithError(locale, "agent-not-reviewable");
  }

  const nextStatus = decision === "approve" ? "approved" : "rejected";
  const reviewNotes =
    decision === "changes"
      ? `Changes requested: ${notes || "No details provided."}`
      : notes || null;

  const { error: updateError } = await supabase
    .from("agents")
    .update({ status: nextStatus })
    .eq("id", agent.id)
    .in("status", ["submitted", "in_review"]);

  if (updateError) {
    redirectWithError(locale, "agent-update-failed");
  }

  const { error: reviewError } = await supabase.from("admin_reviews").insert({
    agent_id: agent.id,
    agent_version_id: agent.active_version_id,
    admin_id: profile.id,
    decision: nextStatus,
    risk_level: agent.risk_level,
    notes: reviewNotes,
  });

  if (reviewError) {
    redirectWithError(locale, "review-log-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: `agent.${decision}`,
    entity_type: "agent",
    entity_id: agent.id,
    metadata: {
      previous_status: agent.status,
      next_status: nextStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/en/admin");
  revalidatePath("/search");

  redirect(`${localizedPath("/admin", locale)}?reviewed=${encodeURIComponent(agent.id)}`);
}

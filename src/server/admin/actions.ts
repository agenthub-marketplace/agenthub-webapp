"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReviewDecision = "approve" | "reject" | "changes" | "start_review";
type ModerationAction = "suspend" | "restore" | "archive";

type AgentReviewRow = {
  id: string;
  active_version_id: string | null;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  status: "submitted" | "in_review" | "approved" | "rejected" | "suspended" | "draft";
};

type AgentModerationRow = {
  id: string;
  active_version_id: string | null;
  risk_level: "low" | "medium" | "high" | "forbidden_beta";
  status: "approved" | "suspended" | "submitted" | "in_review" | "rejected" | "draft" | "archived";
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isReviewDecision(value: string): value is ReviewDecision {
  return value === "approve" || value === "reject" || value === "changes" || value === "start_review";
}

function isModerationAction(value: string): value is ModerationAction {
  return value === "suspend" || value === "restore" || value === "archive";
}

function readLocale(formData: FormData): Locale {
  return readText(formData, "locale") === "en" ? "en" : "fr";
}

function redirectWithError(locale: Locale, error: string): never {
  redirect(`${localizedPath("/admin", locale)}?error=${encodeURIComponent(error)}`);
}

function redirectWithAgentsError(locale: Locale, error: string): never {
  redirect(`${localizedPath("/admin", locale)}?error=${encodeURIComponent(error)}#agents`);
}

export async function reviewAgentAction(formData: FormData) {
  const locale = readLocale(formData);
  const profile = await requireAdminAccess(locale, localizedPath("/admin", locale));
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

  if (decision === "start_review" && agent.status !== "submitted") {
    redirectWithError(locale, "agent-not-reviewable");
  }

  if (decision !== "start_review" && agent.status !== "in_review") {
    redirectWithError(locale, "agent-must-be-in-review");
  }

  if (decision === "approve" && agent.risk_level === "forbidden_beta") {
    redirectWithError(locale, "forbidden-risk");
  }

  if (decision === "changes" && notes.length < 10) {
    redirectWithError(locale, "changes-notes-required");
  }

  const nextStatus =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : "in_review";
  const reviewNotes = notes || null;
  const expectedStatus = decision === "start_review" ? "submitted" : "in_review";

  const { data: updatedAgent, error: updateError } = await supabase
    .from("agents")
    .update({ status: nextStatus })
    .eq("id", agent.id)
    .eq("status", expectedStatus)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (updateError || !updatedAgent) {
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
  revalidatePath("/creator");
  revalidatePath("/creator/dashboard");
  revalidatePath("/en/creator");
  revalidatePath("/en/creator/dashboard");
  revalidatePath("/search");

  redirect(`${localizedPath("/admin", locale)}?reviewed=${encodeURIComponent(agent.id)}`);
}

export async function moderateAgentPublicationAction(formData: FormData) {
  const locale = readLocale(formData);
  const profile = await requireAdminAccess(locale, localizedPath("/admin", locale));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithAgentsError(locale, "missing-config");
  }

  const agentId = readText(formData, "agent_id");
  const action = readText(formData, "moderation_action");
  const reason = readText(formData, "reason");

  if (!agentId || !isModerationAction(action)) {
    redirectWithAgentsError(locale, "invalid-moderation");
  }

  const expectedStatus = action === "suspend" ? "approved" : "suspended";
  const nextStatus = action === "suspend" ? "suspended" : action === "restore" ? "approved" : "archived";

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,risk_level,status")
    .eq("id", agentId)
    .maybeSingle<AgentModerationRow>();

  if (agentError || !agent || agent.status !== expectedStatus) {
    redirectWithAgentsError(locale, "agent-moderation-failed");
  }

  if (action === "restore" && (!agent.active_version_id || agent.risk_level === "forbidden_beta")) {
    redirectWithAgentsError(locale, "agent-moderation-failed");
  }

  const { data: updatedAgent, error: updateError } = await supabase
    .from("agents")
    .update({ status: nextStatus })
    .eq("id", agentId)
    .eq("status", expectedStatus)
    .select("id,status")
    .maybeSingle<{ id: string; status: string }>();

  if (updateError || !updatedAgent) {
    redirectWithAgentsError(locale, "agent-moderation-failed");
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: `agent.${action}`,
    entity_type: "agent",
    entity_id: updatedAgent.id,
    metadata: {
      previous_status: expectedStatus,
      next_status: nextStatus,
      reason: reason || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/en/admin");
  revalidatePath("/search");
  revalidatePath("/en/search");
  revalidatePath("/marketplace");
  revalidatePath("/en/marketplace");
  revalidatePath("/creator");
  revalidatePath("/creator/dashboard");
  revalidatePath("/en/creator");
  revalidatePath("/en/creator/dashboard");

  redirect(`${localizedPath("/admin", locale)}?moderated=${encodeURIComponent(updatedAgent.id)}#agents`);
}

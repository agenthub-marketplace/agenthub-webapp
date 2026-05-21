"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/session";
import { requireCreatorAccess } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

type AgentRentalRow = {
  id: string;
  creator_id: string;
  slug: string;
  status: "approved" | string;
  pricing_type: "task" | "project";
  starting_price_cents: number | null;
  currency: string;
};

function redirectWithAgentError(locale: Locale, slug: string, error: string): never {
  redirect(`${localizedPath(`/agents/${slug}`, locale)}?error=${encodeURIComponent(error)}`);
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMultiline(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function buildRequestBrief(input: {
  constraints: string;
  context: string;
  deadline: string;
  objective: string;
  outputFormat: string;
}) {
  return [
    `Objectif: ${input.objective}`,
    `Contexte: ${input.context}`,
    `Deadline souhaitée: ${input.deadline}`,
    `Format attendu: ${input.outputFormat}`,
    `Contraintes importantes: ${input.constraints}`,
  ].join("\n\n");
}

export async function createBetaRentalAction(locale: Locale, formData: FormData) {
  const profile = await requireAuth(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(localizedPath("/auth/login", locale));
  }

  const agentId = formData.get("agent_id");
  const slug = formData.get("slug");

  if (typeof agentId !== "string" || typeof slug !== "string" || !agentId || !slug) {
    redirect(localizedPath("/marketplace", locale));
  }

  const rentalInput = {
    objective: readText(formData, "objective"),
    context: readText(formData, "context"),
    deadline: readText(formData, "deadline"),
    outputFormat: readText(formData, "output_format"),
    constraints: normalizeMultiline(readText(formData, "constraints")),
  };

  if (
    rentalInput.objective.length < 5 ||
    rentalInput.context.length < 10 ||
    rentalInput.deadline.length < 2 ||
    rentalInput.outputFormat.length < 3 ||
    rentalInput.constraints.length < 3
  ) {
    redirectWithAgentError(locale, slug, "rental-inputs-required");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,creator_id,slug,status,pricing_type,starting_price_cents,currency")
    .eq("id", agentId)
    .eq("status", "approved")
    .maybeSingle<AgentRentalRow>();

  if (agentError) {
    redirectWithAgentError(locale, slug, "agent-load-failed");
  }

  if (!agent) {
    redirectWithAgentError(locale, slug, "agent-unavailable");
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (!creatorProfile.error && !creatorProfile.creatorProfileMissing && creatorProfile.id === agent.creator_id) {
    redirectWithAgentError(locale, slug, "self-rental-not-allowed");
  }

  const { error: insertError } = await supabase.from("rental_requests").insert({
    agent_id: agent.id,
    user_id: profile.id,
    creator_id: agent.creator_id,
    status: "pending",
    pricing_type: agent.pricing_type,
    quoted_price_cents: agent.starting_price_cents,
    currency: agent.currency,
    request_brief: buildRequestBrief(rentalInput),
    required_inputs: {
      objective: rentalInput.objective,
      context: rentalInput.context,
      deadline: rentalInput.deadline,
      output_format: rentalInput.outputFormat,
      constraints: rentalInput.constraints,
    },
  });

  if (insertError) {
    redirectWithAgentError(locale, slug, "rental-create-failed");
  }

  revalidatePath(localizedPath("/dashboard", locale));
  redirect(`${localizedPath("/dashboard", locale)}?rental=created`);
}

const rentalTransitions = {
  accept: { from: "pending", to: "accepted" },
  reject: { from: "pending", to: "rejected" },
  start: { from: "accepted", to: "in_progress" },
} as const;

function redirectWithCreatorRentalError(locale: Locale, error: string): never {
  redirect(`${localizedPath("/creator/dashboard", locale)}?rentalError=${encodeURIComponent(error)}`);
}

export async function updateCreatorRentalStatusAction(locale: Locale, formData: FormData) {
  await requireCreatorAccess(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithCreatorRentalError(locale, "missing-config");
  }

  const rentalId = formData.get("rental_id");
  const action = formData.get("action");

  if (typeof rentalId !== "string" || !rentalId || typeof action !== "string") {
    redirectWithCreatorRentalError(locale, "invalid-request");
  }

  const transition = rentalTransitions[action as keyof typeof rentalTransitions];

  if (!transition) {
    redirectWithCreatorRentalError(locale, "invalid-action");
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error || creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    redirectWithCreatorRentalError(locale, "creator-profile-required");
  }

  const { data, error } = await supabase
    .from("rental_requests")
    .update({ status: transition.to })
    .eq("id", rentalId)
    .eq("creator_id", creatorProfile.id)
    .eq("status", transition.from)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    redirectWithCreatorRentalError(locale, "rental-update-failed");
  }

  revalidatePath(localizedPath("/creator/dashboard", locale));
  revalidatePath(localizedPath("/creator", locale));
  redirect(`${localizedPath("/creator/dashboard", locale)}?rentalUpdated=${encodeURIComponent(rentalId)}`);
}

export async function deliverCreatorRentalResultAction(locale: Locale, formData: FormData) {
  await requireCreatorAccess(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithCreatorRentalError(locale, "missing-config");
  }

  const rentalId = formData.get("rental_id");
  const summary = formData.get("summary");

  if (typeof rentalId !== "string" || !rentalId || typeof summary !== "string") {
    redirectWithCreatorRentalError(locale, "invalid-request");
  }

  const normalizedSummary = summary.trim();

  if (normalizedSummary.length < 10 || normalizedSummary.length > 8000) {
    redirectWithCreatorRentalError(locale, "invalid-delivery-summary");
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error || creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    redirectWithCreatorRentalError(locale, "creator-profile-required");
  }

  const { data: rental, error: rentalError } = await supabase
    .from("rental_requests")
    .select("id")
    .eq("id", rentalId)
    .eq("creator_id", creatorProfile.id)
    .eq("status", "in_progress")
    .maybeSingle<{ id: string }>();

  if (rentalError || !rental) {
    redirectWithCreatorRentalError(locale, "rental-not-ready");
  }

  const { error } = await supabase.rpc("deliver_creator_rental_result", {
    p_rental_request_id: rental.id,
    p_summary: normalizedSummary,
  });

  if (error) {
    redirectWithCreatorRentalError(locale, "delivery-failed");
  }

  revalidatePath(localizedPath("/creator/dashboard", locale));
  revalidatePath(localizedPath("/dashboard", locale));
  redirect(`${localizedPath("/creator/dashboard", locale)}?rentalDelivered=${encodeURIComponent(rental.id)}`);
}

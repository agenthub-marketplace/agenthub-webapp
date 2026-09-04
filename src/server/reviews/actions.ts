"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getUserHomePath, requireAuth } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

type ReviewRow = {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "rejected" | "cancelled" | "active" | "stopped" | "expired";
  agent_id: string;
  creator_id: string;
  agents: { slug: string } | { slug: string }[] | null;
};

function appendReviewQuery(path: string, params: Record<string, string>) {
  const separator = path.includes("?") ? "&" : "?";
  const query = new URLSearchParams(params).toString();

  return `${path}${separator}${query}`;
}

function agentDetailPath(locale: Locale, slug: string) {
  return locale === "en" ? `/en/agents/${slug}` : `/agenthub/agents/${slug}`;
}

function revalidateReviewPublicationSurfaces(locale: Locale, rentalId: string, agentSlug: string) {
  revalidatePath(getUserHomePath(locale));
  revalidatePath(localizedPath(`/workspace/${rentalId}`, locale));
  revalidatePath("/agenthub/workspace");
  revalidatePath("/en/workspace");
  revalidatePath("/workspace");
  revalidatePath("/agenthub/search");
  revalidatePath("/search");
  revalidatePath("/en/search");
  revalidatePath("/marketplace");
  revalidatePath("/en/marketplace");
  revalidatePath("/leaderboard");

  if (agentSlug) {
    revalidatePath(agentDetailPath(locale, agentSlug));
    revalidatePath(localizedPath(`/agents/${agentSlug}`, locale));
    revalidatePath(`/agenthub/agents/${agentSlug}`);
    revalidatePath(`/agents/${agentSlug}`);
    revalidatePath(`/en/agents/${agentSlug}`);
  }
}

function normalizeReviewReturnPath(locale: Locale, value: FormDataEntryValue | null, rentalId: string) {
  const dashboardPath = getUserHomePath(locale);

  if (typeof value !== "string") {
    return dashboardPath;
  }

  const trimmed = value.trim();
  const workspacePath = rentalId ? localizedPath(`/workspace/${rentalId}`, locale) : "";
  const agenthubWorkspacePath = locale === "fr" && rentalId ? `/agenthub/workspace/${rentalId}` : "";

  if (trimmed === dashboardPath || trimmed.startsWith(`${dashboardPath}?`)) {
    return trimmed;
  }

  if (workspacePath && (trimmed === workspacePath || trimmed.startsWith(`${workspacePath}?`))) {
    return trimmed;
  }

  if (agenthubWorkspacePath && (trimmed === agenthubWorkspacePath || trimmed.startsWith(`${agenthubWorkspacePath}?`))) {
    return trimmed;
  }

  return dashboardPath;
}

function redirectWithReviewError(locale: Locale, rentalId: string, error: string, returnTo?: string): never {
  redirect(
    appendReviewQuery(returnTo || getUserHomePath(locale), {
      reviewError: error,
      rental: rentalId,
    }),
  );
}

export async function submitRentalReviewAction(locale: Locale, formData: FormData) {
  const profile = await requireAuth(locale, getUserHomePath(locale));
  const supabase = await createSupabaseServerClient();
  const rentalId = formData.get("rental_id");
  const returnPath = normalizeReviewReturnPath(locale, formData.get("return_to"), typeof rentalId === "string" ? rentalId : "");

  if (!supabase) {
    redirectWithReviewError(locale, "", "missing-config", returnPath);
  }

  const rating = formData.get("rating");
  const title = formData.get("title");
  const body = formData.get("body");

  if (typeof rentalId !== "string" || !rentalId) {
    redirectWithReviewError(locale, "", "invalid-request", returnPath);
  }

  if (typeof rating !== "string" || !rating.trim()) {
    redirectWithReviewError(locale, rentalId, "rating-required", returnPath);
  }

  const normalizedRating = Number.parseInt(rating, 10);

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    redirectWithReviewError(locale, rentalId, "invalid-rating", returnPath);
  }

  if (typeof body !== "string" || !body.trim()) {
    redirectWithReviewError(locale, rentalId, "review-body-required", returnPath);
  }

  const normalizedBody = body.trim().slice(0, 4000);

  if (normalizedBody.length < 5) {
    redirectWithReviewError(locale, rentalId, "review-body-too-short", returnPath);
  }

  const rentalQuery = await supabase
    .from("rental_requests")
    .select("id,agent_id,creator_id,status,user_id,agents!rental_requests_agent_id_fkey(slug)")
    .eq("id", rentalId)
    .eq("user_id", profile.id)
    .maybeSingle<ReviewRow>();

  if (rentalQuery.error || !rentalQuery.data) {
    redirectWithReviewError(locale, rentalId, "rental-not-found", returnPath);
  }

  const rental = rentalQuery.data;

  const rentalAgentSlug = Array.isArray(rental.agents)
    ? rental.agents[0]?.slug ?? ""
    : rental.agents?.slug ?? "";

  if (!["active", "stopped", "expired", "delivered"].includes(rental.status)) {
    redirectWithReviewError(locale, rentalId, "rental-not-reviewable", returnPath);
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (!creatorProfile.error && !creatorProfile.creatorProfileMissing && creatorProfile.id === rental.creator_id) {
    redirectWithReviewError(locale, rentalId, "self-review-not-allowed", returnPath);
  }

  const { count: succeededRunCount, error: runCountError } = await supabase
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("rental_request_id", rental.id)
    .eq("status", "succeeded");

  if (runCountError) {
    redirectWithReviewError(locale, rentalId, "review-run-check-failed", returnPath);
  }

  if (!runCountError && (succeededRunCount ?? 0) < 1) {
    redirectWithReviewError(locale, rentalId, "review-run-required", returnPath);
  }

  const normalizedTitle = typeof title === "string" ? title.trim().slice(0, 200) : null;

  const { error } = await supabase.from("agent_reviews").insert({
    agent_id: rental.agent_id,
    rental_request_id: rental.id,
    user_id: profile.id,
    rating: normalizedRating,
    title: normalizedTitle || null,
    body: normalizedBody,
  });

  if (error) {
    if (error.code === "23505") {
      redirectWithReviewError(locale, rentalId, "review-already-exists", returnPath);
    }

    redirectWithReviewError(locale, rentalId, "review-create-failed", returnPath);
  }

  revalidateReviewPublicationSurfaces(locale, rental.id, rentalAgentSlug);

  const successPath = rentalAgentSlug ? agentDetailPath(locale, rentalAgentSlug) : returnPath;

  redirect(
    appendReviewQuery(successPath, {
      reviewSubmitted: rental.id,
    }),
  );
}

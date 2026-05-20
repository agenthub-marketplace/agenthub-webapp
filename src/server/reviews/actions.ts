"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

type ReviewRow = {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "rejected" | "cancelled";
  agent_id: string;
  creator_id: string;
  agents: { slug: string } | { slug: string }[] | null;
};

function redirectWithReviewError(locale: Locale, rentalId: string, error: string): never {
  redirect(
    `${localizedPath("/dashboard", locale)}?reviewError=${encodeURIComponent(error)}&rental=${encodeURIComponent(rentalId)}`,
  );
}

export async function submitRentalReviewAction(locale: Locale, formData: FormData) {
  const profile = await requireAuth(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithReviewError(locale, "", "missing-config");
  }

  const rentalId = formData.get("rental_id");
  const rating = formData.get("rating");
  const title = formData.get("title");
  const body = formData.get("body");

  if (typeof rentalId !== "string" || !rentalId) {
    redirectWithReviewError(locale, "", "invalid-request");
  }

  if (typeof rating !== "string" || !rating.trim()) {
    redirectWithReviewError(locale, rentalId, "rating-required");
  }

  const normalizedRating = Number.parseInt(rating, 10);

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    redirectWithReviewError(locale, rentalId, "invalid-rating");
  }

  if (typeof body !== "string" || !body.trim()) {
    redirectWithReviewError(locale, rentalId, "review-body-required");
  }

  const normalizedBody = body.trim().slice(0, 4000);

  if (normalizedBody.length < 5) {
    redirectWithReviewError(locale, rentalId, "review-body-too-short");
  }

  const rentalQuery = await supabase
    .from("rental_requests")
    .select("id,agent_id,creator_id,status,user_id,agents!rental_requests_agent_id_fkey(slug)")
    .eq("id", rentalId)
    .eq("user_id", profile.id)
    .maybeSingle<ReviewRow>();

  if (rentalQuery.error || !rentalQuery.data) {
    redirectWithReviewError(locale, rentalId, "rental-not-found");
  }

  const rental = rentalQuery.data;

  const rentalAgentSlug = Array.isArray(rental.agents)
    ? rental.agents[0]?.slug ?? ""
    : rental.agents?.slug ?? "";

  if (rental.status !== "delivered") {
    redirectWithReviewError(locale, rentalId, "rental-not-delivered");
  }

  const creatorProfile = await getCreatorProfileForUser(profile.id);

  if (!creatorProfile.error && !creatorProfile.creatorProfileMissing && creatorProfile.id === rental.creator_id) {
    redirectWithReviewError(locale, rentalId, "self-review-not-allowed");
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
      redirectWithReviewError(locale, rentalId, "review-already-exists");
    }

    redirectWithReviewError(locale, rentalId, "review-create-failed");
  }

  revalidatePath(localizedPath("/dashboard", locale));
  if (rentalAgentSlug) {
    revalidatePath(localizedPath(`/agents/${rentalAgentSlug}`, locale));
  }
  redirect(`${localizedPath("/dashboard", locale)}?reviewSubmitted=${encodeURIComponent(rental.id)}`);
}

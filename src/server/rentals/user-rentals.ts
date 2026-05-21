import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRental = {
  id: string;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "rejected" | "cancelled" | "active" | "expired";
  pricingType: "task" | "project";
  priceCents: number | null;
  currency: string;
  requestBrief: string;
  requiredInputs: {
    constraints?: string;
    context?: string;
    deadline?: string;
    objective?: string;
    output_format?: string;
  } | null;
  createdAt: string;
  agent: {
    name: string;
    slug: string;
    summary: string;
  } | null;
  result: {
    summary: string;
    deliveredAt: string | null;
  } | null;
  review: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
  } | null;
};

export const ACCESS_COMPATIBLE_STATUSES = ["active", "accepted", "in_progress", "delivered"] as const;

type UserRentalRow = {
  id: string;
  status: UserRental["status"];
  pricing_type: "task" | "project";
  quoted_price_cents: number | null;
  currency: string;
  request_brief: string;
  required_inputs: UserRental["requiredInputs"];
  created_at: string;
  agents: { name: string; slug: string; summary: string } | { name: string; slug: string; summary: string }[] | null;
  rental_results: { summary: string; delivered_at: string | null } | { summary: string; delivered_at: string | null }[] | null;
  agent_reviews:
    | {
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
      }
    | {
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
      }[]
    | null;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getUserRentals(userId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { rentals: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("rental_requests")
    .select(
      "id,status,pricing_type,quoted_price_cents,currency,request_brief,required_inputs,created_at,agents!rental_requests_agent_id_fkey(name,slug,summary),rental_results!rental_results_rental_request_id_fkey(summary,delivered_at),agent_reviews!agent_reviews_rental_request_id_fkey(id,rating,title,body)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserRentalRow[]>();

  if (error) {
    return { rentals: [], error: "rentals-load-failed" };
  }

  return {
    rentals: (data ?? []).map((rental) => ({
      id: rental.id,
      status: rental.status,
      pricingType: rental.pricing_type,
      priceCents: rental.quoted_price_cents,
      currency: rental.currency,
      requestBrief: rental.request_brief,
      requiredInputs: rental.required_inputs,
      createdAt: rental.created_at,
      agent: readSingle(rental.agents),
      result: (() => {
        const result = readSingle(rental.rental_results);
        return result
          ? {
              summary: result.summary,
              deliveredAt: result.delivered_at,
            }
          : null;
      })(),
      review: (() => {
        const review = readSingle(rental.agent_reviews);
        return review
          ? {
              id: review.id,
              rating: review.rating,
              title: review.title,
              body: review.body,
            }
          : null;
      })(),
    })),
    error: null,
  };
}

export async function getUserRentalById(userId: string, rentalId: string) {
  const result = await getUserRentals(userId);

  return {
    rental: result.rentals.find((rental) => rental.id === rentalId) ?? null,
    error: result.error,
  };
}

import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

export type CreatorRental = {
  id: string;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "rejected" | "cancelled";
  pricingType: "task" | "project";
  priceCents: number | null;
  currency: string;
  requestBrief: string;
  createdAt: string;
  updatedAt: string;
  agent: {
    name: string;
    slug: string;
    summary: string;
  } | null;
};

type CreatorRentalRow = {
  id: string;
  status: CreatorRental["status"];
  pricing_type: CreatorRental["pricingType"];
  quoted_price_cents: number | null;
  currency: string;
  request_brief: string;
  created_at: string;
  updated_at: string;
  agents: CreatorRental["agent"] | CreatorRental["agent"][] | null;
};

export type CreatorRentalsResult = {
  rentals: CreatorRental[];
  creatorProfileMissing: boolean;
  error: string | null;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getCreatorRentalsForUser(): Promise<CreatorRentalsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      rentals: [],
      creatorProfileMissing: false,
      error: "missing-config",
    };
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error || creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    return {
      rentals: [],
      creatorProfileMissing: creatorProfile.creatorProfileMissing,
      error: creatorProfile.error,
    };
  }

  const { data, error } = await supabase
    .from("rental_requests")
    .select("id,status,pricing_type,quoted_price_cents,currency,request_brief,created_at,updated_at,agents!rental_requests_agent_id_fkey(name,slug,summary)")
    .eq("creator_id", creatorProfile.id)
    .order("created_at", { ascending: false })
    .returns<CreatorRentalRow[]>();

  if (error) {
    return {
      rentals: [],
      creatorProfileMissing: false,
      error: "creator-rentals-error",
    };
  }

  return {
    rentals: (data ?? []).map((rental) => ({
      id: rental.id,
      status: rental.status,
      pricingType: rental.pricing_type,
      priceCents: rental.quoted_price_cents,
      currency: rental.currency,
      requestBrief: rental.request_brief,
      createdAt: rental.created_at,
      updatedAt: rental.updated_at,
      agent: readSingle(rental.agents),
    })),
    creatorProfileMissing: false,
    error: null,
  };
}

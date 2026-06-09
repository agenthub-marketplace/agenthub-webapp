import "server-only";

import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

export type CreatorRental = {
  id: string;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "rejected" | "cancelled" | "active" | "stopped" | "expired";
  pricingType: "task" | "project";
  priceCents: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  agent: {
    name: string;
    slug: string;
    summary: string;
    status: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended" | "archived";
  } | null;
};

export type CreatorRentalsResult = {
  rentals: CreatorRental[];
  creatorProfileMissing: boolean;
  error: string | null;
  analyticsLimited: boolean;
};

export async function getCreatorRentalsForUser(): Promise<CreatorRentalsResult> {
  const creatorProfile = await getCreatorProfileForUser();

  if (creatorProfile.error || creatorProfile.creatorProfileMissing || !creatorProfile.id) {
    return {
      rentals: [],
      creatorProfileMissing: creatorProfile.creatorProfileMissing,
      error: creatorProfile.error,
      analyticsLimited: true,
    };
  }

  return {
    // Creator analytics must not bypass RLS. Keep this surface closed until a
    // dedicated aggregate/RPC path exists.
    rentals: [],
    creatorProfileMissing: false,
    error: null,
    analyticsLimited: true,
  };
}

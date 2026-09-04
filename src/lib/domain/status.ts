import type { AgentStatus, PricingType } from "@/types/agent";
import type { UserRole } from "@/types/user";

export const USER_ROLES = ["user", "creator", "admin"] as const satisfies readonly UserRole[];

export const AGENT_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "suspended",
  "archived",
] as const satisfies readonly AgentStatus[];

export const RENTAL_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "delivered",
  "rejected",
  "cancelled",
  "active",
  "stopped",
  "expired",
] as const;

export const RISK_LEVELS = ["low", "medium", "high", "forbidden_beta"] as const;

// Beta rentals support task and project pricing. Duration pricing remains a future marketplace option.
export const PRICING_TYPES = ["task", "project"] as const satisfies readonly PricingType[];

export type RentalRequestStatus = (typeof RENTAL_REQUEST_STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];

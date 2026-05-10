import type { PricingType } from "@/types/agent";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "in_progress"
  | "completed"
  | "failed"
  | "refunded"
  | "disputed"
  | "cancelled";

export type Order = {
  id: string;
  agentId: string;
  userId: string;
  creatorId: string;
  status: OrderStatus;
  pricingType: PricingType;
  amountCents: number;
  currency: string;
  taskBrief: string;
  deliverableUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

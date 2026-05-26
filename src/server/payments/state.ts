import "server-only";

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ACCESS_OPEN_STATUSES = ["active", "accepted", "in_progress", "delivered"] as const;
export type AccessOpenStatus = (typeof ACCESS_OPEN_STATUSES)[number];

export const ACCESS_TERMINAL_STATUSES = ["expired", "rejected", "cancelled"] as const;
export type AccessTerminalStatus = (typeof ACCESS_TERMINAL_STATUSES)[number];

export function isOpenAccessStatus(status: string) {
  return (ACCESS_OPEN_STATUSES as readonly string[]).includes(status);
}

export function isTerminalPaymentStatus(status: string) {
  return status === "paid" || status === "failed" || status === "cancelled";
}

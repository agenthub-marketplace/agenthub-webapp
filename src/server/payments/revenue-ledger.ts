import "server-only";

import type { createSupabaseServiceClient } from "@/lib/supabase/service";

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

type LedgerEventType = "access_created" | "access_stopped" | "activation_blocked" | "payment_paid";

type PaymentLedgerRow = {
  agent_id: string;
  agent_version_id: string | null;
  amount_cents: number;
  currency: string;
  id: string;
  rental_request_id: string | null;
  agents:
    | {
        creator_id: string;
      }
    | {
        creator_id: string;
      }[]
    | null;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function statusForEvent(eventType: LedgerEventType) {
  if (eventType === "access_created") {
    return "earned";
  }

  if (eventType === "activation_blocked") {
    return "blocked";
  }

  if (eventType === "access_stopped") {
    return "cancelled";
  }

  return "pending_access";
}

export async function recordCreatorRevenueLedgerEvent(input: {
  eventType: LedgerEventType;
  metadata?: Record<string, unknown>;
  paymentId: string;
  rentalRequestId?: string | null;
  supabase: ServiceClient;
}) {
  const { data: payment, error } = await input.supabase
    .from("payments")
    .select("id,agent_id,agent_version_id,rental_request_id,amount_cents,currency,agents!inner(creator_id)")
    .eq("id", input.paymentId)
    .maybeSingle<PaymentLedgerRow>();

  const agent = readSingle(payment?.agents ?? null);

  if (error || !payment || !agent?.creator_id) {
    return { error: "ledger-payment-load-failed", ok: false };
  }

  const rentalRequestId = input.rentalRequestId ?? payment.rental_request_id;
  const isZeroRevenueEvent = input.eventType === "activation_blocked" || input.eventType === "access_stopped";
  const creatorGrossCents = isZeroRevenueEvent ? 0 : payment.amount_cents;

  const { error: insertError } = await input.supabase.from("creator_revenue_ledger").upsert(
    {
      agent_id: payment.agent_id,
      agent_version_id: payment.agent_version_id,
      creator_gross_cents: creatorGrossCents,
      creator_id: agent.creator_id,
      creator_net_cents: null,
      currency: payment.currency,
      event_type: input.eventType,
      gross_amount_cents: payment.amount_cents,
      metadata: input.metadata ?? {},
      payment_id: payment.id,
      platform_fee_cents: null,
      rental_request_id: rentalRequestId,
      status: statusForEvent(input.eventType),
    },
    {
      onConflict: "payment_id,event_type",
    },
  );

  if (insertError) {
    return { error: insertError.message, ok: false };
  }

  return { error: null, ok: true };
}

export async function recordCreatorRevenueLedgerAccessStopped(input: {
  metadata?: Record<string, unknown>;
  rentalRequestId: string;
  supabase: ServiceClient;
}) {
  const { data: payment, error } = await input.supabase
    .from("payments")
    .select("id")
    .eq("rental_request_id", input.rentalRequestId)
    .eq("status", "paid")
    .maybeSingle<{ id: string }>();

  if (error || !payment?.id) {
    return { error: "ledger-payment-load-failed", ok: false };
  }

  return recordCreatorRevenueLedgerEvent({
    eventType: "access_stopped",
    metadata: input.metadata,
    paymentId: payment.id,
    rentalRequestId: input.rentalRequestId,
    supabase: input.supabase,
  });
}

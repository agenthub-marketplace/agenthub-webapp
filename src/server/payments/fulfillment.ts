import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ActivationError, PaymentStatus } from "@/server/payments/state";

type PaymentRow = {
  id: string;
  user_id: string;
  agent_id: string;
  agent_version_id: string | null;
  rental_request_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  activation_error: ActivationError | null;
};

type AgentRow = {
  id: string;
  creator_id: string;
  slug: string;
  status: string;
  active_version_id: string | null;
  pricing_type: "task" | "project";
  starting_price_cents: number | null;
  currency: string;
};

export type CheckoutSessionForFulfillment = {
  id: string;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | null;
  payment_status?: string;
};

export async function markPaymentCancelled(sessionId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  await supabase
    .from("payments")
    .update({ status: "cancelled" })
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "pending");
}

export async function markPaymentFailed(paymentId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  await supabase.from("payments").update({ status: "failed" }).eq("id", paymentId).eq("status", "pending");
}

export async function markPaymentBlocked(paymentId: string, activationError: ActivationError) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  await supabase
    .from("payments")
    .update({
      status: "paid_blocked",
      activation_error: activationError,
    })
    .eq("id", paymentId)
    .in("status", ["pending", "cancelled", "failed"]);
}

export async function fulfillCheckoutSession(session: CheckoutSessionForFulfillment) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    throw new Error("missing-service-client");
  }

  if (session.payment_status && session.payment_status !== "paid") {
    return;
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id,user_id,agent_id,agent_version_id,rental_request_id,amount_cents,currency,status,activation_error")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle<PaymentRow>();

  if (paymentError || !payment) {
    throw new Error("payment-not-found");
  }

  if (payment.status === "paid" && payment.rental_request_id) {
    return;
  }

  if (payment.status === "paid_blocked") {
    return;
  }

  if (!["pending", "cancelled", "failed"].includes(payment.status)) {
    throw new Error("payment-not-pending");
  }

  if (typeof session.amount_total !== "number" || session.amount_total !== payment.amount_cents) {
    await markPaymentBlocked(payment.id, "snapshot_mismatch");
    return;
  }

  if (!session.currency || session.currency.toLowerCase() !== payment.currency.toLowerCase()) {
    await markPaymentBlocked(payment.id, "snapshot_mismatch");
    return;
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,creator_id,slug,status,active_version_id,pricing_type,starting_price_cents,currency")
    .eq("id", payment.agent_id)
    .maybeSingle<AgentRow>();

  if (agentError || !agent || agent.status !== "approved") {
    await markPaymentBlocked(payment.id, "agent_not_approved");
    return;
  }

  if (agent.currency.toLowerCase() !== payment.currency.toLowerCase()) {
    await markPaymentBlocked(payment.id, "snapshot_mismatch");
    return;
  }

  const agentVersionId = payment.agent_version_id;

  if (!agentVersionId) {
    await markPaymentBlocked(payment.id, "missing_agent_version");
    return;
  }

  const { data: existingAccess } = await supabase
    .from("rental_requests")
    .select("id")
    .eq("payment_id", payment.id)
    .maybeSingle<{ id: string }>();

  if (existingAccess) {
    const { error: updateExistingError } = await supabase
      .from("payments")
      .update({
        rental_request_id: existingAccess.id,
        status: "paid",
        stripe_payment_intent_id: session.payment_intent ?? null,
      })
      .eq("id", payment.id);

    if (updateExistingError) {
      throw new Error("payment-update-failed");
    }

    return;
  }

  const { data: access, error: accessError } = await supabase
    .from("rental_requests")
    .insert({
      agent_id: agent.id,
      user_id: payment.user_id,
      creator_id: agent.creator_id,
      agent_version_id: agentVersionId,
      status: "active",
      pricing_type: agent.pricing_type,
      payment_id: payment.id,
      quoted_price_cents: payment.amount_cents,
      currency: payment.currency,
      request_brief: `Paid AgentHub access activated for ${agent.slug}.`,
      required_inputs: {
        access_type: "direct_agent_access",
        checkout_session_id: session.id,
        pricing_type: agent.pricing_type,
      },
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (accessError?.code === "23505") {
    let { data: duplicateAccess, error: duplicateError } = await supabase
      .from("rental_requests")
      .select("id")
      .eq("payment_id", payment.id)
      .maybeSingle<{ id: string }>();

    if (!duplicateAccess && !duplicateError) {
      const duplicateByUserAgent = await supabase
        .from("rental_requests")
        .select("id")
        .eq("user_id", payment.user_id)
        .eq("agent_id", payment.agent_id)
        .in("status", ["active", "accepted", "in_progress", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();

      duplicateAccess = duplicateByUserAgent.data;
      duplicateError = duplicateByUserAgent.error;
    }

    if (duplicateError || !duplicateAccess) {
      await markPaymentBlocked(payment.id, "duplicate_access");
      return;
    }

    await markPaymentBlocked(payment.id, "duplicate_access");
    return;
  }

  if (accessError || !access) {
    await markPaymentBlocked(payment.id, "unknown_error");
    return;
  }

  const { data: updatedPayment, error: updateError } = await supabase
    .from("payments")
    .update({
      rental_request_id: access.id,
      status: "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
    })
    .eq("id", payment.id)
    .in("status", ["pending", "cancelled", "failed"])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (updateError || !updatedPayment) {
    throw new Error("payment-update-failed");
  }
}

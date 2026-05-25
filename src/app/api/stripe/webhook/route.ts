import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { verifyStripeWebhookPayload } from "@/server/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  user_id: string;
  agent_id: string;
  agent_version_id: string | null;
  rental_request_id: string | null;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled";
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

async function markPaymentCancelled(sessionId: string) {
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

async function handleCheckoutCompleted(session: { id: string; payment_intent?: string | null; payment_status?: string }) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    throw new Error("missing-service-client");
  }

  if (session.payment_status && session.payment_status !== "paid") {
    return;
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id,user_id,agent_id,agent_version_id,rental_request_id,amount_cents,currency,status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle<PaymentRow>();

  if (paymentError || !payment) {
    throw new Error("payment-not-found");
  }

  if (payment.status === "paid" && payment.rental_request_id) {
    return;
  }

  if (payment.status !== "pending") {
    throw new Error("payment-not-pending");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,creator_id,slug,status,active_version_id,pricing_type,starting_price_cents,currency")
    .eq("id", payment.agent_id)
    .eq("status", "approved")
    .maybeSingle<AgentRow>();

  if (agentError || !agent) {
    throw new Error("agent-not-approved");
  }

  if (agent.currency.toLowerCase() !== payment.currency.toLowerCase()) {
    throw new Error("payment-currency-mismatch");
  }

  const agentVersionId = payment.agent_version_id ?? agent.active_version_id;

  if (!agentVersionId) {
    throw new Error("agent-version-missing");
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
      throw new Error("access-create-failed");
    }

    const { data: paidPayment, error: duplicateUpdateError } = await supabase
      .from("payments")
      .update({
        rental_request_id: duplicateAccess.id,
        status: "paid",
        stripe_payment_intent_id: session.payment_intent ?? null,
      })
      .eq("id", payment.id)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (duplicateUpdateError || !paidPayment) {
      throw new Error("payment-update-failed");
    }

    return;
  }

  if (accessError || !access) {
    throw new Error("access-create-failed");
  }

  const { data: updatedPayment, error: updateError } = await supabase
    .from("payments")
    .update({
      rental_request_id: access.id,
      status: "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (updateError || !updatedPayment) {
    throw new Error("payment-update-failed");
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;

  try {
    event = verifyStripeWebhookPayload(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object);
    }

    if (event.type === "checkout.session.expired") {
      await markPaymentCancelled(event.data.object.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook-failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

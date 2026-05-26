import { NextResponse } from "next/server";

import { fulfillCheckoutSession, markPaymentCancelled } from "@/server/payments/fulfillment";
import { verifyStripeWebhookPayload } from "@/server/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      await fulfillCheckoutSession(event.data.object);
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

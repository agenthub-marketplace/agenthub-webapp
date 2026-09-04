import { NextResponse } from "next/server";
import { BodyTooLargeError, readBoundedBody } from "@/server/bounded-body";

import { fulfillCheckoutSession, markPaymentCancelled } from "@/server/payments/fulfillment";
import { verifyStripeWebhookPayload } from "@/server/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let rawBody: string;
  try {
    // Vérification HMAC sur le contenu brut, après une limite réelle de réception.
    rawBody = new TextDecoder().decode(await readBoundedBody(request, 1_000_000));
  } catch (error) {
    return NextResponse.json({ error: "invalid-body" }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
  }
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
  } catch {
    // Ne pas renvoyer les détails internes du paiement ou de la base au client.
    return NextResponse.json({ error: "webhook-failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

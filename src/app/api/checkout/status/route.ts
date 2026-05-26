import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { fulfillCheckoutSession, markPaymentCancelled, markPaymentFailed } from "@/server/payments/fulfillment";
import type { ActivationError, PaymentStatus } from "@/server/payments/state";
import { retrieveStripeCheckoutSession } from "@/server/payments/stripe";

export const dynamic = "force-dynamic";

type CheckoutPaymentRow = {
  id: string;
  status: PaymentStatus;
  rental_request_id: string | null;
  activation_error: ActivationError | null;
};

async function loadPaymentForUser(supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, userId: string, sessionId: string) {
  return supabase
    .from("payments")
    .select("id,status,rental_request_id,activation_error")
    .eq("user_id", userId)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ status: "missing-session" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ status: "missing-config" }, { status: 500 });
  }

  const initialPayment = await loadPaymentForUser(supabase, profile.id, sessionId);
  let data = initialPayment.data as CheckoutPaymentRow | null;
  const error = initialPayment.error;

  if (error) {
    return NextResponse.json({ status: "load-failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  if (data.status === "pending") {
    let checkoutSession;

    try {
      checkoutSession = await retrieveStripeCheckoutSession(sessionId);
    } catch (error) {
      console.error("checkout-status-session-fetch-failed", error);
      return NextResponse.json({
        status: data.status,
        rentalRequestId: data.rental_request_id,
        activationError: data.activation_error,
      });
    }

    if (checkoutSession.payment_status === "paid") {
      try {
        await fulfillCheckoutSession(checkoutSession);
      } catch (fulfillmentError) {
        await markPaymentFailed(data.id);
        console.error("checkout-status-fulfillment-failed", fulfillmentError);

        const refreshed = await loadPaymentForUser(supabase, profile.id, sessionId);
        data = (refreshed.data as CheckoutPaymentRow | null) ?? data;

        if (data && data.status === "pending") {
          data.status = "failed";
        }

        return NextResponse.json({
          status: data.status,
          rentalRequestId: data.rental_request_id,
          activationError: data.activation_error,
        });
      }
    } else if (checkoutSession.status === "expired") {
      await markPaymentCancelled(sessionId);
    }

    const refreshed = await loadPaymentForUser(supabase, profile.id, sessionId);
    data = (refreshed.data as CheckoutPaymentRow | null) ?? data;
  }

  return NextResponse.json({
    status: data.status,
    rentalRequestId: data.rental_request_id,
    activationError: data.activation_error,
  });
}

import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ActivationError, PaymentStatus } from "@/server/payments/state";

export const dynamic = "force-dynamic";

type CheckoutPaymentRow = {
  status: PaymentStatus;
  rental_request_id: string | null;
  activation_error: ActivationError | null;
};

async function loadPaymentForUser(supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, userId: string, sessionId: string) {
  return supabase
    .from("payments")
    .select("status,rental_request_id,activation_error")
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
  const data = initialPayment.data as CheckoutPaymentRow | null;
  const error = initialPayment.error;

  if (error) {
    return NextResponse.json({ status: "load-failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    rentalRequestId: data.rental_request_id,
    activationError: data.activation_error,
  });
}

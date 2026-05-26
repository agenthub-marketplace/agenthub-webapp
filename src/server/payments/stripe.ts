import "server-only";

import crypto from "node:crypto";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

type CheckoutSessionInput = {
  agentName: string;
  amountCents: number;
  appUrl?: string;
  currency: string;
  locale: "fr" | "en";
  paymentId: string;
  slug: string;
};

export type StripeCheckoutSession = {
  id: string;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | null;
  payment_status?: string;
  status?: string;
  url: string | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      amount_total?: number | null;
      currency?: string | null;
      payment_intent?: string | null;
      payment_status?: string;
    };
  };
};

export function getAppUrl() {
  if (publicEnv.appUrl) {
    return publicEnv.appUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export async function createStripeCheckoutSession(input: CheckoutSessionInput) {
  if (!serverEnv.stripeSecretKey) {
    throw new Error("stripe-secret-missing");
  }

  const appUrl = (input.appUrl || getAppUrl()).replace(/\/$/, "");
  const successPath = input.locale === "en" ? "/en/checkout/success" : "/checkout/success";
  const cancelPath = input.locale === "en" ? "/en/checkout/cancel" : "/checkout/cancel";
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${appUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}${cancelPath}?payment_id=${encodeURIComponent(input.paymentId)}`,
    client_reference_id: input.paymentId,
    "metadata[payment_id]": input.paymentId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.agentName,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `agenthub_checkout_${input.paymentId}`,
    },
    body,
  });

  const data = (await response.json()) as StripeCheckoutSession & { error?: { message?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || "stripe-checkout-create-failed");
  }

  return data;
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  if (!serverEnv.stripeSecretKey) {
    throw new Error("stripe-secret-missing");
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${serverEnv.stripeSecretKey}`,
    },
    cache: "no-store",
  });

  const data = (await response.json()) as StripeCheckoutSession & { error?: { message?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || "stripe-checkout-retrieve-failed");
  }

  return data;
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStripeWebhookPayload(rawBody: string, signatureHeader: string | null) {
  if (!serverEnv.stripeWebhookSecret) {
    throw new Error("stripe-webhook-secret-missing");
  }

  if (!signatureHeader) {
    throw new Error("stripe-signature-missing");
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) {
      return acc;
    }

    acc[key] = [...(acc[key] ?? []), value];
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];

  if (!timestamp || signatures.length === 0) {
    throw new Error("stripe-signature-invalid");
  }

  const timestampSeconds = Number.parseInt(timestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!Number.isInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
    throw new Error("stripe-signature-expired");
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", serverEnv.stripeWebhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const verified = signatures.some((signature) => timingSafeEqualHex(signature, expectedSignature));

  if (!verified) {
    throw new Error("stripe-signature-invalid");
  }

  return JSON.parse(rawBody) as StripeWebhookEvent;
}

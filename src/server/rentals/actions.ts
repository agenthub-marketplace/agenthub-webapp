"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import { createStripeCheckoutSession } from "@/server/payments/stripe";
import { getUserAgentOrderState } from "@/server/rentals/user-rentals";

type AgentRentalRow = {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  status: "approved" | string;
  active_version_id: string | null;
  pricing_type: "task" | "project";
  starting_price_cents: number | null;
  currency: string;
};

function redirectWithAgentError(locale: Locale, slug: string, error: string): never {
  redirect(`${localizedPath(`/agents/${slug}`, locale)}?error=${encodeURIComponent(error)}`);
}

function redirectWithAgentOrder(locale: Locale, slug: string, order: string): never {
  redirect(`${localizedPath(`/agents/${slug}`, locale)}?order=${encodeURIComponent(order)}`);
}

function safeOrigin(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

async function getCurrentRequestOrigin() {
  const headerList = await headers();
  const origin = safeOrigin(headerList.get("origin"));

  if (origin) {
    return origin;
  }

  const forwardedHost = headerList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerList.get("host")?.split(",")[0]?.trim();

  if (!host) {
    return undefined;
  }

  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return safeOrigin(`${proto}://${host}`);
}

export async function createBetaRentalAction(locale: Locale, formData: FormData) {
  return createAgentAccessAction(locale, formData);
}

export async function createAgentAccessAction(locale: Locale, formData: FormData) {
  const agentId = formData.get("agent_id");
  const slug = formData.get("slug");

  if (typeof agentId !== "string" || typeof slug !== "string" || !agentId || !slug) {
    redirect(localizedPath("/marketplace", locale));
  }

  const agentPath = localizedPath(`/agents/${slug}`, locale);
  const profile = await requireAuth(locale, agentPath);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(`${localizedPath("/auth/login", locale)}?next=${encodeURIComponent(agentPath)}&error=missing-config`);
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,creator_id,name,slug,status,active_version_id,pricing_type,starting_price_cents,currency")
    .eq("id", agentId)
    .eq("status", "approved")
    .maybeSingle<AgentRentalRow>();

  if (agentError) {
    redirectWithAgentError(locale, slug, "agent-load-failed");
  }

  if (!agent) {
    redirectWithAgentError(locale, slug, "agent-unavailable");
  }

  if (typeof agent.starting_price_cents !== "number" || agent.starting_price_cents <= 0) {
    redirectWithAgentError(locale, slug, "price-not-configured");
  }

  if (!agent.active_version_id) {
    redirectWithAgentError(locale, slug, "agent-unavailable");
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (!creatorProfile.error && !creatorProfile.creatorProfileMissing && creatorProfile.id === agent.creator_id) {
    redirectWithAgentError(locale, slug, "self-rental-not-allowed");
  }

  const { state: currentOrderState } = await getUserAgentOrderState(profile.id, agent.id);

  if (currentOrderState?.kind === "open_access") {
    redirect(`${localizedPath(`/workspace/${currentOrderState.rentalId}`, locale)}?access=existing`);
  }

  if (currentOrderState?.kind === "activation_pending") {
    if (currentOrderState.checkoutSessionId) {
      redirect(`${localizedPath("/checkout/success", locale)}?session_id=${encodeURIComponent(currentOrderState.checkoutSessionId)}`);
    }

    redirectWithAgentOrder(locale, slug, "activation-pending");
  }

  if (currentOrderState?.kind === "payment_pending") {
    redirectWithAgentOrder(locale, slug, "payment-pending");
  }

  if (serverEnv.stripeSecretKey) {
    const serviceClient = createSupabaseServiceClient();

    if (!serviceClient) {
      redirectWithAgentError(locale, slug, "payment-service-unavailable");
    }

    const paymentId = randomUUID();

    const { error: pendingPaymentError } = await serviceClient.from("payments").insert({
      id: paymentId,
      user_id: profile.id,
      agent_id: agent.id,
      agent_version_id: agent.active_version_id,
      amount_cents: agent.starting_price_cents,
      currency: agent.currency,
      status: "pending",
    });

    if (pendingPaymentError) {
      if (pendingPaymentError.code === "23505") {
        const { state: existingOrderState } = await getUserAgentOrderState(profile.id, agent.id);

        if (existingOrderState?.kind === "open_access") {
          redirect(`${localizedPath(`/workspace/${existingOrderState.rentalId}`, locale)}?access=existing`);
        }

        if (existingOrderState?.kind === "activation_pending" && existingOrderState.checkoutSessionId) {
          redirect(
            `${localizedPath("/checkout/success", locale)}?session_id=${encodeURIComponent(
              existingOrderState.checkoutSessionId,
            )}`,
          );
        }

        if (existingOrderState?.kind === "payment_pending") {
          redirectWithAgentOrder(locale, slug, "payment-pending");
        }
      }

      redirectWithAgentError(locale, slug, "payment-create-failed");
    }

    let checkoutSession;
    try {
      checkoutSession = await createStripeCheckoutSession({
        agentName: agent.name,
        appUrl: await getCurrentRequestOrigin(),
        amountCents: agent.starting_price_cents,
        currency: agent.currency,
        locale,
        paymentId,
        slug: agent.slug,
      });
    } catch {
      await serviceClient.from("payments").update({ status: "failed" }).eq("id", paymentId).eq("status", "pending");
      redirectWithAgentError(locale, slug, "checkout-create-failed");
    }

    if (!checkoutSession.url) {
      await serviceClient.from("payments").update({ status: "failed" }).eq("id", paymentId).eq("status", "pending");
      redirectWithAgentError(locale, slug, "checkout-create-failed");
    }

    const { error: paymentError } = await serviceClient
      .from("payments")
      .update({
        stripe_checkout_session_id: checkoutSession.id,
        stripe_payment_intent_id: checkoutSession.payment_intent ?? null,
      })
      .eq("id", paymentId)
      .eq("status", "pending");

    if (paymentError) {
      redirectWithAgentError(locale, slug, "payment-create-failed");
    }

    redirect(checkoutSession.url);
  }

  const canUseFreeBetaAccess = process.env.NODE_ENV !== "production" || serverEnv.enableFreeBetaAccess;

  if (!canUseFreeBetaAccess) {
    redirectWithAgentError(locale, slug, "stripe-not-configured");
  }

  const { data: access, error: insertError } = await supabase
    .from("rental_requests")
    .insert({
      agent_id: agent.id,
      user_id: profile.id,
      creator_id: agent.creator_id,
      agent_version_id: agent.active_version_id,
      status: "active",
      pricing_type: agent.pricing_type,
      quoted_price_cents: agent.starting_price_cents,
      currency: agent.currency,
      request_brief: `Direct AgentHub access activated for ${agent.slug}.`,
      required_inputs: {
        access_type: "direct_agent_access",
        pricing_type: agent.pricing_type,
      },
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertError?.code === "23505") {
    const { state: existingOrderState } = await getUserAgentOrderState(profile.id, agent.id);

    if (existingOrderState?.kind === "open_access") {
      redirect(`${localizedPath(`/workspace/${existingOrderState.rentalId}`, locale)}?access=existing`);
    }
  }

  if (insertError || !access) {
    redirectWithAgentError(locale, slug, "rental-create-failed");
  }

  revalidatePath(localizedPath("/dashboard", locale));
  revalidatePath(localizedPath("/workspace", locale));
  redirect(`${localizedPath(`/workspace/${access.id}`, locale)}?access=created`);
}

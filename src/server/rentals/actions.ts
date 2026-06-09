"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getUserHomePath, requireAuth } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import { createStripeCheckoutSession, retrieveStripeCheckoutSession } from "@/server/payments/stripe";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";
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

async function redirectToPendingCheckout(locale: Locale, slug: string, checkoutSessionId: string | null) {
  if (!checkoutSessionId) {
    redirectWithAgentOrder(locale, slug, "payment-pending");
  }

  let redirectTarget: string | null = null;

  try {
    const checkoutSession = await retrieveStripeCheckoutSession(checkoutSessionId);

    if (checkoutSession.status === "open" && checkoutSession.url) {
      redirectTarget = checkoutSession.url;
    }

    if (checkoutSession.payment_status === "paid") {
      redirectTarget = `${localizedPath("/checkout/success", locale)}?session_id=${encodeURIComponent(checkoutSessionId)}`;
    }
  } catch {
    redirectWithAgentOrder(locale, slug, "payment-pending");
  }

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  redirectWithAgentOrder(locale, slug, "payment-pending");
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
    await redirectToPendingCheckout(locale, slug, currentOrderState.checkoutSessionId);
  }

  if (serverEnv.paymentsConfigError) {
    redirectWithAgentError(locale, slug, "payment-config-invalid");
  }

  if (serverEnv.accessMode === "paid" && serverEnv.paymentsProvider === "stripe") {
    const serviceClient = createSupabaseServiceClient();

    if (!serverEnv.stripeSecretKey || !serviceClient) {
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
          await redirectToPendingCheckout(locale, slug, existingOrderState.checkoutSessionId);
        }
      }

      redirectWithAgentError(locale, slug, "payment-create-failed");
    }

    let checkoutSession;
    try {
      checkoutSession = await createStripeCheckoutSession({
        agentName: agent.name,
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

  if (serverEnv.accessMode !== "free_beta" || serverEnv.paymentsProvider !== "none") {
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

  revalidatePath(getUserHomePath(locale));
  revalidatePath(localizedPath("/workspace", locale));
  redirect(`${localizedPath(`/workspace/${access.id}`, locale)}?access=created`);
}

export async function stopAgentAccessAction(locale: Locale, formData: FormData) {
  const rentalId = formData.get("rental_id");

  if (typeof rentalId !== "string" || !rentalId) {
    redirect(`${localizedPath("/workspace", locale)}?accessStop=invalid`);
  }

  const profile = await requireAuth(locale, localizedPath("/workspace", locale));
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    redirect(`${localizedPath("/workspace", locale)}?accessStop=error`);
  }

  const { data: rental, error: rentalError } = await serviceClient
    .from("rental_requests")
    .select("id,user_id,agent_id,status,agents!rental_requests_agent_id_fkey(slug)")
    .eq("id", rentalId)
    .eq("user_id", profile.id)
    .maybeSingle<{
      id: string;
      user_id: string;
      agent_id: string;
      status: string;
      agents: { slug: string } | { slug: string }[] | null;
    }>();

  if (rentalError || !rental) {
    redirect(`${localizedPath("/workspace", locale)}?accessStop=not-found`);
  }

  if (!(ACCESS_OPEN_STATUSES as readonly string[]).includes(rental.status)) {
    redirect(`${localizedPath("/workspace", locale)}?accessStop=already-stopped`);
  }

  const { data: stoppedRental, error: stopError } = await serviceClient
    .from("rental_requests")
    .update({ status: "stopped" })
    .eq("user_id", profile.id)
    .eq("id", rental.id)
    .in("status", ACCESS_OPEN_STATUSES)
    .select("id")
    .returns<{ id: string }[]>();

  if (stopError || !stoppedRental || stoppedRental.length === 0) {
    redirect(`${localizedPath("/workspace", locale)}?accessStop=error`);
  }

  const agent = Array.isArray(rental.agents) ? rental.agents[0] : rental.agents;

  revalidatePath(getUserHomePath(locale));
  revalidatePath(localizedPath("/workspace", locale));
  revalidatePath(localizedPath(`/workspace/${rental.id}`, locale));

  if (agent?.slug) {
    revalidatePath(localizedPath(`/agents/${agent.slug}`, locale));
  }

  redirect(`${localizedPath("/workspace", locale)}?accessStop=stopped`);
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAgentRuntimeType, type AgentRuntimeType } from "@/lib/agent-contract";
import { getUserHomePath, requireAuth } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import { createStripeCheckoutSession, retrieveStripeCheckoutSession } from "@/server/payments/stripe";
import { recordCreatorRevenueLedgerAccessStopped } from "@/server/payments/revenue-ledger";
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

type AgentVersionRuntimeRow = {
  execution_mode: string | null;
  runtime_type: string | null;
};

type RuntimeSettingRow = {
  enabled: boolean;
  run_enabled: boolean;
};

function redirectWithAgentError(locale: Locale, slug: string, error: string): never {
  redirect(`${localizedPath(`/agents/${slug}`, locale)}?error=${encodeURIComponent(error)}`);
}

function redirectWithAgentOrder(locale: Locale, slug: string, order: string): never {
  redirect(`${localizedPath(`/agents/${slug}`, locale)}?order=${encodeURIComponent(order)}`);
}

function revalidateAccessAndRevenueSurfaces(locale: Locale, rentalId?: string | null, agentSlug?: string | null) {
  revalidatePath(getUserHomePath(locale));
  revalidatePath(localizedPath("/workspace", locale));
  revalidatePath("/code");
  revalidatePath("/code/dashboard");
  revalidatePath("/code/admin");
  revalidatePath("/code/admin/ops");
  revalidatePath("/code/admin/payments");

  if (rentalId) {
    revalidatePath(localizedPath(`/workspace/${rentalId}`, locale));
  }

  if (agentSlug) {
    revalidatePath(localizedPath(`/agents/${agentSlug}`, locale));
    revalidatePath(`/agenthub/agents/${agentSlug}`);
    revalidatePath(`/agents/${agentSlug}`);
  }
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

function resolveRuntimeType(version: AgentVersionRuntimeRow): AgentRuntimeType {
  if (version.runtime_type && isAgentRuntimeType(version.runtime_type)) {
    return version.runtime_type;
  }

  return version.execution_mode === "llm_prompt" ? "llm_prompt" : "static_guided";
}

async function assertAgentRuntimeCanBeActivated(input: {
  agentVersionId: string;
  locale: Locale;
  slug: string;
}) {
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    redirectWithAgentError(input.locale, input.slug, "agent-runtime-unavailable");
  }

  const { data: version, error: versionError } = await serviceClient
    .from("agent_versions")
    .select("execution_mode,runtime_type")
    .eq("id", input.agentVersionId)
    .maybeSingle<AgentVersionRuntimeRow>();

  if (versionError || !version) {
    redirectWithAgentError(input.locale, input.slug, "agent-runtime-unavailable");
  }

  const runtimeType = resolveRuntimeType(version);
  const { data: runtimeSetting, error: runtimeError } = await serviceClient
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", runtimeType)
    .maybeSingle<RuntimeSettingRow>();

  if (runtimeError || !runtimeSetting?.enabled) {
    redirectWithAgentError(input.locale, input.slug, "agent-runtime-unavailable");
  }

  if (runtimeType !== "static_guided" && !runtimeSetting.run_enabled) {
    redirectWithAgentError(input.locale, input.slug, "agent-runtime-unavailable");
  }
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

  await assertAgentRuntimeCanBeActivated({
    agentVersionId: agent.active_version_id,
    locale,
    slug,
  });

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

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    redirectWithAgentError(locale, slug, "payment-service-unavailable");
  }

  const { data: access, error: insertError } = await serviceClient
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

  revalidateAccessAndRevenueSurfaces(locale, access.id, agent.slug);
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

  await recordCreatorRevenueLedgerAccessStopped({
    metadata: {
      source: "user_stop_access",
      previous_status: rental.status,
    },
    rentalRequestId: rental.id,
    supabase: serviceClient,
  });

  const agent = Array.isArray(rental.agents) ? rental.agents[0] : rental.agents;

  revalidateAccessAndRevenueSurfaces(locale, rental.id, agent?.slug);

  redirect(`${localizedPath("/workspace", locale)}?accessStop=stopped`);
}

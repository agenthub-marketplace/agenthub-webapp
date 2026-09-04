import "server-only";

import { revalidatePath } from "next/cache";

import { isAgentRuntimeType, type AgentRuntimeType } from "@/lib/agent-contract";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { recordCreatorRevenueLedgerEvent } from "@/server/payments/revenue-ledger";
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

type AgentVersionRuntimeRow = {
  execution_mode: string | null;
  runtime_type: string | null;
};

type RuntimeSettingRow = {
  enabled: boolean;
  run_enabled: boolean;
};

type PaymentActivationSurfaceRow = {
  agent_id: string;
  rental_request_id: string | null;
};

export type CheckoutSessionForFulfillment = {
  id: string;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | null;
  payment_status?: string;
};

function revalidatePaymentActivationSurfaces(agentSlug?: string | null, rentalRequestId?: string | null) {
  revalidatePath("/agenthub/workspace");
  revalidatePath("/en/workspace");
  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/agenthub/dashboard");
  revalidatePath("/en/dashboard");
  revalidatePath("/code");
  revalidatePath("/code/dashboard");
  revalidatePath("/code/admin");
  revalidatePath("/code/admin/ops");
  revalidatePath("/code/admin/payments");

  if (rentalRequestId) {
    revalidatePath(`/agenthub/workspace/${rentalRequestId}`);
    revalidatePath(`/en/workspace/${rentalRequestId}`);
    revalidatePath(`/workspace/${rentalRequestId}`);
  }

  if (agentSlug) {
    revalidatePath(`/agenthub/agents/${agentSlug}`);
    revalidatePath(`/agents/${agentSlug}`);
    revalidatePath(`/en/agents/${agentSlug}`);
  }
}

function resolveRuntimeType(version: AgentVersionRuntimeRow): AgentRuntimeType {
  if (version.runtime_type && isAgentRuntimeType(version.runtime_type)) {
    return version.runtime_type;
  }

  return version.execution_mode === "llm_prompt" ? "llm_prompt" : "static_guided";
}

async function isAgentRuntimeActivable(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  agentVersionId: string,
) {
  const { data: version, error: versionError } = await supabase
    .from("agent_versions")
    .select("execution_mode,runtime_type")
    .eq("id", agentVersionId)
    .maybeSingle<AgentVersionRuntimeRow>();

  if (versionError || !version) {
    return false;
  }

  const runtimeType = resolveRuntimeType(version);
  const { data: runtimeSetting, error: runtimeError } = await supabase
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", runtimeType)
    .maybeSingle<RuntimeSettingRow>();

  if (runtimeError || !runtimeSetting?.enabled) {
    return false;
  }

  return runtimeType === "static_guided" || runtimeSetting.run_enabled;
}

async function loadPaymentActivationSurface(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  input: { paymentId?: string; sessionId?: string },
) {
  let query = supabase.from("payments").select("agent_id,rental_request_id");

  if (input.paymentId) {
    query = query.eq("id", input.paymentId);
  } else if (input.sessionId) {
    query = query.eq("stripe_checkout_session_id", input.sessionId);
  } else {
    return { agentSlug: null, rentalRequestId: null };
  }

  const { data: payment } = await query.maybeSingle<PaymentActivationSurfaceRow>();

  if (!payment) {
    return { agentSlug: null, rentalRequestId: null };
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("slug")
    .eq("id", payment.agent_id)
    .maybeSingle<{ slug: string | null }>();

  return {
    agentSlug: agent?.slug ?? null,
    rentalRequestId: payment.rental_request_id ?? null,
  };
}

export async function markPaymentCancelled(sessionId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  const surface = await loadPaymentActivationSurface(supabase, { sessionId });

  await supabase
    .from("payments")
    .update({ status: "cancelled" })
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "pending");
  revalidatePaymentActivationSurfaces(surface.agentSlug, surface.rentalRequestId);
}

export async function markPaymentFailed(paymentId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  const surface = await loadPaymentActivationSurface(supabase, { paymentId });

  await supabase.from("payments").update({ status: "failed" }).eq("id", paymentId).eq("status", "pending");
  revalidatePaymentActivationSurfaces(surface.agentSlug, surface.rentalRequestId);
}

export async function markPaymentBlocked(paymentId: string, activationError: ActivationError) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  const surface = await loadPaymentActivationSurface(supabase, { paymentId });

  const { data: blockedPayment, error: blockedPaymentError } = await supabase
    .from("payments")
    .update({
      status: "paid_blocked",
      activation_error: activationError,
    })
    .eq("id", paymentId)
    .in("status", ["pending", "cancelled", "failed"])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (blockedPaymentError || !blockedPayment) {
    revalidatePaymentActivationSurfaces(surface.agentSlug, surface.rentalRequestId);
    return;
  }

  await recordCreatorRevenueLedgerEvent({
    eventType: "activation_blocked",
    metadata: {
      activation_error: activationError,
    },
    paymentId,
    supabase,
  });
  revalidatePaymentActivationSurfaces(surface.agentSlug, surface.rentalRequestId);
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
    await recordCreatorRevenueLedgerEvent({
      eventType: "payment_paid",
      paymentId: payment.id,
      supabase,
    });
    await recordCreatorRevenueLedgerEvent({
      eventType: "access_created",
      paymentId: payment.id,
      rentalRequestId: payment.rental_request_id,
      supabase,
    });
    revalidatePaymentActivationSurfaces(null, payment.rental_request_id);
    return;
  }

  if (payment.status === "paid_blocked") {
    await recordCreatorRevenueLedgerEvent({
      eventType: "activation_blocked",
      metadata: {
        activation_error: payment.activation_error,
      },
      paymentId: payment.id,
      supabase,
    });
    revalidatePaymentActivationSurfaces();
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

  if (!(await isAgentRuntimeActivable(supabase, agentVersionId))) {
    await markPaymentBlocked(payment.id, "unknown_error");
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

    await recordCreatorRevenueLedgerEvent({
      eventType: "payment_paid",
      paymentId: payment.id,
      supabase,
    });
    await recordCreatorRevenueLedgerEvent({
      eventType: "access_created",
      paymentId: payment.id,
      rentalRequestId: existingAccess.id,
      supabase,
    });
    revalidatePaymentActivationSurfaces(agent.slug, existingAccess.id);

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

  await recordCreatorRevenueLedgerEvent({
    eventType: "payment_paid",
    paymentId: payment.id,
    supabase,
  });
  await recordCreatorRevenueLedgerEvent({
    eventType: "access_created",
    paymentId: payment.id,
    rentalRequestId: access.id,
    supabase,
  });
  revalidatePaymentActivationSurfaces(agent.slug, access.id);
}

import "server-only";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
import { getAgentTemplateByLabel } from "@/lib/agent-templates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";

export type UserRental = {
  id: string;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "rejected" | "cancelled" | "active" | "stopped" | "expired";
  pricingType: "task" | "project";
  priceCents: number | null;
  currency: string;
  requestBrief: string;
  requiredInputs: {
    constraints?: string;
    context?: string;
    deadline?: string;
    objective?: string;
    output_format?: string;
  } | null;
  createdAt: string;
  agent: {
    name: string;
    slug: string;
    summary: string;
    description: string;
    status: string;
    pricingType: "task" | "project";
    priceCents: number | null;
    currency: string;
    capabilities: string[];
    requiredInputsList: string[];
    deliverables: string[];
    limitations: string[];
    workspaceActions: string[];
    workspaceActionsEn: string[];
    dataHandlingNotes: string | null;
    contract: AgentContract;
  } | null;
  accessOpen: boolean;
  result: {
    summary: string;
    deliveredAt: string | null;
  } | null;
  review: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
  } | null;
};

export type UserPaymentOrder = {
  id: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "paid_blocked";
  activationError: string | null;
  amountCents: number;
  currency: string;
  createdAt: string;
  checkoutSessionId: string | null;
  rentalRequestId: string | null;
  rentalStatus: UserRental["status"] | null;
  agent: {
    name: string;
    slug: string;
    summary: string;
  } | null;
};

export const ACCESS_COMPATIBLE_STATUSES = ACCESS_OPEN_STATUSES;
const OPEN_ACCESS_STATUSES = new Set<string>(ACCESS_COMPATIBLE_STATUSES);

export type UserAgentOrderState =
  | {
      kind: "open_access";
      rentalId: string;
      status: UserRental["status"];
      pricingType: "task" | "project";
      priceCents: number | null;
      currency: string;
      createdAt: string;
    }
  | {
      kind: "stopped_access";
      rentalId: string;
      status: "stopped" | "expired";
      pricingType: "task" | "project";
      priceCents: number | null;
      currency: string;
      createdAt: string;
    }
  | {
      kind: "payment_pending";
      paymentId: string;
      checkoutSessionId: string | null;
      amountCents: number;
      currency: string;
      createdAt: string;
    }
  | {
      kind: "activation_pending";
      paymentId: string;
      checkoutSessionId: string | null;
      amountCents: number;
      currency: string;
      createdAt: string;
    }
  | {
      kind: "activation_blocked";
      paymentId: string;
      checkoutSessionId: string | null;
      amountCents: number;
      currency: string;
      createdAt: string;
      activationError: string | null;
    };

type UserRentalRow = {
  id: string;
  status: UserRental["status"];
  pricing_type: "task" | "project";
  quoted_price_cents: number | null;
  currency: string;
  request_brief: string;
  required_inputs: UserRental["requiredInputs"];
  created_at: string;
  agents:
    | {
        name: string;
        slug: string;
        summary: string;
        description: string;
        status: string;
        pricing_type: "task" | "project";
        starting_price_cents: number | null;
        currency: string;
        agent_versions:
          | {
              capabilities: string[] | null;
              required_inputs: string[] | null;
              deliverables: string[] | null;
              limitations: string[] | null;
              data_handling_notes: string | null;
              workspace_mode?: string | null;
              setup_requirements?: unknown;
              output_promise?: unknown;
              execution_mode?: string | null;
              data_policy?: unknown;
            }
          | {
              capabilities: string[] | null;
              required_inputs: string[] | null;
              deliverables: string[] | null;
              limitations: string[] | null;
              data_handling_notes: string | null;
              workspace_mode?: string | null;
              setup_requirements?: unknown;
              output_promise?: unknown;
              execution_mode?: string | null;
              data_policy?: unknown;
            }[]
          | null;
      }
    | {
        name: string;
        slug: string;
        summary: string;
        description: string;
        status: string;
        pricing_type: "task" | "project";
        starting_price_cents: number | null;
        currency: string;
        agent_versions:
          | {
              capabilities: string[] | null;
              required_inputs: string[] | null;
              deliverables: string[] | null;
              limitations: string[] | null;
              data_handling_notes: string | null;
              workspace_mode?: string | null;
              setup_requirements?: unknown;
              output_promise?: unknown;
              execution_mode?: string | null;
              data_policy?: unknown;
            }
          | {
              capabilities: string[] | null;
              required_inputs: string[] | null;
              deliverables: string[] | null;
              limitations: string[] | null;
              data_handling_notes: string | null;
              workspace_mode?: string | null;
              setup_requirements?: unknown;
              output_promise?: unknown;
              execution_mode?: string | null;
              data_policy?: unknown;
            }[]
          | null;
      }[]
    | null;
  rental_results: { summary: string; delivered_at: string | null } | { summary: string; delivered_at: string | null }[] | null;
  agent_reviews:
    | {
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
      }
    | {
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
      }[]
    | null;
};

type AccessStateRentalRow = {
  id: string;
  status: UserRental["status"];
  pricing_type: "task" | "project";
  quoted_price_cents: number | null;
  currency: string;
  created_at: string;
};

type AccessStatePaymentRow = {
  id: string;
  status: UserPaymentOrder["status"];
  activation_error: string | null;
  rental_request_id: string | null;
  stripe_checkout_session_id: string | null;
  amount_cents: number;
  currency: string;
  created_at: string;
};

type UserPaymentOrderRow = {
  id: string;
  status: UserPaymentOrder["status"];
  activation_error: string | null;
  amount_cents: number;
  currency: string;
  created_at: string;
  stripe_checkout_session_id: string | null;
  rental_request_id: string | null;
  agents:
    | {
        name: string;
        slug: string;
        summary: string;
      }
    | {
        name: string;
        slug: string;
        summary: string;
      }[]
    | null;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

const USER_RENTAL_SELECT_WITH_CONTRACT =
  "id,status,pricing_type,quoted_price_cents,currency,request_brief,required_inputs,created_at,agents!rental_requests_agent_id_fkey(name,slug,summary,description,status,pricing_type,starting_price_cents,currency,agent_versions!agents_active_version_id_fkey(capabilities,required_inputs,deliverables,limitations,data_handling_notes,workspace_mode,setup_requirements,output_promise,execution_mode,data_policy)),rental_results!rental_results_rental_request_id_fkey(summary,delivered_at),agent_reviews!agent_reviews_rental_request_id_fkey(id,rating,title,body)";

const USER_RENTAL_SELECT_LEGACY =
  "id,status,pricing_type,quoted_price_cents,currency,request_brief,required_inputs,created_at,agents!rental_requests_agent_id_fkey(name,slug,summary,description,status,pricing_type,starting_price_cents,currency,agent_versions!agents_active_version_id_fkey(capabilities,required_inputs,deliverables,limitations,data_handling_notes)),rental_results!rental_results_rental_request_id_fkey(summary,delivered_at),agent_reviews!agent_reviews_rental_request_id_fkey(id,rating,title,body)";

function isMissingAgentContractSchemaError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  const errorText = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    errorText.includes("workspace_mode") ||
    errorText.includes("setup_requirements") ||
    errorText.includes("output_promise") ||
    errorText.includes("execution_mode") ||
    errorText.includes("data_policy") ||
    (errorText.includes("schema cache") && errorText.includes("agent_versions"))
  );
}

function isMissingPaymentsSchemaError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  const errorText = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return errorText.includes("payments") || errorText.includes("schema cache");
}

function dedupeOpenAccessRentals(rentals: UserRental[]) {
  const seenOpenAgentKeys = new Set<string>();
  const deduped: UserRental[] = [];

  for (const rental of rentals) {
    const agentKey = rental.agent?.slug || rental.agent?.name || rental.id;

    if (rental.accessOpen) {
      if (seenOpenAgentKeys.has(agentKey)) {
        continue;
      }

      seenOpenAgentKeys.add(agentKey);
    }

    deduped.push(rental);
  }

  return deduped;
}

export async function getUserAgentOrderState(userId: string, agentId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { state: null, error: "missing-config" };
  }

  const { data: rentals, error: rentalError } = await supabase
    .from("rental_requests")
    .select("id,status,pricing_type,quoted_price_cents,currency,created_at")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .returns<AccessStateRentalRow[]>();

  if (rentalError) {
    return { state: null, error: "access-state-load-failed" };
  }

  const openAccess = (rentals ?? []).find((rental) => OPEN_ACCESS_STATUSES.has(rental.status));

  if (openAccess) {
    return {
      state: {
        kind: "open_access" as const,
        rentalId: openAccess.id,
        status: openAccess.status,
        pricingType: openAccess.pricing_type,
        priceCents: openAccess.quoted_price_cents,
        currency: openAccess.currency,
        createdAt: openAccess.created_at,
      },
      error: null,
    };
  }

  const { data: payments, error: paymentError } = await supabase
    .from("payments")
    .select("id,status,activation_error,rental_request_id,stripe_checkout_session_id,amount_cents,currency,created_at")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .in("status", ["pending", "paid", "paid_blocked"])
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<AccessStatePaymentRow[]>();

  if (paymentError && !isMissingPaymentsSchemaError(paymentError)) {
    return { state: null, error: "payment-state-load-failed" };
  }

  const payment = payments?.[0] ?? null;

  if (payment?.status === "paid" && payment.rental_request_id) {
    const linkedRental = (rentals ?? []).find((rental) => rental.id === payment.rental_request_id);

    if (linkedRental && OPEN_ACCESS_STATUSES.has(linkedRental.status)) {
      return {
        state: {
          kind: "open_access" as const,
          rentalId: linkedRental.id,
          status: linkedRental.status,
          pricingType: linkedRental.pricing_type,
          priceCents: linkedRental.quoted_price_cents,
          currency: linkedRental.currency,
          createdAt: linkedRental.created_at,
        },
        error: null,
      };
    }
  }

  if (payment?.status === "paid" && !payment.rental_request_id) {
    return {
      state: {
        kind: "activation_pending" as const,
        paymentId: payment.id,
        checkoutSessionId: payment.stripe_checkout_session_id,
        amountCents: payment.amount_cents,
        currency: payment.currency,
        createdAt: payment.created_at,
      },
      error: null,
    };
  }

  if (payment?.status === "pending") {
    return {
      state: {
        kind: "payment_pending" as const,
        paymentId: payment.id,
        checkoutSessionId: payment.stripe_checkout_session_id,
        amountCents: payment.amount_cents,
        currency: payment.currency,
        createdAt: payment.created_at,
      },
      error: null,
    };
  }

  if (payment?.status === "paid_blocked") {
    return {
      state: {
        kind: "activation_blocked" as const,
        paymentId: payment.id,
        checkoutSessionId: payment.stripe_checkout_session_id,
        amountCents: payment.amount_cents,
        currency: payment.currency,
        createdAt: payment.created_at,
        activationError: payment.activation_error,
      },
      error: null,
    };
  }

  const stoppedAccess = (rentals ?? []).find((rental) => rental.status === "stopped" || rental.status === "expired");

  if (stoppedAccess) {
    return {
      state: {
        kind: "stopped_access" as const,
        rentalId: stoppedAccess.id,
        status: stoppedAccess.status === "expired" ? "expired" : "stopped",
        pricingType: stoppedAccess.pricing_type,
        priceCents: stoppedAccess.quoted_price_cents,
        currency: stoppedAccess.currency,
        createdAt: stoppedAccess.created_at,
      },
      error: null,
    };
  }

  return { state: null, error: null };
}

export async function getUserRentals(userId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { rentals: [], error: "missing-config" };
  }

  let { data, error } = await supabase
    .from("rental_requests")
    .select(USER_RENTAL_SELECT_WITH_CONTRACT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserRentalRow[]>();

  if (error && isMissingAgentContractSchemaError(error)) {
    console.warn("Agent contract columns unavailable; retrying legacy user rentals query", {
      code: error.code,
      message: error.message,
    });

    ({ data, error } = await supabase
      .from("rental_requests")
      .select(USER_RENTAL_SELECT_LEGACY)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<UserRentalRow[]>());
  }

  if (error) {
    return { rentals: [], error: "rentals-load-failed" };
  }

  const rentals = (data ?? []).map((rental) => {
      const agent = readSingle(rental.agents);
      const version = readSingle(agent?.agent_versions ?? null);
      const template = getAgentTemplateByLabel(agent?.name ?? "");
      const contract = normalizeAgentContract({
        workspaceMode: version?.workspace_mode,
        setupRequirements: version?.setup_requirements,
        outputPromise: version?.output_promise,
        executionMode: version?.execution_mode,
        dataPolicy: version?.data_policy,
      });
      const mappedAgent = agent
        ? {
            name: agent.name,
            slug: agent.slug,
            summary: agent.summary,
            description: agent.description,
            status: agent.status,
            pricingType: agent.pricing_type,
            priceCents: agent.starting_price_cents,
            currency: agent.currency,
            capabilities: version?.capabilities ?? [],
            requiredInputsList: version?.required_inputs ?? [],
            deliverables: version?.deliverables ?? [],
            limitations: version?.limitations ?? [],
            workspaceActions: template?.workspace_actions ?? [],
            workspaceActionsEn: template?.workspace_actions_en ?? [],
            dataHandlingNotes: version?.data_handling_notes ?? null,
            contract,
          }
        : null;

      return {
        id: rental.id,
        status: rental.status,
        pricingType: rental.pricing_type,
        priceCents: rental.quoted_price_cents,
        currency: rental.currency,
        requestBrief: rental.request_brief,
        requiredInputs: rental.required_inputs,
        createdAt: rental.created_at,
        agent: mappedAgent,
        accessOpen: (ACCESS_COMPATIBLE_STATUSES as readonly string[]).includes(rental.status) && mappedAgent?.status === "approved",
        result: (() => {
        const result = readSingle(rental.rental_results);
        return result
          ? {
              summary: result.summary,
              deliveredAt: result.delivered_at,
            }
          : null;
        })(),
        review: (() => {
        const review = readSingle(rental.agent_reviews);
        return review
          ? {
              id: review.id,
              rating: review.rating,
              title: review.title,
              body: review.body,
            }
          : null;
        })(),
      };
    });

  return {
    rentals: dedupeOpenAccessRentals(rentals),
    error: null,
  };
}

export async function getUserPaymentOrders(userId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { payments: [], error: "missing-config" };
  }

  const { data, error } = await supabase
    .from("payments")
    .select("id,status,activation_error,amount_cents,currency,created_at,stripe_checkout_session_id,rental_request_id,agents!payments_agent_id_fkey(name,slug,summary)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserPaymentOrderRow[]>();

  if (error) {
    if (isMissingPaymentsSchemaError(error)) {
      return { payments: [], error: null };
    }

    return { payments: [], error: "payments-load-failed" };
  }

  const rentalIds = (data ?? [])
    .map((payment) => payment.rental_request_id)
    .filter((id): id is string => Boolean(id));
  let rentalStatusById = new Map<string, UserRental["status"]>();

  if (rentalIds.length > 0) {
    const { data: rentalRows } = await supabase
      .from("rental_requests")
      .select("id,status")
      .eq("user_id", userId)
      .in("id", rentalIds)
      .returns<{ id: string; status: UserRental["status"] }[]>();

    rentalStatusById = new Map((rentalRows ?? []).map((rental) => [rental.id, rental.status]));
  }

  return {
    payments: (data ?? []).map((payment) => {
      const agent = readSingle(payment.agents);

      return {
        id: payment.id,
        status: payment.status,
        activationError: payment.activation_error,
        amountCents: payment.amount_cents,
        currency: payment.currency,
        createdAt: payment.created_at,
        checkoutSessionId: payment.stripe_checkout_session_id,
        rentalRequestId: payment.rental_request_id,
        rentalStatus: payment.rental_request_id ? rentalStatusById.get(payment.rental_request_id) ?? null : null,
        agent: agent
          ? {
              name: agent.name,
              slug: agent.slug,
              summary: agent.summary,
            }
          : null,
      };
    }),
    error: null,
  };
}

export async function getUserRentalById(userId: string, rentalId: string) {
  const result = await getUserRentals(userId);

  return {
    rental: result.rentals.find((rental) => rental.id === rentalId) ?? null,
    error: result.error,
  };
}

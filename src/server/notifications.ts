import "server-only";

import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";

type NotificationTone = "info" | "success" | "warning" | "error";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: NotificationTone;
  createdAt: string | null;
};

type CreatorAgentNotificationRow = {
  id: string;
  name: string;
  status: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended";
  updated_at: string;
};

type CreatorRuntimeAssetNotificationRow = {
  id: string;
  name?: string | null;
  status: "submitted" | "approved" | "rejected" | "suspended";
  updated_at: string;
};

type CreatorWorkflowNotificationRow = {
  id: string;
  status: "submitted" | "approved" | "rejected" | "suspended";
  updated_at: string;
  agents:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type CreatorSecurityReviewNotificationRow = {
  id: string;
  agent_id: string | null;
  runtime_type: string;
  status: "pending" | "in_review" | "passed" | "failed" | "waived";
  updated_at: string;
  agents:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type CountResult = {
  count: number | null;
  error: unknown;
};

type UserPaymentNotificationRow = {
  id: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "paid_blocked";
  activation_error: string | null;
  rental_request_id: string | null;
  created_at: string;
  agents:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
};

type UserAccessNotificationRow = {
  id: string;
  status: string;
  created_at: string;
  agents:
    | {
        name: string;
        slug: string;
        status: string;
      }
    | {
        name: string;
        slug: string;
        status: string;
      }[]
    | null;
};

type UserRunNotificationRow = {
  rental_request_id: string | null;
  status: "failed" | "running" | "succeeded";
  created_at: string;
};

type UserReviewNotificationRow = {
  rental_request_id: string;
  id: string;
};

type AdminReviewNotificationRow = {
  id: string;
  agent_id: string;
  decision: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "suspended";
  notes: string | null;
  created_at: string;
};

function toneForDecision(decision: AdminReviewNotificationRow["decision"]): NotificationTone {
  if (decision === "approved") {
    return "success";
  }

  if (decision === "rejected") {
    return "error";
  }

  if (decision === "in_review") {
    return "warning";
  }

  return "info";
}

function hasChangesRequest(notes: string | null) {
  return Boolean(notes?.trim());
}

function cleanAdminNotes(notes: string | null) {
  return (notes || "")
    .replace(/^\s*Modifications demandées\s*:\s*/i, "")
    .trim();
}

function titleForDecision(decision: AdminReviewNotificationRow["decision"], notes: string | null = null) {
  if (decision === "approved") {
    return "Agent approuvé";
  }

  if (decision === "rejected") {
    return "Agent refusé";
  }

  if (decision === "in_review") {
    return hasChangesRequest(notes) ? "Modifications demandées" : "Agent en revue";
  }

  return "Mise à jour admin";
}

function titleForRuntimeAsset(status: CreatorRuntimeAssetNotificationRow["status"], label: string) {
  if (status === "submitted") {
    return `${label} en validation`;
  }

  if (status === "rejected") {
    return `${label} refusé`;
  }

  if (status === "suspended") {
    return `${label} suspendu`;
  }

  return `${label} approuvé`;
}

function toneForRuntimeAsset(status: CreatorRuntimeAssetNotificationRow["status"]): NotificationTone {
  if (status === "rejected" || status === "suspended") {
    return "error";
  }

  if (status === "submitted") {
    return "warning";
  }

  return "success";
}

function countValue(result: CountResult) {
  return result.error ? 0 : result.count ?? 0;
}

function pluralizeAgent(count: number) {
  return `agent${count === 1 ? "" : "s"}`;
}

function pluralizeEndpoint(count: number) {
  return `endpoint${count === 1 ? "" : "s"}`;
}

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function isMissingOptionalTableError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  const errorText = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return errorText.includes("schema cache") || errorText.includes("does not exist");
}

async function appendUserJourneyNotifications(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  notifications: AppNotification[],
) {
  const { data: payments, error: paymentError } = await supabase
    .from("payments")
    .select("id,status,activation_error,rental_request_id,created_at,agents!payments_agent_id_fkey(name,slug)")
    .eq("user_id", userId)
    .in("status", ["pending", "paid", "paid_blocked"])
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<UserPaymentNotificationRow[]>();

  if (!paymentError) {
    for (const payment of payments ?? []) {
      const agent = readSingle(payment.agents);
      const agentName = agent?.name ?? "Votre agent";

      if (payment.status === "paid_blocked") {
        notifications.push({
          id: `user-payment-blocked-${payment.id}`,
          title: "Activation bloquée",
          body: `${agentName} est payé, mais l’accès nécessite une vérification AgentHub.`,
          href: "/agenthub/dashboard",
          tone: "error",
          createdAt: payment.created_at,
        });
        continue;
      }

      if (payment.status === "pending") {
        notifications.push({
          id: `user-payment-pending-${payment.id}`,
          title: "Paiement en attente",
          body: `${agentName} attend encore la confirmation Stripe sandbox.`,
          href: agent?.slug ? `/agenthub/agents/${agent.slug}` : "/agenthub/dashboard",
          tone: "warning",
          createdAt: payment.created_at,
        });
        continue;
      }

      if (payment.status === "paid" && !payment.rental_request_id) {
        notifications.push({
          id: `user-activation-pending-${payment.id}`,
          title: "Activation en cours",
          body: `${agentName} est payé. L’accès sera visible dès que le webhook confirme l’activation.`,
          href: "/agenthub/dashboard",
          tone: "info",
          createdAt: payment.created_at,
        });
      }
    }
  }

  const { data: accesses, error: accessError } = await supabase
    .from("rental_requests")
    .select("id,status,created_at,agents!rental_requests_agent_id_fkey(name,slug,status)")
    .eq("user_id", userId)
    .in("status", ACCESS_OPEN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<UserAccessNotificationRow[]>();

  if (accessError || !accesses?.length) {
    return;
  }

  const rentalIds = accesses.map((access) => access.id);
  const [runsResult, reviewsResult] = await Promise.all([
    supabase
      .from("agent_runs")
      .select("rental_request_id,status,created_at")
      .eq("user_id", userId)
      .in("rental_request_id", rentalIds)
      .returns<UserRunNotificationRow[]>(),
    supabase
      .from("agent_reviews")
      .select("id,rental_request_id")
      .in("rental_request_id", rentalIds)
      .returns<UserReviewNotificationRow[]>(),
  ]);

  const runs = runsResult.error && isMissingOptionalTableError(runsResult.error) ? [] : runsResult.data ?? [];
  const reviews = reviewsResult.error ? [] : reviewsResult.data ?? [];
  const runCountByRental = new Map<string, { latestRunAt: string | null; succeeded: number; total: number }>();
  const reviewedRentalIds = new Set(reviews.map((review) => review.rental_request_id));

  for (const run of runs) {
    if (!run.rental_request_id) {
      continue;
    }

    const current = runCountByRental.get(run.rental_request_id) ?? { latestRunAt: null, succeeded: 0, total: 0 };
    const isNewer = !current.latestRunAt || new Date(run.created_at).getTime() > new Date(current.latestRunAt).getTime();

    runCountByRental.set(run.rental_request_id, {
      latestRunAt: isNewer ? run.created_at : current.latestRunAt,
      succeeded: current.succeeded + (run.status === "succeeded" ? 1 : 0),
      total: current.total + 1,
    });
  }

  for (const access of accesses) {
    const agent = readSingle(access.agents);
    const agentName = agent?.name ?? "Votre agent";

    if (agent?.status && agent.status !== "approved") {
      continue;
    }

    const runSummary = runCountByRental.get(access.id);

    if (!runSummary || runSummary.total === 0) {
      notifications.push({
        id: `user-first-run-${access.id}`,
        title: "Workspace prêt",
        body: `${agentName} est activé. Lancez une première action pour créer un résultat stocké.`,
        href: `/agenthub/workspace/${access.id}`,
        tone: "success",
        createdAt: access.created_at,
      });
      continue;
    }

    if (runSummary.succeeded > 0 && !reviewedRentalIds.has(access.id)) {
      notifications.push({
        id: `user-review-ready-${access.id}`,
        title: "Avis vérifié disponible",
        body: `${agentName} a déjà produit un résultat. Laissez un avis pour compléter la boucle beta.`,
        href: `/agenthub/workspace/${access.id}`,
        tone: "info",
        createdAt: runSummary.latestRunAt ?? access.created_at,
      });
    }
  }
}

async function appendCreatorRuntimeNotifications(input: {
  agentIds: string[];
  creatorId: string;
  notifications: AppNotification[];
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
}) {
  const { agentIds, creatorId, notifications, supabase } = input;
  const [
    workflowEndpointsResult,
    apiEndpointsResult,
    workflowsResult,
    endpointConfigsResult,
  ] = await Promise.all([
    supabase
      .from("creator_webhook_endpoints")
      .select("id,name,status,updated_at")
      .eq("creator_id", creatorId)
      .in("status", ["submitted", "rejected", "suspended"])
      .order("updated_at", { ascending: false })
      .limit(3)
      .returns<CreatorRuntimeAssetNotificationRow[]>(),
    supabase
      .from("creator_api_endpoints")
      .select("id,name,status,updated_at")
      .eq("creator_id", creatorId)
      .in("status", ["submitted", "rejected", "suspended"])
      .order("updated_at", { ascending: false })
      .limit(3)
      .returns<CreatorRuntimeAssetNotificationRow[]>(),
    supabase
      .from("agent_version_workflows")
      .select("id,status,updated_at,agents(name)")
      .eq("creator_id", creatorId)
      .in("status", ["submitted", "rejected", "suspended"])
      .order("updated_at", { ascending: false })
      .limit(3)
      .returns<CreatorWorkflowNotificationRow[]>(),
    supabase
      .from("agent_version_creator_endpoints")
      .select("id,status,updated_at,agents(name)")
      .eq("creator_id", creatorId)
      .in("status", ["submitted", "rejected", "suspended"])
      .order("updated_at", { ascending: false })
      .limit(3)
      .returns<CreatorWorkflowNotificationRow[]>(),
  ]);

  if (!workflowEndpointsResult.error) {
    for (const endpoint of workflowEndpointsResult.data ?? []) {
      notifications.push({
        id: `creator-webhook-endpoint-${endpoint.id}-${endpoint.status}`,
        title: titleForRuntimeAsset(endpoint.status, "Webhook workflow"),
        body:
          endpoint.status === "submitted"
            ? `${endpoint.name ?? "Votre webhook"} attend la validation admin avant usage dans un agent workflow.`
            : `${endpoint.name ?? "Votre webhook"} nécessite une action avant de pouvoir être réutilisé.`,
        href: "/code/agents",
        tone: toneForRuntimeAsset(endpoint.status),
        createdAt: endpoint.updated_at,
      });
    }
  }

  if (!apiEndpointsResult.error) {
    for (const endpoint of apiEndpointsResult.data ?? []) {
      notifications.push({
        id: `creator-api-endpoint-${endpoint.id}-${endpoint.status}`,
        title: titleForRuntimeAsset(endpoint.status, "Endpoint API"),
        body:
          endpoint.status === "submitted"
            ? `${endpoint.name ?? "Votre endpoint"} attend la validation admin avant publication d’un Agent API.`
            : `${endpoint.name ?? "Votre endpoint"} doit être corrigé ou remplacé avant publication.`,
        href: "/code/agents",
        tone: toneForRuntimeAsset(endpoint.status),
        createdAt: endpoint.updated_at,
      });
    }
  }

  if (!workflowsResult.error) {
    for (const workflow of workflowsResult.data ?? []) {
      const agent = readSingle(workflow.agents);
      notifications.push({
        id: `creator-workflow-${workflow.id}-${workflow.status}`,
        title: titleForRuntimeAsset(workflow.status, "Workflow"),
        body:
          workflow.status === "submitted"
            ? `${agent?.name ?? "Votre agent workflow"} attend la validation des étapes runtime.`
            : `${agent?.name ?? "Votre agent workflow"} a un workflow à corriger avant publication.`,
        href: "/code/agents",
        tone: toneForRuntimeAsset(workflow.status),
        createdAt: workflow.updated_at,
      });
    }
  }

  if (!endpointConfigsResult.error) {
    for (const endpointConfig of endpointConfigsResult.data ?? []) {
      const agent = readSingle(endpointConfig.agents);
      notifications.push({
        id: `creator-endpoint-config-${endpointConfig.id}-${endpointConfig.status}`,
        title: titleForRuntimeAsset(endpointConfig.status, "Agent API"),
        body:
          endpointConfig.status === "submitted"
            ? `${agent?.name ?? "Votre Agent API"} attend la validation de sa configuration endpoint.`
            : `${agent?.name ?? "Votre Agent API"} nécessite une correction endpoint avant publication.`,
        href: "/code/agents",
        tone: toneForRuntimeAsset(endpointConfig.status),
        createdAt: endpointConfig.updated_at,
      });
    }
  }

  if (agentIds.length === 0) {
    return;
  }

  const serviceSupabase = createSupabaseServiceClient();

  if (!serviceSupabase) {
    return;
  }

  const { data: securityReviews, error: securityError } = await serviceSupabase
    .from("security_reviews")
    .select("id,agent_id,runtime_type,status,updated_at,agents(name)")
    .in("agent_id", agentIds)
    .in("status", ["pending", "in_review", "failed"])
    .order("updated_at", { ascending: false })
    .limit(5)
    .returns<CreatorSecurityReviewNotificationRow[]>();

  if (securityError && !isMissingOptionalTableError(securityError)) {
    return;
  }

  for (const review of securityReviews ?? []) {
    const agent = readSingle(review.agents);
    notifications.push({
      id: `creator-security-review-${review.id}-${review.status}`,
      title: review.status === "failed" ? "Security review à corriger" : "Security review en attente",
      body:
        review.status === "failed"
          ? `${agent?.name ?? "Un agent avancé"} a échoué à la review sécurité. Corrigez avant publication.`
          : `${agent?.name ?? "Un agent avancé"} attend une décision sécurité avant publication marketplace.`,
      href: "/code/agents",
      tone: review.status === "failed" ? "error" : "warning",
      createdAt: review.updated_at,
    });
  }
}

export async function getCurrentUserNotifications(): Promise<AppNotification[]> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  if (!profile || !supabase) {
    return [];
  }

  const notifications: AppNotification[] = [];

  await appendUserJourneyNotifications(supabase, profile.id, notifications);

  if (profile.role === "admin") {
    const [
      reviewQueueResult,
      workflowEndpointResult,
      creatorEndpointResult,
      workflowAssetResult,
      creatorEndpointAssetResult,
      securityReviewResult,
      pendingPaymentResult,
      blockedPaymentResult,
    ] = await Promise.all([
      supabase.from("agents").select("id", { count: "exact", head: true }).in("status", ["submitted", "in_review"]),
      supabase.from("creator_webhook_endpoints").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("creator_api_endpoints").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("agent_version_workflows").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("agent_version_creator_endpoints").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("security_reviews").select("id", { count: "exact", head: true }).in("status", ["pending", "in_review"]),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid_blocked"),
    ]);

    const reviewQueueCount = countValue(reviewQueueResult);
    const endpointCount = countValue(workflowEndpointResult) + countValue(creatorEndpointResult);
    const workflowAssetCount = countValue(workflowAssetResult) + countValue(creatorEndpointAssetResult);
    const securityReviewCount = countValue(securityReviewResult);
    const pendingPaymentCount = countValue(pendingPaymentResult);
    const blockedPaymentCount = countValue(blockedPaymentResult);

    if (reviewQueueCount > 0) {
      notifications.push({
        id: "admin-review-queue",
        title: "File de validation",
        body: `${reviewQueueCount} ${pluralizeAgent(reviewQueueCount)} à vérifier dans le panneau admin.`,
        href: "/code/admin/review",
        tone: "warning",
        createdAt: null,
      });
    }

    if (workflowAssetCount > 0) {
      notifications.push({
        id: "admin-workflow-assets",
        title: "Assets runtime à valider",
        body: `${workflowAssetCount} asset${workflowAssetCount === 1 ? "" : "s"} workflow/API attendent une décision admin.`,
        href: "/code/admin/review",
        tone: "warning",
        createdAt: null,
      });
    }

    if (endpointCount > 0) {
      notifications.push({
        id: "admin-endpoints-submitted",
        title: "Endpoints creator à vérifier",
        body: `${endpointCount} ${pluralizeEndpoint(endpointCount)} webhook/API attendent une validation.`,
        href: "/code/admin/endpoints",
        tone: "warning",
        createdAt: null,
      });
    }

    if (securityReviewCount > 0) {
      notifications.push({
        id: "admin-security-reviews",
        title: "Security reviews ouvertes",
        body: `${securityReviewCount} review${securityReviewCount === 1 ? "" : "s"} sécurité à traiter avant publication avancée.`,
        href: "/code/admin/security/reviews",
        tone: "error",
        createdAt: null,
      });
    }

    if (blockedPaymentCount > 0) {
      notifications.push({
        id: "admin-payments-blocked",
        title: "Paiements à surveiller",
        body: `${blockedPaymentCount} activation${blockedPaymentCount === 1 ? "" : "s"} bloquée${blockedPaymentCount === 1 ? "" : "s"} après paiement.`,
        href: "/code/admin/payments",
        tone: "error",
        createdAt: null,
      });
    }

    if (pendingPaymentCount > 0) {
      notifications.push({
        id: "admin-payments-pending",
        title: "Paiements en attente",
        body: `${pendingPaymentCount} paiement${pendingPaymentCount === 1 ? "" : "s"} sandbox encore ouvert${pendingPaymentCount === 1 ? "" : "s"}.`,
        href: "/code/admin/ops",
        tone: "info",
        createdAt: null,
      });
    }
  }

  if (profile.role === "creator" || profile.role === "admin") {
    const creatorProfile = await getCreatorProfileForUser();

    if (!creatorProfile.error && creatorProfile.id) {
      const { data: agents } = await supabase
        .from("agents")
        .select("id,name,status,updated_at")
        .eq("creator_id", creatorProfile.id)
        .returns<CreatorAgentNotificationRow[]>();
      const agentById = new Map((agents ?? []).map((agent) => [agent.id, agent]));
      const agentNameById = new Map((agents ?? []).map((agent) => [agent.id, agent.name]));
      const reviewedAgentIds = new Set<string>();
      const agentIds = [...agentNameById.keys()];

      if (agentIds.length > 0) {
        const { data: reviews } = await supabase
          .from("admin_reviews")
          .select("id,agent_id,decision,notes,created_at")
          .in("agent_id", agentIds)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<AdminReviewNotificationRow[]>();

        for (const review of reviews ?? []) {
          const agent = agentById.get(review.agent_id);

          if (review.decision === "in_review" && agent?.status !== "in_review") {
            continue;
          }

          reviewedAgentIds.add(review.agent_id);
          const agentName = agentNameById.get(review.agent_id) ?? "Votre agent";
          notifications.push({
            id: review.id,
            title: titleForDecision(review.decision, review.notes),
            body: `${agentName} - ${cleanAdminNotes(review.notes) || "Le statut admin a été mis à jour."}`,
            href: "/code/agents",
            tone: toneForDecision(review.decision),
            createdAt: review.created_at,
          });
        }

        for (const agent of agents ?? []) {
          if (reviewedAgentIds.has(agent.id)) {
            continue;
          }

          if (agent.status === "approved" || agent.status === "rejected" || agent.status === "in_review") {
            notifications.push({
              id: `agent-status-${agent.id}-${agent.status}`,
              title: titleForDecision(agent.status),
              body:
                agent.status === "approved"
                  ? `${agent.name} est maintenant approuvé et peut apparaître dans la marketplace.`
                  : agent.status === "rejected"
                    ? `${agent.name} a été refusé par l'équipe admin.`
                    : `${agent.name} est en revue ou nécessite des modifications.`,
              href: "/code/agents",
              tone: toneForDecision(agent.status),
              createdAt: agent.updated_at,
            });
          }
        }
      }

      await appendCreatorRuntimeNotifications({
        agentIds,
        creatorId: creatorProfile.id,
        notifications,
        supabase,
      });
    }
  }

  return notifications
    .sort((a, b) => {
      if (!a.createdAt) return -1;
      if (!b.createdAt) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 8);
}

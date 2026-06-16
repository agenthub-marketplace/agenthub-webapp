import "server-only";

import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

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

type CountResult = {
  count: number | null;
  error: unknown;
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

function countValue(result: CountResult) {
  return result.error ? 0 : result.count ?? 0;
}

function pluralizeAgent(count: number) {
  return `agent${count === 1 ? "" : "s"}`;
}

function pluralizeEndpoint(count: number) {
  return `endpoint${count === 1 ? "" : "s"}`;
}

export async function getCurrentUserNotifications(): Promise<AppNotification[]> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  if (!profile || !supabase) {
    return [];
  }

  const notifications: AppNotification[] = [];

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

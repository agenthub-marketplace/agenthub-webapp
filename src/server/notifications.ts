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

export async function getCurrentUserNotifications(): Promise<AppNotification[]> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  if (!profile || !supabase) {
    return [];
  }

  const notifications: AppNotification[] = [];

  if (profile.role === "admin") {
    const { count } = await supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .in("status", ["submitted", "in_review"]);

    if ((count ?? 0) > 0) {
      notifications.push({
        id: "admin-review-queue",
        title: "File de validation",
        body: `${count} agent${count === 1 ? "" : "s"} à vérifier dans le panneau admin.`,
        href: "/code/admin/review",
        tone: "warning",
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

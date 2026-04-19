import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

const ALLOWED = new Set(["conserve", "renforce", "vend", "rien"]);

export const Route = createFileRoute("/api/alerts/$id/react")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // Save / update the user's reaction (one per alert).
      POST: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        let body: { action?: string };
        try { body = await request.json(); } catch { return errorResponse("Body JSON requis", 400); }
        const action = String(body.action ?? "");
        if (!ALLOWED.has(action)) return errorResponse("Action invalide", 400);

        const { error } = await auth.userClient
          .from("alert_reactions" as any)
          .upsert(
            { alert_id: params.id, user_id: auth.userId, action },
            { onConflict: "alert_id,user_id" },
          );
        if (error) {
          console.error("[api/alerts/:id/react POST] db error", error);
          return errorResponse("Impossible d'enregistrer la réaction", 500);
        }
        return jsonResponse({ success: true, action });
      },

      // Aggregated stats among users holding the same ticker.
      GET: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { data: stats, error } = await auth.userClient
          .rpc("get_alert_reaction_stats" as any, { _alert_id: params.id });
        if (error) {
          console.error("[api/alerts/:id/react GET] rpc error", error);
          return errorResponse("Stats indisponibles", 500);
        }

        const counts: Record<string, number> = { conserve: 0, renforce: 0, vend: 0 };
        for (const row of (stats ?? []) as Array<{ action: string; count: number }>) {
          counts[row.action] = Number(row.count) || 0;
        }
        const total = counts.conserve + counts.renforce + counts.vend;

        // Fetch the current user's own choice (if any).
        const { data: own } = await auth.userClient
          .from("alert_reactions" as any)
          .select("action")
          .eq("alert_id", params.id)
          .eq("user_id", auth.userId)
          .maybeSingle();

        return jsonResponse({
          counts,
          total,
          my_action: (own as any)?.action ?? null,
        });
      },
    },
  },
});

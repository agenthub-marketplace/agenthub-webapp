import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/alerts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { data, error } = await auth.userClient
          .from("alerts")
          .select("*")
          .order("sent_at", { ascending: false });
        if (error) {
          console.error("[api/alerts] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }

        // Mark unread ones as read (fire and forget result)
        const unreadIds = (data ?? []).filter((a) => !a.is_read).map((a) => a.id);
        if (unreadIds.length > 0) {
          await auth.userClient.from("alerts").update({ is_read: true }).in("id", unreadIds);
        }

        return jsonResponse({ alerts: data ?? [] });
      },
    },
  },
});

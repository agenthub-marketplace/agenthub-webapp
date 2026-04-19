import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/alerts/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      DELETE: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { error } = await auth.userClient
          .from("alerts")
          .delete()
          .eq("id", params.id);
        if (error) {
          console.error("[api/alerts/:id DELETE] db error", error);
          return errorResponse("Suppression impossible", 500);
        }
        return jsonResponse({ success: true });
      },
    },
  },
});

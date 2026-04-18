import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/alerts/$id/read")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      PATCH: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { error } = await auth.userClient
          .from("alerts")
          .update({ is_read: true })
          .eq("id", params.id);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ success: true });
      },
    },
  },
});

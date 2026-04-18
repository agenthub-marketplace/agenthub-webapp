import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/tink/connect-url")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const clientId = process.env.TINK_CLIENT_ID;
        if (!clientId) return errorResponse("TINK_CLIENT_ID manquant", 500);

        const origin = request.headers.get("origin") ?? new URL(request.url).origin;
        const redirect = process.env.TINK_REDIRECT_URI ?? `${origin}/api/tink/callback`;
        console.log("[tink/connect-url] redirect_uri =", redirect);

        const url =
          `https://link.tink.com/1.0/transactions/connect-accounts/` +
          `?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirect)}` +
          `&market=FR&locale=fr_FR&test=true` +
          `&state=${encodeURIComponent(auth.userId)}`;
        return jsonResponse({ url });
      },
    },
  },
});

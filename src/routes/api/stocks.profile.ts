import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";
import { fetchStockProfile } from "./stocks.search";

export const Route = createFileRoute("/api/stocks/profile")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const symbol = (url.searchParams.get("symbol") ?? "").trim();
        if (!symbol || symbol.length > 32) return errorResponse("symbol requis", 400);

        const profile = await fetchStockProfile(symbol);
        if (!profile) return errorResponse("Profil introuvable", 404);
        return jsonResponse({ profile });
      },
    },
  },
});

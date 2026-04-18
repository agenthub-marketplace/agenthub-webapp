import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";
import { fetchLogo } from "@/lib/quotes.server";

export const Route = createFileRoute("/api/stocks/logo")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const symbol = (url.searchParams.get("symbol") ?? "").trim();
        if (!symbol || symbol.length > 32) return errorResponse("symbol requis", 400);

        const finnhubKey = process.env.FINNHUB_API_KEY ?? "";

        try {
          const logo = await fetchLogo(symbol, finnhubKey);

          // Cache the logo on every position the user has for this ticker so
          // future page loads don't need to call Finnhub again.
          if (logo) {
            await auth.userClient
              .from("positions")
              .update({ logo_url: logo })
              .eq("user_id", auth.userId)
              .eq("ticker", symbol);
          }

          return new Response(
            JSON.stringify({ logo }),
            {
              status: 200,
              headers: {
                ...CORS,
                // Cache on the edge / browser for 7 days — logos rarely change
                "Cache-Control": "public, max-age=604800, s-maxage=604800",
              },
            },
          );
        } catch (e) {
          console.error("[api/stocks/logo] error", e);
          return jsonResponse({ logo: null });
        }
      },
    },
  },
});

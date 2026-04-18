import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";
import { fetchQuotes, type Quote } from "@/lib/quotes.server";

export const Route = createFileRoute("/api/stocks/quote")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const symbolsParam = (url.searchParams.get("symbols") ?? url.searchParams.get("symbol") ?? "").trim();
        if (!symbolsParam) return errorResponse("symbol(s) requis", 400);

        const symbols = symbolsParam
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 32)
          .slice(0, 50);

        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) {
          const empty: Record<string, Quote> = {};
          symbols.forEach((s) => (empty[s] = { price: null, change: null, changePct: null }));
          return jsonResponse({ quotes: empty });
        }

        const quotes = await fetchQuotes(symbols, apiKey);
        return new Response(JSON.stringify({ quotes }), {
          status: 200,
          headers: {
            ...CORS,
            "Cache-Control": "private, max-age=60",
          },
        });
      },
    },
  },
});

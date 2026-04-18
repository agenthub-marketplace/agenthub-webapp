import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

type Quote = { price: number | null; change: number | null; changePct: number | null };

async function fetchQuote(symbol: string, apiKey: string): Promise<Quote> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    );
    if (!res.ok) return { price: null, change: null, changePct: null };
    const d = (await res.json()) as { c?: number; d?: number; dp?: number };
    return {
      price: typeof d.c === "number" && d.c > 0 ? d.c : null,
      change: typeof d.d === "number" ? d.d : null,
      changePct: typeof d.dp === "number" ? d.dp : null,
    };
  } catch {
    return { price: null, change: null, changePct: null };
  }
}

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

        const results = await Promise.all(symbols.map((s) => fetchQuote(s, apiKey)));
        const quotes: Record<string, Quote> = {};
        symbols.forEach((s, i) => (quotes[s] = results[i]));

        return new Response(JSON.stringify({ quotes }), {
          status: 200,
          headers: {
            ...CORS,
            // Cache 60s — quotes are realtime-ish but we want to limit Finnhub calls
            "Cache-Control": "private, max-age=60",
          },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";
import { fetchQuote, fetchQuotes, computePortfolioTotals } from "@/lib/quotes.server";

async function fetchLogo(symbol: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    );
    if (!res.ok) return null;
    const d = (await res.json()) as { logo?: string };
    return d.logo || null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/portfolio")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { data, error } = await auth.userClient
          .from("positions")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("[api/portfolio GET] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }

        const items = data ?? [];

        // Fetch live quotes server-side so portfolio totals are accurate immediately,
        // matching the dashboard's calculation (single source of truth).
        const apiKey = process.env.FINNHUB_API_KEY;
        const quotes = apiKey
          ? await fetchQuotes(items.map((p) => p.ticker), apiKey)
          : {};

        const { totalValue, dayChangeAbs, dayChangePct } = computePortfolioTotals(
          items,
          quotes,
        );

        return jsonResponse({ items, totalValue, dayChangeAbs, dayChangePct, quotes });
      },
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        let body: any;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Body JSON invalide", 400);
        }

        const { ticker, name, quantity, buy_price, sector, geography, isin } = body ?? {};
        if (!ticker || !name || quantity == null) {
          return errorResponse("ticker, name, quantity requis", 400);
        }

        // Fetch the current price + logo right away so the new position
        // shows up immediately with correct totals AND avatar.
        const apiKey = process.env.FINNHUB_API_KEY;
        const [quote, logo] = await Promise.all([
          apiKey ? fetchQuote(String(ticker), apiKey) : Promise.resolve(null),
          apiKey ? fetchLogo(String(ticker), apiKey) : Promise.resolve(null),
        ]);

        const { data, error } = await auth.userClient
          .from("positions")
          .insert({
            user_id: auth.userId,
            ticker,
            name,
            company: name,
            quantity: Number(quantity),
            purchase_price: buy_price != null ? Number(buy_price) : null,
            current_price: quote?.price ?? null,
            sector: sector ?? null,
            geography: geography ?? null,
            isin: isin ?? null,
            source: "manual",
            logo_url: logo,
          })
          .select()
          .single();
        if (error) {
          console.error("[api/portfolio POST] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }
        return jsonResponse({ item: data, quote, refreshedAt: new Date().toISOString() }, 201);
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";
import { fetchQuote, fetchQuotes, fetchLogo, computePortfolioTotals } from "@/lib/quotes.server";

// Map an OpenFIGI exchange code to the Yahoo Finance suffix used by our quote
// + logo pipeline. Storing the suffixed symbol as `ticker` means every
// downstream lookup (portfolio quotes, logos, dashboard totals) automatically
// works for European stocks without additional plumbing.
const EXCHANGE_TO_YAHOO_SUFFIX: Record<string, string> = {
  EPA: ".PA",
  ENX: ".PA",
  XETRA: ".DE",
  GER: ".DE",
  LSE: ".L",
  AMS: ".AS",
  // US exchanges → no suffix
  NYSE: "",
  NASDAQ: "",
  BATS: "",
};

function buildYahooSymbol(rawTicker: string, exchange: string | null): string {
  const upper = String(rawTicker).toUpperCase().trim();
  if (!upper) return upper;
  // If the user already typed a Yahoo-style suffix, respect it.
  if (upper.includes(".")) return upper;
  if (!exchange) return upper;
  const suffix = EXCHANGE_TO_YAHOO_SUFFIX[exchange.toUpperCase()];
  if (suffix === undefined) return upper; // unknown exchange — leave as-is
  return upper + suffix;
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

        const { ticker, name, quantity, buy_price, sector, geography, isin, exchange, asset_type } = body ?? {};
        if (!ticker || !name || quantity == null) {
          return errorResponse("ticker, name, quantity requis", 400);
        }

        // Normalise the ticker with the Yahoo suffix so EU stocks resolve via
        // Yahoo/Stooq instead of falling through to Finnhub (US-only).
        const storedTicker = buildYahooSymbol(String(ticker), exchange ?? null);

        // Fetch current price + logo right away so the new position shows up
        // immediately with correct totals AND avatar.
        const apiKey = process.env.FINNHUB_API_KEY;
        const [quote, logo] = await Promise.all([
          apiKey ? fetchQuote(storedTicker, apiKey) : Promise.resolve(null),
          apiKey ? fetchLogo(storedTicker, apiKey) : Promise.resolve(null),
        ]);

        const { data, error } = await auth.userClient
          .from("positions")
          .insert({
            user_id: auth.userId,
            ticker: storedTicker,
            name,
            company: name,
            quantity: Number(quantity),
            purchase_price: buy_price != null ? Number(buy_price) : null,
            current_price: quote?.price ?? null,
            sector: sector ?? null,
            geography: geography ?? null,
            isin: isin ?? null,
            exchange: exchange ?? null,
            asset_type: asset_type ?? null,
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

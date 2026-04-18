import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

// Maps Finnhub exchange suffix or country to a coarse geography bucket.
function detectGeography(symbol: string): string | null {
  const s = symbol.toUpperCase();
  if (/\.(PA|AS|DE|MI|MC|BR|VI|HE|ST|CO|OL|LS|SW|L)$/.test(s)) return "Europe";
  if (/\.(HK|T|SS|SZ|KS|KQ|TW|SI|BO|NS)$/.test(s)) return "Asie";
  if (/\.(TO|V|MX|SA|BA)$/.test(s)) return "Autre";
  // No suffix → typically US-listed (NYSE/NASDAQ)
  if (!s.includes(".")) return "États-Unis";
  return "Autre";
}

type FinnhubSearchResult = {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
};

type FinnhubProfile = {
  name?: string;
  ticker?: string;
  finnhubIndustry?: string;
  country?: string;
  exchange?: string;
};

function geoFromCountry(country?: string): string | null {
  if (!country) return null;
  const c = country.toUpperCase();
  if (c === "US") return "États-Unis";
  if (
    [
      "FR","DE","IT","ES","NL","BE","AT","CH","GB","UK","IE","PT","SE","NO","DK","FI","PL","LU",
    ].includes(c)
  )
    return "Europe";
  if (["CN","HK","JP","KR","TW","SG","IN","TH","VN","ID","MY","PH"].includes(c)) return "Asie";
  return "Autre";
}

export const Route = createFileRoute("/api/stocks/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < 2) return jsonResponse({ results: [] });
        if (q.length > 64) return errorResponse("Requête trop longue", 400);

        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) {
          console.error("[api/stocks/search] FINNHUB_API_KEY missing");
          return errorResponse("Service de recherche indisponible", 503);
        }

        try {
          const searchRes = await fetch(
            `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`,
          );
          if (!searchRes.ok) {
            console.error("[api/stocks/search] finnhub search failed", searchRes.status);
            return errorResponse("Recherche indisponible", 502);
          }
          const json = (await searchRes.json()) as FinnhubSearchResult;
          const top = (json.result ?? [])
            .filter((r) => r.type === "Common Stock" || r.type === "")
            .slice(0, 8)
            .map((r) => ({
              symbol: r.symbol,
              displaySymbol: r.displaySymbol,
              name: r.description,
              geography: detectGeography(r.symbol),
            }));
          return jsonResponse({ results: top });
        } catch (e) {
          console.error("[api/stocks/search] error", e);
          return errorResponse("Une erreur interne est survenue", 500);
        }
      },
    },
  },
});

// Detail endpoint to enrich a chosen symbol with sector + geography.
export type StockProfile = {
  symbol: string;
  name: string;
  ticker: string;
  sector: string | null;
  geography: string | null;
};

export async function fetchStockProfile(symbol: string): Promise<StockProfile | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
  );
  if (!res.ok) return null;
  const p = (await res.json()) as FinnhubProfile;
  return {
    symbol,
    name: p.name ?? symbol,
    ticker: p.ticker ?? symbol,
    sector: p.finnhubIndustry ?? null,
    geography: geoFromCountry(p.country) ?? detectGeography(symbol),
  };
}

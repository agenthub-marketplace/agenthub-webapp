import { createFileRoute } from "@tanstack/react-router";
import { CORS, errorResponse, requireUser } from "@/lib/api-auth";

const EXCHANGE_SUFFIX: Record<string, string> = {
  EPA: ".PA",
  ENX: ".PA",
  XETRA: ".DE",
  GER: ".DE",
  LSE: ".L",
  AMS: ".AS",
};

const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "BATS", "AMEX", "ARCA"]);

function buildYahooSymbol(ticker: string, exchange: string | null): string {
  const upper = ticker.toUpperCase();
  // If the ticker already has a Yahoo-style suffix, keep it as-is.
  if (upper.includes(".")) return upper;
  if (!exchange) return upper;
  const exch = exchange.toUpperCase();
  if (US_EXCHANGES.has(exch)) return upper;
  const suffix = EXCHANGE_SUFFIX[exch];
  return suffix ? upper + suffix : upper;
}

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
        exchangeName?: string;
        fullExchangeName?: string;
      };
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

// Tiny in-memory cache to dampen bursts (60s).
const PRICE_CACHE = new Map<
  string,
  { at: number; payload: Record<string, unknown> }
>();
const TTL = 60_000;

function respond(body: Record<string, unknown>, status = 200) {
  const payload = JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": String(new TextEncoder().encode(payload).length),
      "Cache-Control": "private, max-age=60",
    },
  });
}

export const Route = createFileRoute("/api/assets/price")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const tickerRaw = url.searchParams.get("ticker");
        const exchange = url.searchParams.get("exchange");
        if (!tickerRaw) return errorResponse("ticker requis", 400);

        const symbol = buildYahooSymbol(tickerRaw, exchange);
        console.log("[api/assets/price] requested", { ticker: tickerRaw, exchange, symbol });

        const cached = PRICE_CACHE.get(symbol);
        if (cached && Date.now() - cached.at < TTL) {
          console.log("[api/assets/price] cache hit", { symbol });
          return respond(cached.payload);
        }

        for (const yUrl of [
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
        ]) {
          try {
            console.log("[api/assets/price] yahoo url", { symbol, url: yUrl });
            const res = await fetch(yUrl, { headers: YAHOO_HEADERS });
            console.log("[api/assets/price] yahoo status", { symbol, url: yUrl, status: res.status, ok: res.ok });
            if (!res.ok) continue;
            const d = (await res.json()) as YahooChartResponse;
            if (d.chart?.error) continue;
            const meta = d.chart?.result?.[0]?.meta;
            const price = num(meta?.regularMarketPrice);
            const prev = num(meta?.chartPreviousClose ?? meta?.previousClose);
            if (price == null) continue;
            const changePct =
              prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null;
            const change = prev != null ? price - prev : null;

            const payload = {
              price,
              change,
              currency: meta?.currency ?? null,
              change_percent: changePct,
              market: meta?.exchangeName ?? exchange ?? null,
              symbol,
            };
            PRICE_CACHE.set(symbol, { at: Date.now(), payload });
            return respond(payload);
          } catch (e) {
            console.error(`[api/assets/price] ${symbol} fetch error`, { url: yUrl, error: e });
          }
        }

        return respond({
          price: null,
          change: null,
          currency: null,
          change_percent: null,
          market: exchange ?? null,
          symbol,
          error: "Cours indisponible",
        });
      },
    },
  },
});

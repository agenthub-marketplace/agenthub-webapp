import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { fetchQuotes } from "@/lib/quotes.server";
import { detectMarket, type Market, ALL_MARKETS } from "@/lib/markets";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Lovable-Context",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute("/hooks/refresh-prices")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        // Authenticate the cron caller using the project's anon key (Bearer).
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) return jsonResponse({ error: "Missing authorization header" }, 401);

        let body: { market?: string } = {};
        try {
          body = (await request.json()) as { market?: string };
        } catch {
          // empty body OK -> refresh all markets
        }

        const requested = (body.market ?? "all").toLowerCase();
        const targetMarkets: Market[] | "all" =
          requested === "all"
            ? "all"
            : (ALL_MARKETS as string[]).includes(requested)
              ? [requested as Market]
              : "all";

        const apiKey = process.env.FINNHUB_API_KEY ?? "";
        if (!apiKey && !process.env.TWELVE_DATA_API_KEY) {
          return jsonResponse({ error: "No quote provider configured" }, 500);
        }

        // Use service role to read every user's positions (cron has no user context).
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return jsonResponse({ error: "Backend not configured" }, 500);
        }
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Pull every position. Future positions are picked up automatically because
        // we always re-query the full table at each cron tick.
        const { data: positions, error: fetchErr } = await admin
          .from("positions")
          .select("id, ticker");
        if (fetchErr) {
          console.error("[refresh-prices] fetch error", fetchErr);
          return jsonResponse({ error: "DB error" }, 500);
        }

        // Filter positions by detected market
        const filtered = (positions ?? []).filter((p) => {
          if (!p.ticker) return false;
          if (targetMarkets === "all") return true;
          return targetMarkets.includes(detectMarket(p.ticker));
        });

        if (filtered.length === 0) {
          return jsonResponse({
            market: requested,
            refreshed: 0,
            message: "No positions to refresh for this market",
          });
        }

        // Unique tickers -> single Finnhub call per ticker
        const uniqueTickers = Array.from(new Set(filtered.map((p) => p.ticker)));
        // Process in chunks of 50 to stay friendly with Finnhub rate limits
        const quotes: Record<string, { price: number | null }> = {};
        const CHUNK = 50;
        for (let i = 0; i < uniqueTickers.length; i += CHUNK) {
          const slice = uniqueTickers.slice(i, i + CHUNK);
          const partial = await fetchQuotes(slice, apiKey);
          Object.assign(quotes, partial);
        }

        // Update each row whose quote returned a price. Group updates by ticker.
        let updated = 0;
        const errors: string[] = [];
        await Promise.all(
          uniqueTickers.map(async (ticker) => {
            const price = quotes[ticker]?.price;
            if (price == null) return;
            const { error: upErr, count } = await admin
              .from("positions")
              .update({ current_price: price, updated_at: new Date().toISOString() }, { count: "exact" })
              .eq("ticker", ticker);
            if (upErr) {
              errors.push(`${ticker}: ${upErr.message}`);
            } else {
              updated += count ?? 0;
            }
          }),
        );

        return jsonResponse({
          market: requested,
          tickers: uniqueTickers.length,
          updated,
          errors: errors.length ? errors : undefined,
          ranAt: new Date().toISOString(),
        });
      },
    },
  },
});

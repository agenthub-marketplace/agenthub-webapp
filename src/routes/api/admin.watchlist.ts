import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-secret",
};

function respond(body: unknown, status = 200) {
  const payload = JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      ...CORS,
      "Content-Length": String(new TextEncoder().encode(payload).length),
    },
  });
}

export const Route = createFileRoute("/api/admin/watchlist")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const { data, error, count } = await supabaseAdmin
          .from("positions")
          .select("ticker, isin, name, company, quantity", { count: "exact" });

        if (error) {
          console.error("[admin/watchlist] db error", error);
          return respond(
            { ok: false, error: "Une erreur interne est survenue", details: error.message },
            500,
          );
        }

        const rows = (data ?? []).filter((r) => r.ticker);
        const tickers = Array.from(new Set(rows.map((r) => r.ticker))).sort();
        const isins = Array.from(
          new Set((data ?? []).map((r) => r.isin).filter(Boolean)),
        ).sort();

        // Aggregate quantity per unique ticker (sum across all users/positions).
        const agg = new Map<string, { name: string; quantity: number }>();
        for (const r of rows) {
          const name = (r.name?.trim() || r.company?.trim() || r.ticker) as string;
          const qty = Number(r.quantity ?? 0) || 0;
          const existing = agg.get(r.ticker);
          if (existing) {
            existing.quantity += qty;
          } else {
            agg.set(r.ticker, { name, quantity: qty });
          }
        }

        const companies: Array<{ symbol: string; name: string; quantity: number }> = Array.from(
          agg.entries(),
        )
          .map(([symbol, v]) => ({ symbol, name: v.name, quantity: v.quantity }))
          .sort((a, b) => a.symbol.localeCompare(b.symbol));

        return respond({
          ok: true,
          tickers,
          companies,
          isins,
          count: tickers.length,
          rawCount: count,
          rowsReturned: data?.length ?? 0,
        });
      },
    },
  },
});

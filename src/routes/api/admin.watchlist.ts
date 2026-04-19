import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-secret",
};

export const Route = createFileRoute("/api/admin/watchlist")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const { data, error, count } = await supabaseAdmin
          .from("positions")
          .select("ticker, isin, name, company", { count: "exact" });

        if (error) {
          console.error("[admin/watchlist] db error", error);
          return new Response(
            JSON.stringify({ error: "Une erreur interne est survenue", details: error.message }),
            { status: 500, headers: CORS },
          );
        }

        const rows = (data ?? []).filter((r) => r.ticker);
        const tickers = Array.from(new Set(rows.map((r) => r.ticker))).sort();
        const isins = Array.from(
          new Set((data ?? []).map((r) => r.isin).filter(Boolean)),
        ).sort();

        // One entry per unique ticker. Prefer `name` (cleaner), fall back to
        // `company`, and finally to the ticker itself if both are blank.
        const seen = new Set<string>();
        const companies: Array<{ symbol: string; name: string }> = [];
        for (const r of rows) {
          if (seen.has(r.ticker)) continue;
          seen.add(r.ticker);
          const name = (r.name?.trim() || r.company?.trim() || r.ticker) as string;
          companies.push({ symbol: r.ticker, name });
        }
        companies.sort((a, b) => a.symbol.localeCompare(b.symbol));

        return new Response(
          JSON.stringify({ tickers, isins, count: tickers.length, rawCount: count, rowsReturned: data?.length ?? 0 }),
          { status: 200, headers: CORS },
        );
      },
    },
  },
});

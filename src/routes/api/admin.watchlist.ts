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
          .select("ticker, isin", { count: "exact" });

        if (error) {
          console.error("[admin/watchlist] db error", error);
          return new Response(
            JSON.stringify({ error: "Une erreur interne est survenue", details: error.message }),
            { status: 500, headers: CORS },
          );
        }

        const tickers = Array.from(
          new Set((data ?? []).map((r) => r.ticker).filter(Boolean)),
        ).sort();
        const isins = Array.from(
          new Set((data ?? []).map((r) => r.isin).filter(Boolean)),
        ).sort();

        return new Response(
          JSON.stringify({ tickers, isins, count: tickers.length, rawCount: count, rowsReturned: data?.length ?? 0 }),
          { status: 200, headers: CORS },
        );
      },
    },
  },
});

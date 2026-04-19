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
      GET: async ({ request }) => {
        console.warn("[admin/watchlist] AUTH DISABLED - endpoint is fully public (temporary)");
        console.log("[admin/watchlist] Querying positions table with service role");
        console.log("[admin/watchlist] SUPABASE_URL:", process.env.SUPABASE_URL);
        console.log("[admin/watchlist] Has SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { data, error, count } = await supabaseAdmin
          .from("positions")
          .select("ticker, isin", { count: "exact" });

        console.log("[admin/watchlist] Query result - count:", count, "rows returned:", data?.length, "error:", error);
        console.log("[admin/watchlist] Raw data:", JSON.stringify(data));

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

        console.log("[admin/watchlist] Returning tickers:", tickers, "isins:", isins);

        return new Response(
          JSON.stringify({ tickers, isins, count: tickers.length, rawCount: count, rowsReturned: data?.length ?? 0 }),
          { status: 200, headers: CORS },
        );
      },
    },
  },
});

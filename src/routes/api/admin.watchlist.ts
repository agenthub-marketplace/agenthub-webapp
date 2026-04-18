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
        const expected = process.env.ADMIN_SECRET;
        if (!expected) {
          console.error("[admin/watchlist] ADMIN_SECRET not configured");
          return new Response(
            JSON.stringify({ error: "Server misconfigured" }),
            { status: 500, headers: CORS },
          );
        }

        const provided = request.headers.get("x-admin-secret");
        if (provided !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: CORS,
          });
        }

        const { data, error } = await supabaseAdmin
          .from("positions")
          .select("ticker, isin");

        if (error) {
          console.error("[admin/watchlist] db error", error);
          return new Response(
            JSON.stringify({ error: "Une erreur interne est survenue" }),
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
          JSON.stringify({ tickers, isins, count: tickers.length }),
          { status: 200, headers: CORS },
        );
      },
    },
  },
});

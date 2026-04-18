import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/portfolio/tickers")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );

          const { data, error } = await supabase
            .from("positions")
            .select("ticker, isin");

          if (error) throw error;

          const tickers = Array.from(
            new Set((data ?? []).map((r) => r.ticker).filter(Boolean)),
          ).sort();
          const isins = Array.from(
            new Set((data ?? []).map((r) => r.isin).filter(Boolean)),
          ).sort();

          return new Response(
            JSON.stringify({ tickers, isins, count: tickers.length }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
      },
    },
  },
});

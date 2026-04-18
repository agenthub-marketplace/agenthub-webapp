import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/portfolio/tickers")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { data, error } = await auth.userClient
          .from("positions")
          .select("ticker, isin");

        if (error) {
          console.error("[portfolio.tickers] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }

        const tickers = Array.from(
          new Set((data ?? []).map((r) => r.ticker).filter(Boolean)),
        ).sort();
        const isins = Array.from(
          new Set((data ?? []).map((r) => r.isin).filter(Boolean)),
        ).sort();

        return jsonResponse({ tickers, isins, count: tickers.length });
      },
    },
  },
});

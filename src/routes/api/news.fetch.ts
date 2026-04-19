import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/news/fetch")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const symbol = url.searchParams.get("symbol")?.trim();
          if (!symbol) {
            return new Response(
              JSON.stringify({ error: "Missing 'symbol' query parameter" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              },
            );
          }

          const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
            symbol,
          )}&newsCount=5&enableFuzzyQuery=false`;

          const res = await fetch(yahooUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; PrismBot/1.0; +https://prism.app)",
              Accept: "application/json",
            },
          });

          if (!res.ok) {
            return new Response(
              JSON.stringify({
                error: `Yahoo Finance error: ${res.status} ${res.statusText}`,
                news: [],
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              },
            );
          }

          const data: any = await res.json();
          const rawNews: any[] = Array.isArray(data?.news) ? data.news : [];

          const news = rawNews.map((n) => ({
            headline: n.title ?? "",
            summary: n.summary ?? n.title ?? "",
            datetime:
              typeof n.providerPublishTime === "number"
                ? n.providerPublishTime
                : 0,
            related: symbol,
            url: n.link ?? n.url ?? "",
          }));

          return new Response(JSON.stringify({ news }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
              ...corsHeaders,
            },
          });
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              error: error?.message ?? "Failed to fetch news",
              news: [],
            }),
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

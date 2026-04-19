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

          const apiKey = process.env.GNEWS_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({
                error: "GNEWS_API_KEY is not configured",
                news: [],
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              },
            );
          }

          const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
            symbol,
          )}&lang=fr&country=fr&max=5&apikey=${encodeURIComponent(apiKey)}`;

          const res = await fetch(gnewsUrl, {
            headers: { Accept: "application/json" },
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return new Response(
              JSON.stringify({
                error: `GNews error: ${res.status} ${res.statusText}`,
                detail: text.slice(0, 300),
                news: [],
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              },
            );
          }

          const data: any = await res.json();
          const articles: any[] = Array.isArray(data?.articles)
            ? data.articles
            : [];

          const news = articles.map((a) => ({
            headline: a.title ?? "",
            summary: a.description ?? a.content ?? a.title ?? "",
            url: a.url ?? "",
            datetime: a.publishedAt ?? "",
            related: symbol,
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

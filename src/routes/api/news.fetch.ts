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

          console.log("[news.fetch] GNEWS_API_KEY present:", !!apiKey, "len:", apiKey.length);
          console.log("[news.fetch] Calling URL:", gnewsUrl.replace(apiKey, "***"));

          const res = await fetch(gnewsUrl, {
            headers: { Accept: "application/json" },
          });

          const rawText = await res.text();
          console.log("[news.fetch] HTTP", res.status, "body:", rawText.slice(0, 500));

          if (!res.ok) {
            return new Response(
              JSON.stringify({
                error: `GNews error: ${res.status} ${res.statusText}`,
                detail: rawText.slice(0, 300),
                news: [],
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              },
            );
          }

          let data: any = {};
          try { data = JSON.parse(rawText); } catch {}
          const articles: any[] = Array.isArray(data?.articles)
            ? data.articles
            : [];

          console.log("[news.fetch] articles count:", articles.length, "totalArticles:", data?.totalArticles);

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

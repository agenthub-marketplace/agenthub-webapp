import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchArticleSummary(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    // Try meta description first
    const metaDesc =
      html.match(
        /<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i,
      )?.[1] ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description)["']/i,
      )?.[1];

    // Strip scripts/styles, then extract paragraph text
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
    const paragraphs = Array.from(cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
      .map((m) =>
        m[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((t) => t.length > 40)
      .join(" ");

    const body = (paragraphs || metaDesc || "").trim();
    if (!body) return null;
    return body.slice(0, 500);
  } catch {
    return null;
  }
}

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

          const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
            symbol,
          )}&newsCount=5&enableFuzzyQuery=false&enableCb=true&enableNavLinks=false&enableEnhancedTrivialQuery=true`;

          const res = await fetch(yahooUrl, {
            headers: {
              "User-Agent": UA,
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

          const news = await Promise.all(
            rawNews.map(async (n) => {
              const headline: string = n.title ?? "";
              const link: string = n.link ?? n.url ?? "";
              let summary = "";
              if (link) {
                const fetched = await fetchArticleSummary(link);
                if (fetched && fetched.length > 60) {
                  summary = fetched;
                }
              }
              if (!summary) {
                summary = `${headline} - Analyse basée sur le titre uniquement`;
              }
              return {
                headline,
                summary,
                datetime:
                  typeof n.providerPublishTime === "number"
                    ? n.providerPublishTime
                    : 0,
                related: symbol,
                url: link,
              };
            }),
          );

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

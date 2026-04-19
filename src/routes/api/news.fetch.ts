import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extraHeaders },
  });

/**
 * Resolve a stock ticker (e.g. "AAPL", "TTE.PA") to a human-readable
 * company name via Finnhub. Returns null on any failure — caller falls
 * back to the raw symbol.
 */
async function resolveCompanyName(symbol: string): Promise<string | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    );
    if (!res.ok) return null;
    const d = (await res.json()) as { name?: string };
    const name = d?.name?.trim();
    return name && name.length > 0 ? name : null;
  } catch (e) {
    console.error("[news.fetch] Finnhub profile lookup failed", e);
    return null;
  }
}

export const Route = createFileRoute("/api/news/fetch")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const symbol = url.searchParams.get("symbol")?.trim();
          const companyParam = url.searchParams.get("company")?.trim();
          if (!symbol) {
            return json({ error: "Missing 'symbol' query parameter" }, 400);
          }

          const apiKey = process.env.GNEWS_API_KEY;
          if (!apiKey) {
            return json({ error: "GNEWS_API_KEY is not configured", news: [] }, 500);
          }

          // GNews searches article text — passing a raw ticker like "AAPL"
          // matches nothing in French press. Prefer the company name when
          // the caller supplies one; otherwise resolve via Finnhub; final
          // fallback is the symbol itself.
          const companyName =
            (companyParam && companyParam.length > 0 ? companyParam : null) ??
            (await resolveCompanyName(symbol)) ??
            symbol;

          const gnewsUrl =
            `https://gnews.io/api/v4/search?q=${encodeURIComponent(companyName)}` +
            `&lang=fr&country=fr&max=5&apikey=${encodeURIComponent(apiKey)}`;

          const res = await fetch(gnewsUrl, { headers: { Accept: "application/json" } });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return json(
              {
                error: `GNews error: ${res.status} ${res.statusText}`,
                detail: text.slice(0, 300),
                news: [],
              },
              502,
            );
          }

          const data = (await res.json()) as { articles?: unknown };
          const articles = Array.isArray(data?.articles) ? (data.articles as any[]) : [];

          const news = articles.map((a) => ({
            headline: a.title ?? "",
            summary: a.description ?? a.content ?? a.title ?? "",
            url: a.url ?? "",
            datetime: a.publishedAt ?? "",
            related: symbol,
          }));

          return json({ news, query: companyName }, 200, { "Cache-Control": "public, max-age=60" });
        } catch (error: any) {
          console.error("[news.fetch] unexpected error", error);
          return json({ error: error?.message ?? "Failed to fetch news", news: [] }, 500);
        }
      },
    },
  },
});

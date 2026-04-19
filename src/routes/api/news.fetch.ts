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
 * In-memory cache keyed by sanitized query. GNews free tier rate-limits
 * aggressively (a handful of requests/minute) — caching for 10 minutes per
 * symbol keeps repeated alert-pipeline calls from getting throttled.
 * Note: serverless workers may evict this between cold starts, which is fine
 * — it's a best-effort throttle shield, not a correctness requirement.
 */
type CacheEntry = { expiresAt: number; payload: unknown };
const NEWS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Resolve a stock ticker (e.g. "AAPL", "TTE.PA") to a human-readable
 * company name via Finnhub. Returns null on any failure — caller falls
 * back to the raw symbol.
 */
async function resolveCompanyName(symbol: string): Promise<string | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn("[news.fetch] FINNHUB_API_KEY missing — cannot resolve ticker→name");
    return null;
  }
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    );
    if (!res.ok) {
      console.warn(`[news.fetch] Finnhub profile2 ${symbol} -> HTTP ${res.status}`);
      return null;
    }
    const d = (await res.json()) as { name?: string };
    const name = d?.name?.trim();
    return name && name.length > 0 ? name : null;
  } catch (e) {
    console.error("[news.fetch] Finnhub profile lookup failed", e);
    return null;
  }
}

/**
 * Sanitize a company name for GNews search:
 *   "Apple Inc."        -> "Apple"
 *   "TotalEnergies SE"  -> "TotalEnergies"
 *   "LVMH Moët Hennessy Louis Vuitton SE" -> "LVMH"
 * GNews's q parameter has a strict mini-syntax — bare words work best.
 * We strip corporate suffixes, punctuation, and keep at most the first
 * 3 meaningful words.
 */
function sanitizeQuery(raw: string): string {
  const SUFFIXES = /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|sa|se|nv|ag|spa|llc|holdings?|group|grp)\.?\b/gi;
  const cleaned = raw
    .replace(SUFFIXES, "")
    .replace(/[.,;:()"'`*+\-/\\&|!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 1);
  return words.slice(0, 3).join(" ") || raw;
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
          const rawCompany =
            (companyParam && companyParam.length > 0 ? companyParam : null) ??
            (await resolveCompanyName(symbol)) ??
            symbol;
          const query = sanitizeQuery(rawCompany);

          // Serve from cache when fresh — avoids GNews free-tier rate limits.
          const cacheKey = `${query}|fr`;
          const cached = NEWS_CACHE.get(cacheKey);
          if (cached && cached.expiresAt > Date.now()) {
            return json(cached.payload as object, 200, {
              "Cache-Control": "public, max-age=60",
              "X-News-Cache": "HIT",
            });
          }

          const gnewsUrl =
            `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}` +
            `&lang=fr&country=fr&max=5&apikey=${encodeURIComponent(apiKey)}`;

          const res = await fetch(gnewsUrl, { headers: { Accept: "application/json" } });
          const rawText = await res.text();
          let data: any = null;
          try {
            data = JSON.parse(rawText);
          } catch {
            // Non-JSON response — surface as upstream error.
            return json(
              { error: "GNews returned non-JSON response", detail: rawText.slice(0, 300), news: [] },
              502,
            );
          }

          if (!res.ok) {
            const upstreamErrors = Array.isArray(data?.errors) ? data.errors : [];
            const isRateLimit =
              res.status === 429 ||
              upstreamErrors.some((m: unknown) => typeof m === "string" && /too many requests/i.test(m));
            console.warn("[news.fetch] GNews HTTP error", res.status, upstreamErrors);
            return json(
              {
                error: isRateLimit ? "GNEWS_RATE_LIMITED" : `GNews error: ${res.status} ${res.statusText}`,
                upstream_errors: upstreamErrors,
                rate_limited: isRateLimit,
                news: [],
              },
              isRateLimit ? 429 : 502,
            );
          }

          // GNews returns 200 with `{ errors: [...] }` when throttled — detect this.
          if (Array.isArray(data?.errors) && data.errors.length > 0) {
            const isRateLimit = data.errors.some(
              (m: unknown) => typeof m === "string" && /too many requests/i.test(m),
            );
            console.warn("[news.fetch] GNews returned errors payload", data.errors);
            return json(
              {
                error: isRateLimit ? "GNEWS_RATE_LIMITED" : "GNEWS_ERROR",
                upstream_errors: data.errors,
                rate_limited: isRateLimit,
                news: [],
              },
              isRateLimit ? 429 : 502,
            );
          }

          const articles = Array.isArray(data?.articles) ? (data.articles as any[]) : [];

          const news = articles.map((a) => ({
            headline: a.title ?? "",
            summary: a.description ?? a.content ?? a.title ?? "",
            url: a.url ?? "",
            datetime: a.publishedAt ?? "",
            related: symbol,
          }));

          const payload = { news, query };
          NEWS_CACHE.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });

          return json(payload, 200, {
            "Cache-Control": "public, max-age=60",
            "X-News-Cache": "MISS",
          });
        } catch (error: any) {
          console.error("[news.fetch] unexpected error", error);
          return json({ error: error?.message ?? "Failed to fetch news", news: [] }, 500);
        }
      },
    },
  },
});

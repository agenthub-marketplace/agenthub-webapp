// Server-only quote helper.
// US tickers → Finnhub. European tickers (.PA .AS .DE .MI .MC .LS .BR .L .F .SW ...) → Yahoo Finance.

export type Quote = {
  price: number | null;
  change: number | null; // absolute daily change per share, native currency
  changePct: number | null; // daily % change
  currency?: string | null; // ISO currency code returned by data source (EUR, USD, GBP...)
  stale?: boolean;
  source?: "finnhub" | "twelvedata" | "yahoo" | "candle" | "exchange-prefix" | "none";
};

// Map Yahoo-style suffix → Twelve Data exchange code (MIC-ish).
// Twelve Data accepts "SYMBOL:EXCHANGE" disambiguation.
const EU_SUFFIX_TO_EXCHANGE: Record<string, string> = {
  ".PA": "Euronext",       // Paris
  ".AS": "Euronext",       // Amsterdam
  ".BR": "Euronext",       // Brussels
  ".LS": "Euronext",       // Lisbon
  ".DE": "XETRA",
  ".F": "FSX",             // Frankfurt
  ".MI": "MTA",            // Borsa Italiana
  ".MC": "BME",            // Madrid
  ".SW": "SIX",
  ".VI": "VSE",            // Vienna
  ".HE": "Helsinki",
  ".ST": "Stockholm",
  ".CO": "Copenhagen",
  ".OL": "Oslo",
  ".AT": "ATHEX",          // Athens
  ".WA": "WSE",            // Warsaw
  ".PR": "PSE",            // Prague
  ".L": "LSE",
};

const EU_SUFFIXES = Object.keys(EU_SUFFIX_TO_EXCHANGE);

export function isEuropeanTicker(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return EU_SUFFIXES.some((s) => upper.endsWith(s));
}

/** Convert "MT.AS" → { base: "MT", exchange: "Euronext" } */
function splitEuTicker(symbol: string): { base: string; exchange: string | null } {
  const upper = symbol.toUpperCase();
  for (const suffix of EU_SUFFIXES) {
    if (upper.endsWith(suffix)) {
      return { base: upper.slice(0, -suffix.length), exchange: EU_SUFFIX_TO_EXCHANGE[suffix] };
    }
  }
  return { base: upper, exchange: null };
}

// ---------------------------------------------------------------------------
// Finnhub (US)
// ---------------------------------------------------------------------------

type FinnhubQuoteResponse = { c?: number; d?: number; dp?: number; pc?: number };

async function finnhubQuote(symbol: string, apiKey: string): Promise<Quote> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  console.log(`[quotes:finnhub] GET ${url.replace(apiKey, "***")}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[quotes:finnhub] ${symbol} -> HTTP ${res.status}`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    const d = (await res.json()) as FinnhubQuoteResponse;
    console.log(`[quotes:finnhub] ${symbol} ->`, JSON.stringify(d));
    if (typeof d.c === "number" && d.c > 0) {
      return {
        price: d.c,
        change: typeof d.d === "number" ? d.d : null,
        changePct: typeof d.dp === "number" ? d.dp : null,
        currency: "USD",
        source: "finnhub",
      };
    }
    return { price: null, change: null, changePct: null, source: "none" };
  } catch (e) {
    console.error(`[quotes:finnhub] ${symbol} fetch error`, e);
    return { price: null, change: null, changePct: null, source: "none" };
  }
}

// ---------------------------------------------------------------------------
// Yahoo Finance (Europe + fallback)
// ---------------------------------------------------------------------------
//
// Yahoo's chart endpoint is unauthenticated and supports every European
// suffix we care about (.PA .AS .DE .MI .MC .LS .BR .L .F .SW .HE .CO .OL
// .ST .VI .AT .WA .PR ...). Prices come back in the listing's native
// currency (EUR for Euronext/XETRA/Borsa, GBP for LSE, etc.).
//
// We use a desktop User-Agent header — Yahoo blocks default fetch UAs on
// Cloudflare Workers.

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
      };
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

async function yahooQuote(symbol: string): Promise<Quote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  console.log(`[quotes:yahoo] GET ${url}`);
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      console.warn(`[quotes:yahoo] ${symbol} -> HTTP ${res.status}`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    const d = (await res.json()) as YahooChartResponse;
    if (d.chart?.error) {
      console.warn(`[quotes:yahoo] ${symbol} error:`, JSON.stringify(d.chart.error));
      return { price: null, change: null, changePct: null, source: "none" };
    }
    const meta = d.chart?.result?.[0]?.meta;
    const price = num(meta?.regularMarketPrice);
    const prev = num(meta?.chartPreviousClose ?? meta?.previousClose);
    if (price == null) {
      console.warn(`[quotes:yahoo] ${symbol} no price in meta`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    const change = prev != null ? price - prev : null;
    const changePct = prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null;
    console.log(`[quotes:yahoo] ${symbol} -> price=${price} prev=${prev} ${meta?.currency ?? ""}`);
    return {
      price,
      change,
      changePct,
      currency: meta?.currency ?? null,
      source: "yahoo",
    };
  } catch (e) {
    console.error(`[quotes:yahoo] ${symbol} fetch error`, e);
    return { price: null, change: null, changePct: null, source: "none" };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchQuote(symbol: string, finnhubKey: string): Promise<Quote> {
  if (isEuropeanTicker(symbol)) {
    return yahooQuote(symbol);
  }
  return finnhubQuote(symbol, finnhubKey);
}

export async function fetchQuotes(
  symbols: string[],
  finnhubKey: string,
): Promise<Record<string, Quote>> {
  const unique = Array.from(new Set(symbols.filter((s) => s && s.length <= 32))).slice(0, 50);
  const results = await Promise.all(unique.map((s) => fetchQuote(s, finnhubKey)));
  const map: Record<string, Quote> = {};
  unique.forEach((s, i) => (map[s] = results[i]));
  return map;
}

// ---------------------------------------------------------------------------
// Logos (Finnhub for US, Yahoo /quoteSummary for EU)
// ---------------------------------------------------------------------------

type YahooQuoteSummary = {
  quoteSummary?: {
    result?: Array<{ assetProfile?: { website?: string } }> | null;
  };
};

/**
 * Yahoo doesn't directly expose a logo URL, but it returns the company website
 * which we then resolve via Clearbit's logo CDN — same approach Yahoo Finance
 * itself uses. Free, no API key, returns a clean transparent PNG.
 */
async function yahooLogo(symbol: string): Promise<string | null> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile`;
  console.log(`[logo:yahoo] GET ${url}`);
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) return null;
    const d = (await res.json()) as YahooQuoteSummary;
    const website = d.quoteSummary?.result?.[0]?.assetProfile?.website;
    if (!website) return null;
    const host = new URL(website).hostname.replace(/^www\./, "");
    return `https://logo.clearbit.com/${host}`;
  } catch (e) {
    console.error(`[logo:yahoo] ${symbol} error`, e);
    return null;
  }
}

export async function fetchLogo(symbol: string, finnhubKey: string): Promise<string | null> {
  try {
    if (isEuropeanTicker(symbol)) {
      return await yahooLogo(symbol);
    }
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`,
    );
    if (!res.ok) return null;
    const d = (await res.json()) as { logo?: string };
    return d.logo || null;
  } catch (e) {
    console.error(`[logo] ${symbol} error`, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Portfolio totals
// ---------------------------------------------------------------------------

export function computePortfolioTotals(
  positions: Array<{
    ticker: string;
    quantity: number | string | null;
    current_price: number | string | null;
    purchase_price: number | string | null;
  }>,
  quotes: Record<string, Quote>,
): { totalValue: number; dayChangeAbs: number; dayChangePct: number } {
  let totalValue = 0;
  let dayChangeAbs = 0;
  for (const p of positions) {
    const qty = Number(p.quantity ?? 0);
    if (!qty) continue;
    const q = quotes[p.ticker];
    const price = Number(q?.price ?? p.current_price ?? p.purchase_price ?? 0);
    totalValue += price * qty;
    const perShareChange = Number(q?.change ?? 0);
    dayChangeAbs += perShareChange * qty;
  }
  const previous = totalValue - dayChangeAbs;
  const dayChangePct = previous > 0 ? (dayChangeAbs / previous) * 100 : 0;
  return { totalValue, dayChangeAbs, dayChangePct };
}

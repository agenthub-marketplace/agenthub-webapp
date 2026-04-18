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
// Yahoo Finance + Stooq (Europe)
// ---------------------------------------------------------------------------
//
// Cloudflare Workers' egress IPs are partially blocked by Yahoo (HTTP 429).
// We therefore:
//   1. Try Yahoo `query2.finance.yahoo.com` first (sometimes succeeds).
//   2. Fall back to Stooq, which has no IP filtering and serves CSV data
//      for European exchanges (with its own suffix scheme — see below).
//   3. Cache successful quotes in-process for 60s to dampen bursts.

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
  for (const host of ["query2.finance.yahoo.com", "query1.finance.yahoo.com"]) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    console.log(`[quotes:yahoo] GET ${url}`);
    try {
      const res = await fetch(url, { headers: YAHOO_HEADERS });
      if (res.status === 429) {
        console.warn(`[quotes:yahoo] ${symbol} -> 429 on ${host}`);
        continue;
      }
      if (!res.ok) {
        console.warn(`[quotes:yahoo] ${symbol} -> HTTP ${res.status} on ${host}`);
        continue;
      }
      const d = (await res.json()) as YahooChartResponse;
      if (d.chart?.error) continue;
      const meta = d.chart?.result?.[0]?.meta;
      const price = num(meta?.regularMarketPrice);
      const prev = num(meta?.chartPreviousClose ?? meta?.previousClose);
      if (price == null) continue;
      const change = prev != null ? price - prev : null;
      const changePct = prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null;
      console.log(`[quotes:yahoo] ${symbol} -> price=${price} ${meta?.currency ?? ""}`);
      return { price, change, changePct, currency: meta?.currency ?? null, source: "yahoo" };
    } catch (e) {
      console.error(`[quotes:yahoo] ${symbol} fetch error on ${host}`, e);
    }
  }
  return { price: null, change: null, changePct: null, source: "none" };
}

// --- Stooq mapping (Yahoo suffix -> Stooq suffix) ---------------------------
// Stooq uses ISO-2 country codes for most European exchanges and lowercase
// symbols. For dual-listed names it sometimes only carries one venue.
const YAHOO_TO_STOOQ_SUFFIX: Record<string, string> = {
  ".PA": ".fr", // Euronext Paris
  ".AS": ".nl", // Amsterdam (note: ArcelorMittal is "mt.nl" not "mt.as")
  ".BR": ".be", // Brussels
  ".LS": ".pt", // Lisbon
  ".DE": ".de", // XETRA
  ".F": ".de",
  ".MI": ".it", // Milan
  ".MC": ".es", // Madrid
  ".SW": ".ch",
  ".VI": ".at",
  ".HE": ".fi",
  ".ST": ".se",
  ".CO": ".dk",
  ".OL": ".no",
  ".AT": ".gr",
  ".WA": ".pl",
  ".PR": ".cz",
  ".L": ".uk",
};

function toStooqSymbol(symbol: string): string | null {
  const upper = symbol.toUpperCase();
  for (const [yahoo, stooq] of Object.entries(YAHOO_TO_STOOQ_SUFFIX)) {
    if (upper.endsWith(yahoo)) {
      return (upper.slice(0, -yahoo.length) + stooq).toLowerCase();
    }
  }
  return null;
}

async function stooqQuote(symbol: string): Promise<Quote> {
  const stooqSymbol = toStooqSymbol(symbol);
  if (!stooqSymbol) return { price: null, change: null, changePct: null, source: "none" };
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcvp&h&e=csv`;
  console.log(`[quotes:stooq] GET ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[quotes:stooq] ${symbol} -> HTTP ${res.status}`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    const csv = await res.text();
    // header line + data line
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return { price: null, change: null, changePct: null, source: "none" };
    const cols = lines[1].split(",");
    // Symbol,Date,Time,Open,High,Low,Close,Volume,Change(%)
    const open = num(cols[3]);
    const close = num(cols[6]);
    if (close == null) {
      console.warn(`[quotes:stooq] ${symbol} no close (csv=${lines[1]})`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    // Stooq's free CSV doesn't reliably include yesterday's close — use today's
    // open as a rough day-change proxy. Better than nothing while market open.
    const change = open != null ? close - open : null;
    const changePct = open != null && open > 0 ? ((close - open) / open) * 100 : null;
    console.log(`[quotes:stooq] ${symbol} (${stooqSymbol}) -> close=${close} open=${open}`);
    return { price: close, change, changePct, source: "yahoo" };
  } catch (e) {
    console.error(`[quotes:stooq] ${symbol} fetch error`, e);
    return { price: null, change: null, changePct: null, source: "none" };
  }
}

// --- 60s in-memory cache ----------------------------------------------------
const quoteCache = new Map<string, { at: number; quote: Quote }>();
const QUOTE_TTL_MS = 60_000;

async function euQuote(symbol: string): Promise<Quote> {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.at < QUOTE_TTL_MS) return cached.quote;

  let q = await yahooQuote(symbol);
  if (q.price == null) q = await stooqQuote(symbol);

  if (q.price != null) quoteCache.set(symbol, { at: Date.now(), quote: q });
  return q;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchQuote(symbol: string, finnhubKey: string): Promise<Quote> {
  if (isEuropeanTicker(symbol)) return euQuote(symbol);
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

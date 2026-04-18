// Server-only Finnhub quote helper. Shared by /api/dashboard and /api/stocks/quote
// so portfolio totals are always computed from the same source of truth.

export type Quote = {
  price: number | null;
  change: number | null; // absolute daily change per share (Finnhub "d")
  changePct: number | null; // daily % change (Finnhub "dp")
  stale?: boolean; // true when price comes from a delayed / fallback source
  source?: "quote" | "candle" | "exchange-prefix" | "none";
};

type FinnhubQuoteResponse = { c?: number; d?: number; dp?: number; pc?: number };

async function rawQuote(symbol: string, apiKey: string): Promise<FinnhubQuoteResponse | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  console.log(`[quotes] GET ${url.replace(apiKey, "***")}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[quotes] ${symbol} -> HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as FinnhubQuoteResponse;
    console.log(`[quotes] ${symbol} ->`, JSON.stringify(json));
    return json;
  } catch (e) {
    console.error(`[quotes] ${symbol} fetch error`, e);
    return null;
  }
}

function quoteFromResponse(d: FinnhubQuoteResponse | null): Quote | null {
  if (!d) return null;
  const hasPrice = typeof d.c === "number" && d.c > 0;
  if (!hasPrice) return null;
  return {
    price: d.c!,
    change: typeof d.d === "number" ? d.d : null,
    changePct: typeof d.dp === "number" ? d.dp : null,
    source: "quote",
  };
}

// Try /stock/candle as a fallback for symbols where /quote returns c=0.
async function candleFallback(symbol: string, apiKey: string): Promise<Quote | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 60 * 60 * 24 * 7; // last 7 days to survive weekends/holidays
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}&token=${apiKey}`;
  console.log(`[quotes] candle fallback GET ${url.replace(apiKey, "***")}`);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = (await res.json()) as { s?: string; c?: number[] };
    if (j.s !== "ok" || !Array.isArray(j.c) || j.c.length === 0) return null;
    const last = j.c[j.c.length - 1];
    const prev = j.c.length >= 2 ? j.c[j.c.length - 2] : last;
    const change = last - prev;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    return { price: last, change, changePct, stale: true, source: "candle" };
  } catch {
    return null;
  }
}

// For European tickers like "GLE.PA", try the EURONEXT: exchange-prefix form
// when both /quote and /stock/candle come back empty.
const SUFFIX_TO_PREFIX: Record<string, string> = {
  ".PA": "EURONEXT",
  ".AS": "EURONEXT",
  ".BR": "EURONEXT",
  ".LS": "EURONEXT",
  ".MI": "MIL",
  ".MC": "BME",
  ".DE": "XETRA",
  ".F": "FRA",
  ".L": "LSE",
};

function alternateSymbols(symbol: string): string[] {
  const dot = symbol.lastIndexOf(".");
  if (dot <= 0) return [];
  const base = symbol.substring(0, dot);
  const suffix = symbol.substring(dot);
  const prefix = SUFFIX_TO_PREFIX[suffix];
  return prefix ? [`${prefix}:${base}`] : [];
}

export async function fetchQuote(symbol: string, apiKey: string): Promise<Quote> {
  // 1) Standard /quote
  const direct = quoteFromResponse(await rawQuote(symbol, apiKey));
  if (direct) return direct;

  // 2) Try alternate symbol formats (EURONEXT:GLE, XETRA:SAP …)
  for (const alt of alternateSymbols(symbol)) {
    const altQuote = quoteFromResponse(await rawQuote(alt, apiKey));
    if (altQuote) {
      console.log(`[quotes] ${symbol} resolved via alternate symbol ${alt}`);
      return { ...altQuote, source: "exchange-prefix" };
    }
  }

  // 3) Candle fallback (delayed data)
  const candle = await candleFallback(symbol, apiKey);
  if (candle) {
    console.log(`[quotes] ${symbol} resolved via candle fallback (delayed)`);
    return candle;
  }

  console.warn(`[quotes] ${symbol} -> no price available`);
  return { price: null, change: null, changePct: null, source: "none" };
}

export async function fetchQuotes(
  symbols: string[],
  apiKey: string,
): Promise<Record<string, Quote>> {
  const unique = Array.from(new Set(symbols.filter((s) => s && s.length <= 32))).slice(0, 50);
  const results = await Promise.all(unique.map((s) => fetchQuote(s, apiKey)));
  const map: Record<string, Quote> = {};
  unique.forEach((s, i) => (map[s] = results[i]));
  return map;
}

/**
 * Compute portfolio totals using live quote prices when available, falling
 * back to stored current_price / purchase_price.
 */
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

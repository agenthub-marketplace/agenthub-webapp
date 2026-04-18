// Server-only quote helper.
// US tickers → Finnhub. European tickers (.PA .AS .DE .MI .MC .LS .BR .L) → Twelve Data.

export type Quote = {
  price: number | null;
  change: number | null; // absolute daily change per share
  changePct: number | null; // daily % change
  stale?: boolean;
  source?: "finnhub" | "twelvedata" | "candle" | "exchange-prefix" | "none";
};

const EU_SUFFIXES = [".PA", ".AS", ".DE", ".MI", ".MC", ".LS", ".BR", ".L", ".F"];

export function isEuropeanTicker(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return EU_SUFFIXES.some((s) => upper.endsWith(s));
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
// Twelve Data (Europe)
// ---------------------------------------------------------------------------

type TwelveQuoteResponse = {
  close?: string | number;
  change?: string | number;
  percent_change?: string | number;
  status?: string;
  code?: number;
  message?: string;
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

async function twelveDataQuote(symbol: string, apiKey: string): Promise<Quote> {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  console.log(`[quotes:twelvedata] GET ${url.replace(apiKey, "***")}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[quotes:twelvedata] ${symbol} -> HTTP ${res.status}`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    const d = (await res.json()) as TwelveQuoteResponse;
    console.log(`[quotes:twelvedata] ${symbol} ->`, JSON.stringify(d));
    if (d.status === "error" || d.code) {
      console.warn(`[quotes:twelvedata] ${symbol} error: ${d.message ?? "unknown"}`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    const price = num(d.close);
    if (price == null) {
      return { price: null, change: null, changePct: null, source: "none" };
    }
    return {
      price,
      change: num(d.change),
      changePct: num(d.percent_change),
      source: "twelvedata",
    };
  } catch (e) {
    console.error(`[quotes:twelvedata] ${symbol} fetch error`, e);
    return { price: null, change: null, changePct: null, source: "none" };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchQuote(symbol: string, finnhubKey: string): Promise<Quote> {
  if (isEuropeanTicker(symbol)) {
    const twelveKey = process.env.TWELVE_DATA_API_KEY;
    if (!twelveKey) {
      console.warn(`[quotes] TWELVE_DATA_API_KEY missing for EU ticker ${symbol}`);
      return { price: null, change: null, changePct: null, source: "none" };
    }
    return twelveDataQuote(symbol, twelveKey);
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
// Logos (Finnhub for US, Twelve Data for EU)
// ---------------------------------------------------------------------------

export async function fetchLogo(symbol: string, finnhubKey: string): Promise<string | null> {
  try {
    if (isEuropeanTicker(symbol)) {
      const twelveKey = process.env.TWELVE_DATA_API_KEY;
      if (!twelveKey) return null;
      const url = `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(symbol)}&apikey=${twelveKey}`;
      console.log(`[logo:twelvedata] GET ${url.replace(twelveKey, "***")}`);
      const res = await fetch(url);
      if (!res.ok) return null;
      const d = (await res.json()) as { url?: string };
      return d.url || null;
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

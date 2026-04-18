// Server-only Finnhub quote helper. Shared by /api/dashboard and /api/stocks/quote
// so portfolio totals are always computed from the same source of truth.

export type Quote = {
  price: number | null;
  change: number | null; // absolute daily change per share (Finnhub "d")
  changePct: number | null; // daily % change (Finnhub "dp")
};

export async function fetchQuote(symbol: string, apiKey: string): Promise<Quote> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    );
    if (!res.ok) return { price: null, change: null, changePct: null };
    const d = (await res.json()) as { c?: number; d?: number; dp?: number };
    return {
      price: typeof d.c === "number" && d.c > 0 ? d.c : null,
      change: typeof d.d === "number" ? d.d : null,
      changePct: typeof d.dp === "number" ? d.dp : null,
    };
  } catch {
    return { price: null, change: null, changePct: null };
  }
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
 *
 * Returns the canonical numbers used by both the dashboard and portfolio page.
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

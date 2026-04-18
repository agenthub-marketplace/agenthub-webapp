// Detect which "market" a position belongs to based on its ticker/ISIN.
// Used by the price-refresh cron to schedule refreshes at the right local close.

export type Market =
  | "us" // NYSE / NASDAQ / AMEX  -> 22:00 Paris
  | "eu" // Euronext Paris/Amsterdam/Brussels/Lisbon, Frankfurt, Milan, Madrid -> 17:35 Paris
  | "uk" // London Stock Exchange -> 17:30 Paris
  | "asia" // Tokyo, Hong Kong, Shanghai, Shenzhen, Korea -> 09:00 Paris (next day)
  | "crypto" // 24/7 -> hourly
  | "other"; // Commodities, indices, anything unmatched -> 22:00 Paris

const SUFFIX_MAP: Record<string, Market> = {
  // Europe
  ".PA": "eu", // Euronext Paris
  ".AS": "eu", // Euronext Amsterdam
  ".BR": "eu", // Euronext Brussels
  ".LS": "eu", // Euronext Lisbon
  ".DE": "eu", // XETRA / Frankfurt
  ".F": "eu", // Frankfurt
  ".MI": "eu", // Borsa Italiana (Milan)
  ".MC": "eu", // Bolsa Madrid
  ".SW": "eu", // SIX Swiss
  ".VI": "eu", // Vienna
  ".HE": "eu", // Helsinki
  ".ST": "eu", // Stockholm
  ".CO": "eu", // Copenhagen
  ".OL": "eu", // Oslo
  ".IR": "eu", // Dublin
  ".LS_PA": "eu",
  // UK
  ".L": "uk",
  ".LON": "uk",
  // Asia
  ".T": "asia", // Tokyo
  ".HK": "asia", // Hong Kong
  ".SS": "asia", // Shanghai
  ".SZ": "asia", // Shenzhen
  ".KS": "asia", // Korea Composite
  ".KQ": "asia", // KOSDAQ
  ".TW": "asia", // Taiwan
  ".SI": "asia", // Singapore
  ".BK": "asia", // Bangkok
  ".NS": "asia", // National Stock Exchange of India
  ".BO": "asia", // Bombay
};

const CRYPTO_PREFIXES = ["BINANCE:", "COINBASE:", "KRAKEN:", "BITFINEX:", "GEMINI:"];

/**
 * Best-effort market detection from the Finnhub-style ticker symbol alone.
 *
 * Examples:
 *   "AAPL"          -> "us"
 *   "TTE.PA"        -> "eu"
 *   "BARC.L"        -> "uk"
 *   "7203.T"        -> "asia"
 *   "BINANCE:BTCUSDT" -> "crypto"
 *   "^GSPC"         -> "other" (index)
 */
export function detectMarket(ticker: string | null | undefined): Market {
  if (!ticker) return "other";
  const t = ticker.trim().toUpperCase();
  if (!t) return "other";

  // Crypto exchanges use "EXCHANGE:PAIR" notation in Finnhub
  if (CRYPTO_PREFIXES.some((p) => t.startsWith(p))) return "crypto";
  // Common bare crypto pairs e.g. BTCUSDT, ETHUSDT
  if (/^(BTC|ETH|SOL|XRP|ADA|DOGE|BNB|MATIC|DOT|AVAX|LTC|LINK)(USDT?|EUR|USD)$/.test(t)) {
    return "crypto";
  }

  // Indices (^GSPC, ^FCHI, ^FTSE, ^N225 ...)
  if (t.startsWith("^")) return "other";

  // Commodity futures often look like CL=F, GC=F
  if (t.endsWith("=F")) return "other";

  // Suffix-based detection (".PA", ".L", ".T" etc.)
  const dotIndex = t.lastIndexOf(".");
  if (dotIndex > 0) {
    const suffix = t.substring(dotIndex);
    if (SUFFIX_MAP[suffix]) return SUFFIX_MAP[suffix];
  }

  // No suffix and not an index/crypto -> assume US (NYSE/NASDAQ tickers have no suffix)
  if (/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t) && !t.includes(".")) return "us";

  return "other";
}

/**
 * Markets handled by the refresh cron. The "other" bucket runs alongside US
 * at 22:00 Paris.
 */
export const ALL_MARKETS: Market[] = ["us", "eu", "uk", "asia", "crypto", "other"];

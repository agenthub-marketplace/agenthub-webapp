import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

type FigiResult = {
  name?: string;
  ticker?: string;
  exchCode?: string;
  securityType?: string;
  securityType2?: string;
  marketSector?: string;
  // OpenFIGI sometimes returns a sector field on /v3/search hits
  sector?: string;
  industrySector?: string;
};

const ASSET_TYPE_MAP: Record<string, string> = {
  "Common Stock": "Action",
  "Preferred Stock": "Action",
  "Depositary Receipt": "Action",
  REIT: "Action",
  ETP: "ETF",
  ETF: "ETF",
  "Mutual Fund": "Fonds",
  "Open-End Fund": "Fonds",
  "Closed-End Fund": "Fonds",
  Bond: "Obligation",
  "Corporate Bond": "Obligation",
  "Govt Bond": "Obligation",
};

function mapAssetType(r: FigiResult): string {
  const t = r.securityType2 || r.securityType || "";
  if (ASSET_TYPE_MAP[t]) return ASSET_TYPE_MAP[t];
  if (/etf/i.test(t)) return "ETF";
  if (/bond/i.test(t)) return "Obligation";
  if (/fund/i.test(t)) return "Fonds";
  if (/stock|equity|share/i.test(t)) return "Action";
  return t || "Autre";
}

const GEOGRAPHY_MAP: Record<string, string> = {
  EPA: "Europe - France",
  ENX: "Europe - France",
  XETRA: "Europe - Allemagne",
  GER: "Europe - Allemagne",
  LSE: "Europe - Royaume-Uni",
  AMS: "Europe - Pays-Bas",
  NASDAQ: "États-Unis",
  NYSE: "États-Unis",
  BATS: "États-Unis",
};

function mapGeography(exchCode: string): string {
  return GEOGRAPHY_MAP[exchCode] ?? "Autre";
}

export const Route = createFileRoute("/api/assets/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        let body: any;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Body JSON invalide", 400);
        }

        const query = String(body?.query ?? "").trim();
        if (query.length < 2) {
          return jsonResponse({ results: [] });
        }

        const apiKey = process.env.OPENFIGI_API_KEY;
        if (!apiKey) {
          console.error("[api/assets/search] OPENFIGI_API_KEY missing");
          return errorResponse("Service de recherche indisponible", 500);
        }

        const ALLOWED_TYPES = ["Common Stock", "ETF", "Mutual Fund"] as const;

        // Build the request matrix: for each allowed securityType2, run
        // both a name-search (query) and a ticker-search (ticker filter +
        // upper-cased input) so the user can search either way.
        const upperQuery = query.toUpperCase();
        const requests: Array<Record<string, string>> = [];
        for (const securityType2 of ALLOWED_TYPES) {
          requests.push({ query, securityType2 });
          requests.push({ query: upperQuery, ticker: upperQuery, securityType2 });
        }

        try {
          console.log("[api/assets/search] query:", query, "→ sending", requests.length, "OpenFIGI requests");
          console.log("[api/assets/search] request bodies:", JSON.stringify(requests));
          const responses = await Promise.all(
            requests.map((bodyPayload) =>
              fetch("https://api.openfigi.com/v3/search", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-OPENFIGI-APIKEY": apiKey,
                },
                body: JSON.stringify(bodyPayload),
              }),
            ),
          );

          const allRaw: FigiResult[] = [];
          for (let i = 0; i < responses.length; i++) {
            const r = responses[i];
            if (!r.ok) {
              const txt = await r.text().catch(() => "");
              console.error("[api/assets/search] OpenFIGI error", r.status, "for", JSON.stringify(requests[i]), "body:", txt);
              continue;
            }
            const json = (await r.json()) as { data?: FigiResult[] };
            console.log("[api/assets/search] OpenFIGI ok for", JSON.stringify(requests[i]), "→", json.data?.length ?? 0, "results");
            if (json.data?.length) allRaw.push(...json.data);
          }
          console.log("[api/assets/search] total raw results:", allRaw.length);

          // Defensive allowlist filter — exclude futures, options, warrants,
          // rights and any derivative instruments.
          const allowed = new Set<string>(ALLOWED_TYPES);
          const filtered = allRaw.filter(
            (r) => r.securityType2 && allowed.has(r.securityType2),
          );
          console.log("[api/assets/search] after type filter:", filtered.length);

          // Rank: exact ticker match first, then exchange preference (US/EU
          // primary listings before obscure venues), then encounter order.
          const exchangeRank = (e: string) =>
            ({
              NASDAQ: 0,
              NYSE: 0,
              BATS: 0,
              EPA: 1,
              ENX: 1,
              XETRA: 1,
              GER: 1,
              LSE: 1,
              AMS: 1,
            }[e] ?? 5);

          filtered.sort((a, b) => {
            const aExact = a.ticker?.toUpperCase() === upperQuery ? 0 : 1;
            const bExact = b.ticker?.toUpperCase() === upperQuery ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
            return exchangeRank(a.exchCode ?? "") - exchangeRank(b.exchCode ?? "");
          });

          // Dedupe by ticker+exchange, keep first 6 with a name + ticker.
          const seen = new Set<string>();
          const results = [] as Array<{
            name: string;
            ticker: string;
            exchange: string;
            asset_type: string;
            security_type: string;
            sector: string;
            geography: string;
          }>;
          for (const r of filtered) {
            if (!r.name || !r.ticker || !r.exchCode) continue;
            const key = `${r.ticker}|${r.exchCode}`;
            if (seen.has(key)) continue;
            seen.add(key);
            results.push({
              name: r.name,
              ticker: r.ticker,
              exchange: r.exchCode,
              asset_type: mapAssetType(r),
              security_type: r.securityType2 || r.securityType || "",
              sector: r.sector || r.industrySector || r.marketSector || "Autre",
              geography: mapGeography(r.exchCode),
            });
            if (results.length >= 6) break;
          }

          return jsonResponse({ results });
        } catch (err) {
          console.error("[api/assets/search] fetch failed", err);
          return errorResponse("Erreur du service de recherche", 502);
        }
      },
    },
  },
});

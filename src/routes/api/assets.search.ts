import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

type FigiResult = {
  name?: string;
  ticker?: string;
  exchCode?: string;
  securityType?: string;
  securityType2?: string;
  marketSector?: string;
  sector?: string;
  industrySector?: string;
};

// Allowed instrument types (defensive — we filter again after API).
const ALLOWED_TYPES = ["Common Stock", "ETF"] as const;

const ASSET_TYPE_MAP: Record<string, string> = {
  "Common Stock": "Action",
  ETF: "ETF",
};

function mapAssetType(r: FigiResult): string {
  const t = r.securityType2 || r.securityType || "";
  if (ASSET_TYPE_MAP[t]) return ASSET_TYPE_MAP[t];
  if (/etf/i.test(t)) return "ETF";
  return "Action";
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

// Exchange priority — lower number wins when deduplicating by company name.
const EXCHANGE_PRIORITY: Record<string, number> = {
  NYSE: 0,
  NASDAQ: 1,
  EPA: 2,
  ENX: 2,
  XETRA: 3,
  GER: 3,
  LSE: 4,
  AMS: 5,
  BATS: 6,
};

function exchangeRank(e: string): number {
  return EXCHANGE_PRIORITY[e] ?? 50;
}

// Sector inference from well-known company names when OpenFIGI is silent.
const SECTOR_KEYWORDS: Array<{ pattern: RegExp; sector: string }> = [
  { pattern: /apple|microsoft|google|alphabet|meta|facebook|amazon|tesla|nvidia|netflix|oracle|salesforce|adobe|intel|amd|cisco/i, sector: "Technologie" },
  { pattern: /totalenergies|total\b|shell|bp\b|exxon|chevron|engie|edf|eni\b|repsol|equinor/i, sector: "Energie" },
  { pattern: /lvmh|hermès|hermes|kering|richemont|moncler|burberry|prada|pernod|christian dior/i, sector: "Luxe" },
  { pattern: /bnp|société générale|societe generale|axa|crédit agricole|credit agricole|santander|hsbc|barclays|deutsche bank|ing\b|unicredit|intesa/i, sector: "Banques" },
  { pattern: /air france|lufthansa|united airlines|delta air|american airlines|ryanair|easyjet|iag\b/i, sector: "Aviation" },
  { pattern: /pfizer|sanofi|novartis|roche|astrazeneca|moderna|merck|johnson|gsk|bayer|novo nordisk/i, sector: "Santé" },
  { pattern: /nestlé|nestle|danone|unilever|coca-cola|pepsi|kraft|mondelez|carrefour|ahold/i, sector: "Consommation" },
  { pattern: /etf|index|msci|s&p|stoxx|cac\s?40|nasdaq\s?100|ftse|world|emerging/i, sector: "ETF" },
];

function inferSector(name: string, fromFigi?: string | null): string {
  if (fromFigi && fromFigi.trim()) return fromFigi.trim();
  for (const { pattern, sector } of SECTOR_KEYWORDS) {
    if (pattern.test(name)) return sector;
  }
  return "Autre";
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

        // Build request matrix: name + ticker search × Common Stock + ETF.
        const upperQuery = query.toUpperCase();
        const requests: Array<Record<string, string>> = [];
        for (const securityType2 of ALLOWED_TYPES) {
          requests.push({ query, securityType2 });
          requests.push({ query: upperQuery, ticker: upperQuery, securityType2 });
        }

        try {
          console.log("[api/assets/search] query:", query, "→", requests.length, "OpenFIGI requests");
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
            if (json.data?.length) allRaw.push(...json.data);
          }
          console.log("[api/assets/search] total raw results:", allRaw.length);

          // 1. Allowlist filter — Common Stock + ETF only.
          const allowed = new Set<string>(ALLOWED_TYPES);
          const filtered = allRaw.filter(
            (r) =>
              r.name &&
              r.ticker &&
              r.exchCode &&
              r.securityType2 &&
              allowed.has(r.securityType2),
          );

          // 2. Sort by: exact ticker match → exchange priority → encounter order.
          filtered.sort((a, b) => {
            const aExact = a.ticker?.toUpperCase() === upperQuery ? 0 : 1;
            const bExact = b.ticker?.toUpperCase() === upperQuery ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
            return exchangeRank(a.exchCode ?? "") - exchangeRank(b.exchCode ?? "");
          });

          // 3. Deduplicate by NORMALISED company name — keep the best-ranked exchange.
          const seenName = new Set<string>();
          const results: Array<{
            name: string;
            ticker: string;
            exchange: string;
            asset_type: string;
            security_type: string;
            sector: string;
            geography: string;
          }> = [];

          for (const r of filtered) {
            const normName = (r.name ?? "").toLowerCase().replace(/\s+/g, " ").trim();
            if (!normName || seenName.has(normName)) continue;
            seenName.add(normName);

            const figiSector = r.sector || r.industrySector || r.marketSector || null;
            results.push({
              name: r.name!,
              ticker: r.ticker!,
              exchange: r.exchCode!,
              asset_type: mapAssetType(r),
              security_type: r.securityType2 || r.securityType || "",
              sector: inferSector(r.name!, figiSector),
              geography: mapGeography(r.exchCode!),
            });
            if (results.length >= 6) break;
          }

          console.log("[api/assets/search] returning", results.length, "deduped results");
          return jsonResponse({ results });
        } catch (err) {
          console.error("[api/assets/search] fetch failed", err);
          return errorResponse("Erreur du service de recherche", 502);
        }
      },
    },
  },
});

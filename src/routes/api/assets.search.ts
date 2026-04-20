import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

type FigiResult = {
  name?: string;
  ticker?: string;
  exchCode?: string;
  securityType?: string;
  securityType2?: string;
  marketSector?: string;
};

const ASSET_TYPE_MAP: Record<string, string> = {
  "Common Stock": "Action",
  "Preferred Stock": "Action",
  "Depositary Receipt": "Action",
  "REIT": "Action",
  "ETP": "ETF",
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

        try {
          // OpenFIGI /v3/search supports a single securityType2 filter per
          // request — fan out one call per allowed type and merge.
          const responses = await Promise.all(
            ALLOWED_TYPES.map((securityType2) =>
              fetch("https://api.openfigi.com/v3/search", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-OPENFIGI-APIKEY": apiKey,
                },
                body: JSON.stringify({ query, securityType2 }),
              }),
            ),
          );

          const allRaw: FigiResult[] = [];
          for (const r of responses) {
            if (!r.ok) {
              const txt = await r.text().catch(() => "");
              console.error("[api/assets/search] OpenFIGI error", r.status, txt);
              continue;
            }
            const json = (await r.json()) as { data?: FigiResult[] };
            if (json.data?.length) allRaw.push(...json.data);
          }

          // Defensive allowlist filter — exclude futures, options, warrants,
          // rights and any derivative instruments.
          const allowed = new Set<string>(ALLOWED_TYPES);
          const filtered = allRaw.filter(
            (r) => r.securityType2 && allowed.has(r.securityType2),
          );

          // Dedupe by ticker+exchange, keep first 6 with a name + ticker.
          const seen = new Set<string>();
          const results = [] as Array<{
            name: string;
            ticker: string;
            exchange: string;
            asset_type: string;
            security_type: string;
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

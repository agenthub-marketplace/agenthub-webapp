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

        try {
          const figiRes = await fetch("https://api.openfigi.com/v3/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-OPENFIGI-APIKEY": apiKey,
            },
            body: JSON.stringify({ query }),
          });

          if (!figiRes.ok) {
            const txt = await figiRes.text().catch(() => "");
            console.error("[api/assets/search] OpenFIGI error", figiRes.status, txt);
            return errorResponse("Erreur du service de recherche", 502);
          }

          const data = (await figiRes.json()) as { data?: FigiResult[] };
          const raw = data.data ?? [];

          // Dedupe by ticker+exchange, keep first 6 with a name + ticker.
          const seen = new Set<string>();
          const results = [] as Array<{
            name: string;
            ticker: string;
            exchange: string;
            asset_type: string;
            security_type: string;
          }>;
          for (const r of raw) {
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

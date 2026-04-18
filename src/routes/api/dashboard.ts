import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

type RiskInput = {
  sector: string | null;
  geography: string | null;
  quantity: number;
  current_price: number | null;
  purchase_price: number | null;
};

function bucketWeights(
  positions: RiskInput[],
  key: "sector" | "geography",
): Map<string, number> {
  const buckets = new Map<string, number>();
  let total = 0;
  const weights = positions.map((p) => {
    const price = Number(p.current_price ?? p.purchase_price ?? 0);
    const w = Math.max(0, price * Number(p.quantity ?? 0));
    total += w;
    return w;
  });
  if (total <= 0) return buckets;
  positions.forEach((p, i) => {
    const k = (p[key] ?? "Autre") || "Autre";
    buckets.set(k, (buckets.get(k) ?? 0) + weights[i] / total);
  });
  return buckets;
}

function computeRiskScore(positions: RiskInput[]): {
  score: number;
  level: "Faible" | "Modéré" | "Élevé";
} {
  if (positions.length === 0) return { score: 0, level: "Faible" };

  let points = 0;
  const weights = positions.map((p) => {
    const price = Number(p.current_price ?? p.purchase_price ?? 0);
    return Math.max(0, price * Number(p.quantity ?? 0));
  });
  const total = weights.reduce((a, b) => a + b, 0);

  // Concentration risk (per-position)
  if (total > 0) {
    const shares = weights.map((w) => w / total);
    const max = Math.max(...shares);
    if (max > 0.4) points += 2;
    else if (max > 0.25) points += 1;
    if (max <= 0.15) points -= 1;
  }

  // Geographic diversification
  const geos = bucketWeights(positions, "geography");
  if (geos.size > 0) {
    const maxGeo = Math.max(...geos.values());
    if (maxGeo > 0.7) points += 2;
    else if (maxGeo > 0.5) points += 1;
    const geoOver10 = Array.from(geos.values()).filter((v) => v > 0.1).length;
    if (geoOver10 >= 3) points -= 1;
  }

  // Sector diversification
  const sectors = bucketWeights(positions, "sector");
  if (sectors.size > 0) {
    const maxSector = Math.max(...sectors.values());
    if (maxSector > 0.6) points += 2;
    else if (maxSector > 0.4) points += 1;
    const sectorOver5 = Array.from(sectors.values()).filter((v) => v > 0.05).length;
    if (sectorOver5 >= 4) points -= 1;
  }

  // Number of positions
  const n = positions.length;
  if (n < 3) points += 2;
  else if (n <= 5) points += 1;
  if (n > 10) points -= 1;

  const level: "Faible" | "Modéré" | "Élevé" =
    points <= 0 ? "Faible" : points <= 3 ? "Modéré" : "Élevé";

  return { score: points, level };
}

export const Route = createFileRoute("/api/dashboard")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const [profileRes, positionsRes, alertsRes] = await Promise.all([
          auth.userClient.from("profiles").select("*").eq("id", auth.userId).maybeSingle(),
          auth.userClient.from("positions").select("*"),
          auth.userClient
            .from("alerts")
            .select("*")
            .order("sent_at", { ascending: false })
            .limit(3),
        ]);

        if (profileRes.error || positionsRes.error || alertsRes.error) {
          console.error("[api/dashboard] db error", {
            profile: profileRes.error,
            positions: positionsRes.error,
            alerts: alertsRes.error,
          });
          return errorResponse("Une erreur interne est survenue", 500);
        }

        const positions = positionsRes.data ?? [];
        const totalValue = positions.reduce((sum, p) => {
          const price = Number(p.current_price ?? p.purchase_price ?? 0);
          return sum + price * Number(p.quantity ?? 0);
        }, 0);
        const risk = computeRiskScore(positions);

        return jsonResponse({
          profile: profileRes.data,
          totalValue,
          riskScore: risk.score,
          riskLevel: risk.level,
          recentAlerts: alertsRes.data ?? [],
        });
      },
    },
  },
});

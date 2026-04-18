import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

function computeRiskScore(positions: Array<{ sector: string | null; geography: string | null; quantity: number; current_price: number | null; purchase_price: number | null }>): number {
  if (positions.length === 0) return 0;
  const weights = positions.map((p) => {
    const price = Number(p.current_price ?? p.purchase_price ?? 0);
    return Math.max(0, price * Number(p.quantity ?? 0));
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  // Herfindahl index across sector + geography combo
  const buckets = new Map<string, number>();
  positions.forEach((p, i) => {
    const key = `${p.sector ?? "?"}|${p.geography ?? "?"}`;
    buckets.set(key, (buckets.get(key) ?? 0) + weights[i] / total);
  });
  const hhi = Array.from(buckets.values()).reduce((s, w) => s + w * w, 0);
  // hhi: 1 = fully concentrated (risky), 1/n = perfectly diversified
  // Map to 0-100 risk score (higher = riskier)
  return Math.round(hhi * 100);
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

        if (profileRes.error) return errorResponse(profileRes.error.message, 500);
        if (positionsRes.error) return errorResponse(positionsRes.error.message, 500);
        if (alertsRes.error) return errorResponse(alertsRes.error.message, 500);

        const positions = positionsRes.data ?? [];
        const totalValue = positions.reduce((sum, p) => {
          const price = Number(p.current_price ?? p.purchase_price ?? 0);
          return sum + price * Number(p.quantity ?? 0);
        }, 0);
        const riskScore = computeRiskScore(positions);

        return jsonResponse({
          profile: profileRes.data,
          totalValue,
          riskScore,
          recentAlerts: alertsRes.data ?? [],
        });
      },
    },
  },
});

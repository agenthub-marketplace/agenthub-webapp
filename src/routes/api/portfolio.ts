import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/portfolio")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { data, error } = await auth.userClient
          .from("positions")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("[api/portfolio GET] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }

        const items = data ?? [];
        const totalValue = items.reduce((sum, p) => {
          const price = Number(p.current_price ?? p.purchase_price ?? 0);
          return sum + price * Number(p.quantity ?? 0);
        }, 0);

        return jsonResponse({ items, totalValue });
      },
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        let body: any;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Body JSON invalide", 400);
        }

        const { ticker, name, quantity, buy_price, sector, geography, isin } = body ?? {};
        if (!ticker || !name || quantity == null) {
          return errorResponse("ticker, name, quantity requis", 400);
        }

        const { data, error } = await auth.userClient
          .from("positions")
          .insert({
            user_id: auth.userId,
            ticker,
            name,
            company: name,
            quantity: Number(quantity),
            purchase_price: buy_price != null ? Number(buy_price) : null,
            sector: sector ?? null,
            geography: geography ?? null,
            isin: isin ?? null,
            source: "manual",
          })
          .select()
          .single();
        if (error) {
          console.error("[api/portfolio POST] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }
        return jsonResponse({ item: data }, 201);
      },
    },
  },
});

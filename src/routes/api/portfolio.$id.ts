import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";
import type { TablesUpdate } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/portfolio/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      PATCH: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        let body: any;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Body JSON invalide", 400);
        }

        const updates: TablesUpdate<"positions"> = {};
        if (body.ticker !== undefined) updates.ticker = String(body.ticker).toUpperCase();
        if (body.name !== undefined) {
          updates.name = body.name;
          updates.company = body.name;
        }
        if (body.quantity !== undefined) updates.quantity = Number(body.quantity);
        if (body.buy_price !== undefined)
          updates.purchase_price = body.buy_price === null || body.buy_price === "" ? null : Number(body.buy_price);
        if (body.sector !== undefined) updates.sector = body.sector || null;
        if (body.geography !== undefined) updates.geography = body.geography || null;
        if (body.isin !== undefined) updates.isin = body.isin || null;

        const { data, error } = await auth.userClient
          .from("positions")
          .update(updates)
          .eq("id", params.id)
          .select()
          .single();
        if (error) {
          console.error("[api/portfolio PATCH] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }
        return jsonResponse({ item: data });
      },
      DELETE: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const { error } = await auth.userClient
          .from("positions")
          .delete()
          .eq("id", params.id);
        if (error) {
          console.error("[api/portfolio DELETE] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }
        return jsonResponse({ success: true });
      },
    },
  },
});

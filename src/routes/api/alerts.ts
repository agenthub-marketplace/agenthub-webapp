import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/alerts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        // 1. Load user positions to derive ISINs/tickers/sectors.
        const { data: positions, error: pErr } = await auth.userClient
          .from("positions")
          .select("isin, ticker, sector");
        if (pErr) {
          console.error("[api/alerts] positions error", pErr);
          return errorResponse("Une erreur interne est survenue", 500);
        }

        const userSymbols = new Set<string>();
        const userSectors = new Set<string>();
        for (const p of positions ?? []) {
          if (p.isin) userSymbols.add(p.isin.toUpperCase());
          if (p.ticker) userSymbols.add(p.ticker.toUpperCase());
          if (p.sector) userSectors.add(p.sector);
        }

        // 2. Fetch all alerts visible to the user (RLS already scopes them).
        const { data, error } = await auth.userClient
          .from("alerts")
          .select("*")
          .order("sent_at", { ascending: false });
        if (error) {
          console.error("[api/alerts] db error", error);
          return errorResponse("Une erreur interne est survenue", 500);
        }

        // 3. Filter: keep alerts matching at least one ISIN/ticker OR sector.
        // If user has no positions yet, show everything (onboarding).
        const filtered = userSymbols.size === 0 && userSectors.size === 0
          ? (data ?? [])
          : (data ?? []).filter((a) => {
              const symHit = (a.isins ?? []).some((s) =>
                userSymbols.has(String(s).toUpperCase()),
              );
              const sectors = (a as any).sectors as string[] | null;
              const secHit = (sectors ?? []).some((s) => userSectors.has(s));
              return symHit || secHit;
            });

        // 4. Mark unread ones as read.
        const unreadIds = filtered.filter((a) => !a.is_read).map((a) => a.id);
        if (unreadIds.length > 0) {
          await auth.userClient.from("alerts").update({ is_read: true }).in("id", unreadIds);
        }

        return jsonResponse({ alerts: filtered });
      },
    },
  },
});

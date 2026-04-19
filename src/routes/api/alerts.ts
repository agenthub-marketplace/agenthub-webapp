import { createFileRoute } from "@tanstack/react-router";
import { CORS, jsonResponse, errorResponse, requireUser } from "@/lib/api-auth";

export const Route = createFileRoute("/api/alerts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        // 1. Load user positions to derive ISINs/tickers/sectors AND attach context.
        const { data: positions, error: pErr } = await auth.userClient
          .from("positions")
          .select("isin, ticker, company, sector, quantity, purchase_price, current_price, logo_url");
        if (pErr) {
          console.error("[api/alerts] positions error", pErr);
          return errorResponse("Une erreur interne est survenue", 500);
        }

        const userSymbols = new Set<string>();
        const userSectors = new Set<string>();
        const positionBySymbol = new Map<string, typeof positions[number]>();
        let portfolioValue = 0;
        for (const p of positions ?? []) {
          const value = Number(p.current_price ?? p.purchase_price ?? 0) * Number(p.quantity ?? 0);
          portfolioValue += value;
          if (p.isin) {
            userSymbols.add(p.isin.toUpperCase());
            positionBySymbol.set(p.isin.toUpperCase(), p);
          }
          if (p.ticker) {
            userSymbols.add(p.ticker.toUpperCase());
            if (!positionBySymbol.has(p.ticker.toUpperCase())) {
              positionBySymbol.set(p.ticker.toUpperCase(), p);
            }
          }
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

        // 4. Attach per-alert user position context (first matching ISIN/ticker).
        const enriched = filtered.map((a) => {
          let pos: typeof positions[number] | undefined;
          for (const sym of a.isins ?? []) {
            const p = positionBySymbol.get(String(sym).toUpperCase());
            if (p) { pos = p; break; }
          }
          const qty = Number(pos?.quantity ?? 0);
          const cur = Number(pos?.current_price ?? pos?.purchase_price ?? 0);
          const purchase = Number(pos?.purchase_price ?? 0);
          const positionValue = qty * cur;
          const gainLossEuros = qty * (cur - purchase);
          const gainLossPct = purchase > 0 ? ((cur - purchase) / purchase) * 100 : null;
          return {
            ...a,
            user_position: pos
              ? {
                  company: pos.company,
                  ticker: pos.ticker,
                  logo_url: pos.logo_url,
                  quantity: qty,
                  current_price: cur,
                  position_value: positionValue,
                  gain_loss_euros: gainLossEuros,
                  gain_loss_percent: gainLossPct,
                  portfolio_value: portfolioValue,
                  position_weight_percent: portfolioValue > 0 ? (positionValue / portfolioValue) * 100 : null,
                }
              : null,
          };
        });

        // 5. Mark unread ones as read.
        const unreadIds = enriched.filter((a) => !a.is_read).map((a) => a.id);
        if (unreadIds.length > 0) {
          await auth.userClient.from("alerts").update({ is_read: true }).in("id", unreadIds);
        }

        return jsonResponse({ alerts: enriched });
      },
    },
  },
});

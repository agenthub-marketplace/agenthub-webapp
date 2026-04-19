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
          .select("isin, ticker, company, name, sector, quantity, purchase_price, current_price, logo_url");
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
        // Also keep alerts with NO tags at all (broadcast alerts) so they're not silently dropped.
        const filtered = userSymbols.size === 0 && userSectors.size === 0
          ? (data ?? [])
          : (data ?? []).filter((a) => {
              const isins = (a.isins ?? []).filter((s) => s && String(s).trim() !== "");
              const sectors = (((a as any).sectors as string[] | null) ?? []).filter(
                (s) => s && String(s).trim() !== "",
              );
              // Broadcast alert (no tags) → keep it.
              if (isins.length === 0 && sectors.length === 0) return true;
              const symHit = isins.some((s) => userSymbols.has(String(s).toUpperCase()));
              const secHit = sectors.some((s) => userSectors.has(s));
              return symHit || secHit;
            });

        // 4. Attach per-alert user position context.
        // Primary match: any of alert.isins matches a known ISIN/ticker.
        // Fallback: alert.isins is empty/blank → try to find a position whose
        // ticker or company name appears in the alert title (case-insensitive).
        const positionsList = positions ?? [];
        const normalizeText = (value: string | null | undefined) =>
          String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
        const ignoredWords = new Set([
          "inc", "corp", "corporation", "company", "co", "group", "holding", "holdings",
          "plc", "sa", "nv", "ag", "ltd", "limited",
        ]);
        const hasLabelHintMatch = (
          label: string | null | undefined,
          normalizedTitle: string,
          leadHint: string,
        ) => {
          const normalizedLabel = normalizeText(label);
          if (!normalizedLabel) return false;
          if (normalizedTitle.includes(normalizedLabel) || (leadHint && normalizedLabel.includes(leadHint))) {
            return true;
          }
          if (!leadHint) return false;
          return normalizedLabel
            .split(" ")
            .some((word) => word.length >= 3 && !ignoredWords.has(word) && leadHint.includes(word));
        };
        const findPositionFromTitle = (title: string | null) => {
          const normalizedTitle = normalizeText(title);
          const leadHint = normalizeText((title ?? "").split(/[:•\-|—]/)[0]);
          if (!normalizedTitle) return undefined;

          const candidates = positionsList
            .map((p) => {
              const ticker = normalizeText(p.ticker);
              const titleTokens = normalizedTitle.split(" ").filter(Boolean);
              const tickerHit = ticker ? titleTokens.includes(ticker) : false;
              const companyHit = hasLabelHintMatch(p.company, normalizedTitle, leadHint);
              const nameHit = hasLabelHintMatch(p.name, normalizedTitle, leadHint);
              const score = tickerHit ? 3 : companyHit || nameHit ? 2 : 0;
              const positionValue = Number(p.quantity ?? 0) * Number(p.current_price ?? p.purchase_price ?? 0);
              return { position: p, score, positionValue };
            })
            .filter((candidate) => candidate.score > 0)
            .sort((a, b) => b.score - a.score || b.positionValue - a.positionValue);

          return candidates[0]?.position;
        };

        const enriched = filtered.map((a) => {
          let pos: typeof positionsList[number] | undefined;
          const cleanIsins = (a.isins ?? []).filter(
            (s) => s && String(s).trim() !== "",
          );
          for (const sym of cleanIsins) {
            const p = positionBySymbol.get(String(sym).toUpperCase());
            if (p) { pos = p; break; }
          }
          if (!pos) {
            pos = findPositionFromTitle(a.title);
          }
          const qty = Number(pos?.quantity ?? 0);
          const cur = Number(pos?.current_price ?? pos?.purchase_price ?? 0);
          const purchase = Number(pos?.purchase_price ?? 0);
          const positionValue = qty * cur;
          const gainLossEuros = qty * (cur - purchase);
          const gainLossPct = purchase > 0 ? ((cur - purchase) / purchase) * 100 : null;
          const userPosition = pos
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
            : null;
          return {
            ...a,
            user_position: userPosition,
          };
        });

        // Note: alerts are NOT marked as read here. They are marked as read
        // explicitly when the user expands a card (PATCH /api/alerts/:id/read).

        return jsonResponse({ alerts: enriched });
      },
    },
  },
});

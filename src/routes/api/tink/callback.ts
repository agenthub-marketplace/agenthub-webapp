import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/tink/callback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const { code } = await request.json();
          if (!code) return new Response(JSON.stringify({ error: "code manquant" }), { status: 400, headers: CORS });

          const clientId = process.env.TINK_CLIENT_ID;
          const clientSecret = process.env.TINK_CLIENT_SECRET;
          if (!clientId || !clientSecret) {
            return new Response(JSON.stringify({ error: "Credentials Tink manquants" }), { status: 500, headers: CORS });
          }

          // Verify Supabase user from Authorization
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.replace(/^Bearer\s+/i, "");
          if (!token) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: CORS });
          const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userRes.user) {
            return new Response(JSON.stringify({ error: "Session invalide" }), { status: 401, headers: CORS });
          }
          const userId = userRes.user.id;

          // 1) Exchange authorization code → access_token
          const tokenRes = await fetch("https://api.tink.com/api/v1/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: "authorization_code",
            }),
          });
          const tokenJson: any = await tokenRes.json();
          if (!tokenRes.ok) {
            return new Response(JSON.stringify({ error: `Tink token: ${tokenJson.error_description ?? tokenJson.error ?? tokenRes.status}` }), { status: 502, headers: CORS });
          }
          const accessToken = tokenJson.access_token as string;
          const refreshToken = tokenJson.refresh_token as string | undefined;
          const expiresIn = tokenJson.expires_in as number | undefined;

          // 2) Fetch investment holdings
          let imported = 0;
          try {
            const accountsRes = await fetch("https://api.tink.com/data/v2/accounts", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const accountsJson: any = await accountsRes.json();
            const investmentAccounts = (accountsJson.accounts ?? []).filter((a: any) => a.type === "INVESTMENT");

            for (const acc of investmentAccounts) {
              const holdRes = await fetch(`https://api.tink.com/data/v2/accounts/${acc.id}/investments`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (!holdRes.ok) continue;
              const holdJson: any = await holdRes.json();
              for (const h of holdJson.instruments ?? []) {
                const ticker = h.symbol ?? h.isin ?? "N/A";
                const name = h.name ?? ticker;
                const isin = h.isin ?? null;
                const quantity = Number(h.quantity ?? 0);
                const price = Number(h.price?.unscaledValue ?? 0) / Math.pow(10, h.price?.scale ?? 0);
                await supabaseAdmin.from("positions").insert({
                  user_id: userId,
                  ticker,
                  company: name,
                  name,
                  isin,
                  quantity,
                  current_price: price || null,
                  source: "tink",
                });
                imported++;
              }
            }
          } catch (e) {
            // Sandbox often has no investment data → still consider connection a success
          }

          // Save broker connection
          await supabaseAdmin.from("broker_connections").insert({
            user_id: userId,
            provider: "tink",
            access_token: accessToken,
            refresh_token: refreshToken ?? null,
            expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
            status: "active",
          });

          return new Response(JSON.stringify({ imported }), { status: 200, headers: CORS });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "Erreur serveur" }), { status: 500, headers: CORS });
        }
      },
    },
  },
});

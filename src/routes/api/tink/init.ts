import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/tink/init")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async () => {
        const clientId = process.env.TINK_CLIENT_ID;
        if (!clientId) {
          return new Response(JSON.stringify({ error: "TINK_CLIENT_ID manquant" }), { status: 500, headers: CORS });
        }
        const redirect =
          process.env.TINK_REDIRECT_URI ??
          "https://prism-getapp-test-rc-2026efefrcderrdxzdd.lovable.app/api/tink/callback";
        // Tink Link hosted flow — Account Check (read accounts/holdings).
        // Sandbox: market=FR, test=true forces sandbox provider list.
        const url =
          `https://link.tink.com/1.0/transactions/connect-accounts/` +
          `?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirect)}` +
          `&market=FR&locale=fr_FR&test=true`;
        return new Response(JSON.stringify({ url }), { status: 200, headers: CORS });
      },
    },
  },
});

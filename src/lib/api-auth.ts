import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-make-secret, stripe-signature",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

/**
 * Verifies the Bearer token and returns { userId, userClient }.
 * userClient is a Supabase client scoped to the authenticated user (RLS applies).
 */
export async function requireUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { error: errorResponse("Non authentifié", 401) } as const;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { error: errorResponse("Session invalide", 401) } as const;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { userId: data.user.id, email: data.user.email, userClient } as const;
}

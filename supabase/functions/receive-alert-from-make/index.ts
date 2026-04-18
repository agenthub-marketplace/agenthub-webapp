// Supabase Edge Function: receive-alert-from-make
// Public webhook (secured at network level).
// Body: { title, content, isins[] (accepts ISINs OR tickers), urgency, ... }
// Fan-out: 1 alert per user holding any of the symbols.
// If no users match: fan out to ALL users (test/broadcast mode).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-make-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ISIN = 12 chars, starts with 2 letters, ends with a digit.
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      title,
      content,
      isins,
      urgency,
      impact_short_term,
      impact_long_term,
      scenario_optimiste,
      scenario_neutre,
      scenario_pessimiste,
      correlations_directes,
      correlations_indirectes,
      investor_reaction,
    } = body ?? {};

    if (!Array.isArray(isins) || isins.length === 0) {
      return new Response(JSON.stringify({ error: "isins array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-detect: split inputs into real ISINs vs tickers.
    const symbols = isins.map((s: unknown) => String(s).trim().toUpperCase()).filter(Boolean);
    const isinList = symbols.filter((s) => ISIN_RE.test(s));
    const tickerList = symbols.filter((s) => !ISIN_RE.test(s));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find users holding any of the ISINs OR tickers
    const userIdSet = new Set<string>();
    if (isinList.length > 0) {
      const { data, error } = await supabase
        .from("positions")
        .select("user_id")
        .in("isin", isinList);
      if (error) throw error;
      (data ?? []).forEach((r: any) => userIdSet.add(r.user_id));
    }
    if (tickerList.length > 0) {
      const { data, error } = await supabase
        .from("positions")
        .select("user_id")
        .in("ticker", tickerList);
      if (error) throw error;
      (data ?? []).forEach((r: any) => userIdSet.add(r.user_id));
    }

    let userIds = Array.from(userIdSet);
    let broadcast = false;

    // Test/broadcast mode: no holders → fan out to every user
    if (userIds.length === 0) {
      const { data: allUsers, error: allErr } = await supabase
        .from("profiles")
        .select("id");
      if (allErr) throw allErr;
      userIds = (allUsers ?? []).map((u: any) => u.id);
      broadcast = true;
      if (userIds.length === 0) {
        return new Response(
          JSON.stringify({ inserted: 0, message: "No users in system" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const rows = userIds.map((uid) => ({
      user_id: uid,
      title: title ?? null,
      content: content ?? null,
      isins: symbols,
      urgency: typeof urgency === "number" ? urgency : 1,
      impact_short_term: impact_short_term ?? null,
      impact_long_term: impact_long_term ?? null,
      scenario_optimiste: scenario_optimiste ?? null,
      scenario_neutre: scenario_neutre ?? null,
      scenario_pessimiste: scenario_pessimiste ?? null,
      correlations_directes: correlations_directes ?? null,
      correlations_indirectes: correlations_indirectes ?? null,
      investor_reaction: investor_reaction ?? null,
    }));

    const { error: insErr } = await supabase.from("alerts").insert(rows);
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        inserted: rows.length,
        broadcast,
        matched_isins: isinList,
        matched_tickers: tickerList,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("receive-alert-from-make error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

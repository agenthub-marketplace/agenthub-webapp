// Supabase Edge Function: receive-alert-from-make
// Public webhook (secured at network level via secret).
// Body (rich schema from Claude / Make):
// {
//   title, content, isins[] (ISIN or ticker), urgency (1-3),
//   sectors[], language ("fr"),
//   impact_short_term, impact_long_term,
//   impact_position_euros, impact_portfolio_percent,
//   scenario_optimiste / scenario_neutre / scenario_pessimiste:
//     { description, probabilite, impact_percent },
//   correlations_directes / correlations_indirectes:
//     [{ company, reason, impact_percent }],
//   investor_reaction: { sentiment, recommendation }
// }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-make-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

// Repair common UTF-8 mojibake (latin1 misread as utf8) on a string.
// e.g. "rÃ©vision" -> "révision"
function fixMojibake(s: unknown): string | null {
  if (s == null) return null;
  const str = String(s);
  if (!/Ã/.test(str)) return str;
  try {
    return new TextDecoder("utf-8").decode(
      Uint8Array.from(str, (c) => c.charCodeAt(0) & 0xff),
    );
  } catch {
    return str;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Read raw bytes and decode as UTF-8 explicitly to avoid mojibake.
    const buf = new Uint8Array(await req.arrayBuffer());
    const text = new TextDecoder("utf-8").decode(buf);
    const body = JSON.parse(text);

    const {
      title,
      content,
      isins,
      urgency,
      sectors,
      language,
      impact_short_term,
      impact_long_term,
      impact_position_euros,
      impact_portfolio_percent,
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

    const symbols = isins.map((s: unknown) => String(s).trim().toUpperCase()).filter(Boolean);
    const isinList = symbols.filter((s) => ISIN_RE.test(s));
    const tickerList = symbols.filter((s) => !ISIN_RE.test(s));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find users holding any of the ISINs OR tickers OR matching sectors.
    const userIdSet = new Set<string>();
    if (isinList.length > 0) {
      const { data, error } = await supabase
        .from("positions").select("user_id").in("isin", isinList);
      if (error) throw error;
      (data ?? []).forEach((r: any) => userIdSet.add(r.user_id));
    }
    if (tickerList.length > 0) {
      const { data, error } = await supabase
        .from("positions").select("user_id").in("ticker", tickerList);
      if (error) throw error;
      (data ?? []).forEach((r: any) => userIdSet.add(r.user_id));
    }
    if (Array.isArray(sectors) && sectors.length > 0) {
      const { data, error } = await supabase
        .from("positions").select("user_id").in("sector", sectors);
      if (error) throw error;
      (data ?? []).forEach((r: any) => userIdSet.add(r.user_id));
    }

    let userIds = Array.from(userIdSet);
    let broadcast = false;

    // Test/broadcast mode: no holders → fan out to every user
    if (userIds.length === 0) {
      const { data: allUsers, error: allErr } = await supabase
        .from("profiles").select("id");
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
      title: fixMojibake(title),
      content: fixMojibake(content),
      isins: symbols,
      sectors: Array.isArray(sectors) ? sectors : [],
      language: typeof language === "string" ? language : "fr",
      urgency: typeof urgency === "number" ? urgency : 1,
      impact_short_term: fixMojibake(impact_short_term),
      impact_long_term: fixMojibake(impact_long_term),
      impact_position_euros: typeof impact_position_euros === "number" ? impact_position_euros : null,
      impact_portfolio_percent: typeof impact_portfolio_percent === "number" ? impact_portfolio_percent : null,
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
        matched_sectors: sectors ?? [],
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

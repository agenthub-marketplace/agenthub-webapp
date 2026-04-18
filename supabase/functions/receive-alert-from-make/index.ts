// Supabase Edge Function: receive-alert-from-make
// Public webhook (no JWT). Validates x-make-secret header.
// Body: { title, content, isins[], urgency, impact_short_term, impact_long_term,
//         scenario_optimiste, scenario_neutre, scenario_pessimiste,
//         correlations_directes, correlations_indirectes, investor_reaction }
// Fan-out: 1 alert per user holding any of the ISINs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-make-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const secret = req.headers.get("x-make-secret");
    const expected = Deno.env.get("MAKE_WEBHOOK_SECRET");
    if (!expected || secret !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find all distinct user_ids holding any of the ISINs
    const { data: matching, error: matchErr } = await supabase
      .from("positions")
      .select("user_id")
      .in("isin", isins);
    if (matchErr) throw matchErr;

    const userIds = Array.from(new Set((matching ?? []).map((r: any) => r.user_id)));
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, message: "No users matched" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = userIds.map((uid) => ({
      user_id: uid,
      title: title ?? null,
      content: content ?? null,
      isins,
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

    return new Response(JSON.stringify({ inserted: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("receive-alert-from-make error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

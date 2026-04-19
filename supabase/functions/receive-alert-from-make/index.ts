// Supabase Edge Function: receive-alert-from-make
// Public webhook (secured at network level via secret).
//
// Accepts the rich Claude JSON (French) from Make.com:
// {
//   "titre": "...", "resume_fr": "...",
//   "isins": ["TICKER_OR_ISIN"], "secteurs": ["..."], "urgence": 1-3,
//   "impact_court_terme": "positif|neutre|negatif",
//   "impact_long_terme":  "positif|neutre|negatif",
//   "impact_court_terme_pct": "+5,2%", "impact_long_terme_pct": "+2,1%",
//   "scenario_optimiste|neutre|pessimiste":
//      { description, pourcentage, probabilite, base_historique },
//   "correlations_directes|indirectes":
//      [{ entreprise, ticker, raison, impact, direction }]
// }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-make-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

function fixMojibake(s: unknown): string | null {
  if (s == null) return null;
  const str = String(s);
  if (!/Ã/.test(str)) return str;
  try {
    return new TextDecoder("utf-8").decode(
      Uint8Array.from(str, (c) => c.charCodeAt(0) & 0xff),
    );
  } catch { return str; }
}

function parsePct(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace("%", "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normScenario(raw: any): any {
  if (!raw || typeof raw !== "object") return null;
  return {
    description: fixMojibake(raw.description ?? raw.desc ?? null),
    probabilite: parsePct(raw.probabilite ?? raw.probability ?? null),
    impact_percent: parsePct(raw.impact_percent ?? raw.pourcentage ?? raw.impact ?? null),
    base_historique: fixMojibake(raw.base_historique ?? raw.historical_basis ?? null),
  };
}

function normCorrelations(arr: any): any[] | null {
  if (!Array.isArray(arr)) return null;
  return arr.map((c) => ({
    company: fixMojibake(c?.company ?? c?.entreprise ?? null),
    ticker: typeof c?.ticker === "string" ? c.ticker.toUpperCase() : null,
    reason: fixMojibake(c?.reason ?? c?.raison ?? null),
    impact_percent: parsePct(c?.impact_percent ?? c?.impact ?? c?.pourcentage ?? null),
    direction: typeof c?.direction === "string" ? c.direction.toLowerCase() : null,
  }));
}

function normShortLong(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (s.startsWith("pos")) return "positif";
  if (s.startsWith("neg") || s.startsWith("nég")) return "negatif";
  if (s.startsWith("neu")) return "neutre";
  return fixMojibake(v);
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
    const buf = new Uint8Array(await req.arrayBuffer());
    const text = new TextDecoder("utf-8").decode(buf);
    let body = JSON.parse(text);

    // If Make.com sends the Claude analysis as a raw JSON string,
    // parse it server-side and merge it into the body (parsed wins).
    if (typeof body.raw_claude_json === "string" && body.raw_claude_json.trim()) {
      try {
        let raw = body.raw_claude_json.trim();
        // Strip markdown code fences if present (```json ... ```)
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        // Extract first {...} block in case of leading/trailing prose
        const first = raw.indexOf("{");
        const last = raw.lastIndexOf("}");
        if (first >= 0 && last > first) raw = raw.slice(first, last + 1);
        const parsed = JSON.parse(raw);
        body = { ...body, ...parsed };
      } catch (err) {
        console.error("Failed to parse raw_claude_json:", err);
        return new Response(
          JSON.stringify({ error: "Invalid raw_claude_json", detail: String(err) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Prefer Claude's French "titre" over the raw English "title" headline.
    const title = body.titre ?? body.title;
    const content = body.resume_fr ?? body.contenu ?? body.content;
    const resume_fr = body.resume_fr ?? body.contenu ?? body.content;
    const urgency = body.urgency ?? body.urgence;
    const sectors = body.sectors ?? body.secteurs;
    const language = body.language ?? "fr";
    const isins = body.isins;

    const impact_short_term = normShortLong(body.impact_short_term ?? body.impact_court_terme);
    const impact_long_term = normShortLong(body.impact_long_term ?? body.impact_long_terme);
    const impact_short_term_pct = parsePct(body.impact_short_term_pct ?? body.impact_court_terme_pct);
    const impact_long_term_pct = parsePct(body.impact_long_term_pct ?? body.impact_long_terme_pct);

    const scenario_optimiste = normScenario(body.scenario_optimiste);
    const scenario_neutre = normScenario(body.scenario_neutre);
    const scenario_pessimiste = normScenario(body.scenario_pessimiste);

    const correlations_directes = normCorrelations(body.correlations_directes);
    const correlations_indirectes = normCorrelations(body.correlations_indirectes);

    const impact_position_euros =
      typeof body.impact_position_euros === "number" ? body.impact_position_euros : null;
    const impact_portfolio_percent =
      typeof body.impact_portfolio_percent === "number" ? body.impact_portfolio_percent : null;
    const investor_reaction = body.investor_reaction ?? null;
    const source_url =
      typeof body.source_url === "string" && body.source_url.trim()
        ? body.source_url.trim()
        : typeof body.url === "string" && body.url.trim()
          ? body.url.trim()
          : null;

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
      resume_fr: fixMojibake(resume_fr),
      isins: symbols,
      sectors: Array.isArray(sectors) ? sectors : [],
      language: typeof language === "string" ? language : "fr",
      urgency: typeof urgency === "number" ? urgency : 1,
      impact_short_term,
      impact_long_term,
      impact_short_term_pct,
      impact_long_term_pct,
      impact_position_euros,
      impact_portfolio_percent,
      scenario_optimiste,
      scenario_neutre,
      scenario_pessimiste,
      correlations_directes,
      correlations_indirectes,
      investor_reaction,
      source_url,
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

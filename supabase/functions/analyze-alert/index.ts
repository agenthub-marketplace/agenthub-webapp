// Supabase Edge Function: analyze-alert
// JWT-protected. Enriches an alert with AI-generated scenarios + correlations
// using the Lovable AI Gateway (no API key needed by the user).
// Body: { alert_id }  → updates the alert in place if scenarios are missing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  properties: {
    impact_short_term: { type: "string" },
    impact_long_term: { type: "string" },
    scenario_optimiste: {
      type: "object",
      properties: { probabilite: { type: "number" }, description: { type: "string" } },
      required: ["probabilite", "description"],
      additionalProperties: false,
    },
    scenario_neutre: {
      type: "object",
      properties: { probabilite: { type: "number" }, description: { type: "string" } },
      required: ["probabilite", "description"],
      additionalProperties: false,
    },
    scenario_pessimiste: {
      type: "object",
      properties: { probabilite: { type: "number" }, description: { type: "string" } },
      required: ["probabilite", "description"],
      additionalProperties: false,
    },
    correlations_directes: {
      type: "array",
      items: {
        type: "object",
        properties: { ticker: { type: "string" }, impact: { type: "string" } },
        required: ["ticker", "impact"],
        additionalProperties: false,
      },
    },
    correlations_indirectes: {
      type: "array",
      description: "Secteurs économiques impactés (PAS d'entreprises). Exemples valides: 'Pétrole & Gaz', 'Aviation', 'Défense', 'Transport maritime', 'Semi-conducteurs', 'Banques européennes'. JAMAIS de noms d'entreprises comme Samsung, Boeing, Apple, etc.",
      items: {
        type: "object",
        properties: {
          secteur: { type: "string", description: "Nom du secteur économique uniquement (ex: 'Pétrole & Gaz', 'Aviation')" },
          impact: { type: "string" },
        },
        required: ["secteur", "impact"],
        additionalProperties: false,
      },
    },
    investor_reaction: {
      type: "object",
      properties: { sentiment: { type: "string" }, recommendation: { type: "string" } },
      required: ["sentiment", "recommendation"],
      additionalProperties: false,
    },
  },
  required: [
    "impact_short_term",
    "impact_long_term",
    "scenario_optimiste",
    "scenario_neutre",
    "scenario_pessimiste",
    "correlations_directes",
    "correlations_indirectes",
    "investor_reaction",
  ],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { alert_id } = await req.json();
    if (!alert_id) {
      return new Response(JSON.stringify({ error: "alert_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: alert, error: aErr } = await supabase
      .from("alerts")
      .select("*")
      .eq("id", alert_id)
      .eq("user_id", userRes.user.id)
      .maybeSingle();
    if (aErr || !alert) {
      return new Response(JSON.stringify({ error: "Alert not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu es analyste financier. Analyse cette alerte et produis: impacts, 3 scénarios (optimiste/neutre/pessimiste avec probabilités sommant à 100), corrélations directes (autres ENTREPRISES/tickers affectés — concurrents, fournisseurs, clients) et corrélations INDIRECTES qui sont uniquement des SECTEURS économiques impactés (jamais d'entreprises). Exemples de secteurs valides: 'Pétrole & Gaz', 'Aviation', 'Défense', 'Transport maritime', 'Semi-conducteurs', 'Automobile', 'Banques européennes'. Pour 'guerre en Iran' → secteurs = Pétrole & Gaz, Aviation, Défense, Transport maritime. Et une réaction investisseur. Réponds en français.",
          },
          {
            role: "user",
            content: `Titre: ${alert.title}\nContenu: ${alert.content}\nISINs: ${(alert.isins ?? []).join(", ")}\nUrgence: ${alert.urgency}/3`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "produce_analysis",
              description: "Produit l'analyse complète de l'alerte",
              parameters: SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "produce_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte. Réessaie dans un instant." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Recharge ton workspace Lovable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const argsStr = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) {
      return new Response(JSON.stringify({ error: "No tool call returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const analysis = JSON.parse(argsStr);

    const { error: updErr } = await supabase
      .from("alerts")
      .update(analysis)
      .eq("id", alert_id)
      .eq("user_id", userRes.user.id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-alert error:", e);
    return new Response(
      JSON.stringify({ error: "Une erreur interne est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

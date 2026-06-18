import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const TARGET_AGENT_NAMES = [
  "Support Triage Agent",
  "Lead Qualification Agent",
  "CRM Enrichment API Agent",
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function query(table, builder) {
  const { data, error } = await builder(supabase.from(table));

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data ?? [];
}

loadEnvFile(path.join(ROOT, ".env.local"));

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");
const staleMinutes = Number(process.env.ADVANCED_PAYMENT_STALE_MINUTES ?? 60);

if (!Number.isFinite(staleMinutes) || staleMinutes <= 0) {
  fail("ADVANCED_PAYMENT_STALE_MINUTES must be a positive number.");
}

if (!supabaseUrl) {
  fail("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
}

if (!serviceRoleKey) {
  fail("Missing SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const agents = await query("agents", (table) =>
  table.select("id,name,slug").in("name", TARGET_AGENT_NAMES)
);
const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
const agentIds = agents.map((agent) => agent.id);

if (agentIds.length === 0) {
  console.table([]);
  console.log("agenthub-advanced-clean-stale-payments-no-target-agents");
  process.exit(0);
}

const pendingPayments = await query("payments", (table) =>
  table
    .select("id,agent_id,status,rental_request_id,amount_cents,currency,updated_at")
    .in("agent_id", agentIds)
    .eq("status", "pending")
    .is("rental_request_id", null)
);
const staleCutoff = Date.now() - staleMinutes * 60 * 1000;
const stalePayments = pendingPayments.filter((payment) => {
  return new Date(payment.updated_at).getTime() < staleCutoff;
});

if (apply && stalePayments.length > 0) {
  const { error } = await supabase
    .from("payments")
    .update({ status: "cancelled" })
    .in(
      "id",
      stalePayments.map((payment) => payment.id),
    )
    .eq("status", "pending")
    .is("rental_request_id", null);

  if (error) {
    throw new Error(`payments: ${error.message}`);
  }
}

console.table(
  stalePayments.map((payment) => {
    const agent = agentsById.get(payment.agent_id);
    return {
      agent_name: agent?.name ?? "",
      agent_slug: agent?.slug ?? "",
      payment_id: payment.id,
      amount_cents: payment.amount_cents,
      currency: payment.currency,
      age_minutes: Math.round((Date.now() - new Date(payment.updated_at).getTime()) / 60000),
      action: apply ? "cancelled" : "dry_run",
    };
  }),
);

if (stalePayments.length === 0) {
  console.log("agenthub-advanced-clean-stale-payments-ok");
} else {
  console.log(`agenthub-advanced-clean-stale-payments-${apply ? "applied" : "dry-run"} count=${stalePayments.length}`);
}

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

async function upsertLedgerEvent(payment, eventType, rentalRequestId) {
  const isAccessCreated = eventType === "access_created";
  const { error } = await supabase.from("creator_revenue_ledger").upsert(
    {
      agent_id: payment.agent_id,
      agent_version_id: payment.agent_version_id,
      creator_gross_cents: payment.amount_cents,
      creator_id: payment.creator_id,
      creator_net_cents: null,
      currency: payment.currency,
      event_type: eventType,
      gross_amount_cents: payment.amount_cents,
      metadata: {
        source: "agenthub-advanced-reconcile-ledger",
      },
      payment_id: payment.id,
      platform_fee_cents: null,
      rental_request_id: rentalRequestId,
      status: isAccessCreated ? "earned" : "pending_access",
    },
    {
      onConflict: "payment_id,event_type",
    },
  );

  if (error) {
    throw new Error(`creator_revenue_ledger: ${error.message}`);
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");

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
  table
    .select("id,name,slug,creator_id,status,active_version_id")
    .in("name", TARGET_AGENT_NAMES)
);
const agentIds = agents.map((agent) => agent.id);

if (agentIds.length === 0) {
  console.table([]);
  console.log("agenthub-advanced-reconcile-ledger-no-target-agents");
  process.exit(0);
}

const payments = await query("payments", (table) =>
  table
    .select("id,agent_id,agent_version_id,rental_request_id,amount_cents,currency,status")
    .in("agent_id", agentIds)
    .eq("status", "paid")
);
const rentalIds = payments.map((payment) => payment.rental_request_id).filter(Boolean);
const rentals = rentalIds.length
  ? await query("rental_requests", (table) =>
      table.select("id,agent_id,creator_id,status").in("id", rentalIds)
    )
  : [];
const ledgerEvents = payments.length
  ? await query("creator_revenue_ledger", (table) =>
      table.select("id,payment_id,event_type,status").in("payment_id", payments.map((payment) => payment.id))
    )
  : [];

const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
const rentalsById = new Map(rentals.map((rental) => [rental.id, rental]));
const ledgerByPaymentType = new Set(
  ledgerEvents.map((event) => `${event.payment_id}:${event.event_type}`),
);
const missing = [];

for (const payment of payments) {
  const agent = agentsById.get(payment.agent_id);
  const rental = payment.rental_request_id ? rentalsById.get(payment.rental_request_id) : null;

  if (!agent || rental?.status !== "active") {
    continue;
  }

  const enrichedPayment = {
    ...payment,
    creator_id: rental.creator_id ?? agent.creator_id,
  };

  if (!ledgerByPaymentType.has(`${payment.id}:payment_paid`)) {
    missing.push({
      agent_name: agent.name,
      agent_slug: agent.slug,
      event_type: "payment_paid",
      payment_id: payment.id,
      rental_request_id: payment.rental_request_id,
      amount_cents: payment.amount_cents,
      currency: payment.currency,
      action: apply ? "inserted" : "dry_run",
      payment: enrichedPayment,
    });
  }

  if (!ledgerByPaymentType.has(`${payment.id}:access_created`)) {
    missing.push({
      agent_name: agent.name,
      agent_slug: agent.slug,
      event_type: "access_created",
      payment_id: payment.id,
      rental_request_id: payment.rental_request_id,
      amount_cents: payment.amount_cents,
      currency: payment.currency,
      action: apply ? "inserted" : "dry_run",
      payment: enrichedPayment,
    });
  }
}

if (apply) {
  for (const row of missing) {
    await upsertLedgerEvent(row.payment, row.event_type, row.rental_request_id);
  }
}

console.table(
  missing.map((row) => {
    const output = { ...row };
    delete output.payment;
    return output;
  }),
);

if (missing.length === 0) {
  console.log("agenthub-advanced-reconcile-ledger-ok");
} else {
  console.log(`agenthub-advanced-reconcile-ledger-${apply ? "applied" : "dry-run"} missing=${missing.length}`);
}

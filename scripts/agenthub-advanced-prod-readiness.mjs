import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const TARGETS = [
  { agentName: "Support Triage Agent", expectedRuntimeType: "workflow_automation" },
  { agentName: "Lead Qualification Agent", expectedRuntimeType: "workflow_automation" },
  { agentName: "CRM Enrichment API Agent", expectedRuntimeType: "creator_endpoint" },
];
const readErrors = new Set();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
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

function compactRows(rows) {
  return rows.filter(Boolean);
}

function isOlderThan(dateValue, minutes) {
  if (!dateValue) {
    return false;
  }

  return new Date(dateValue).getTime() < Date.now() - minutes * 60 * 1000;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function countBy(rows, predicate) {
  return rows.filter(predicate).length;
}

function groupBy(rows, key) {
  const grouped = new Map();

  for (const row of rows) {
    const value = row[key];

    if (!grouped.has(value)) {
      grouped.set(value, []);
    }

    grouped.get(value).push(row);
  }

  return grouped;
}

async function selectAll(supabase, table, queryBuilder) {
  const { data, error } = await queryBuilder(supabase.from(table));

  if (error) {
    readErrors.add(`${table}: ${error.message}`);
    return [];
  }

  return data ?? [];
}

function formatReport(rows) {
  return rows.map((row) => ({
    agent_name: row.agentName,
    slug: row.slug ?? "",
    runtime: row.runtimeType ?? "",
    status: row.agentStatus ?? "",
    runtime_enabled: row.runtimeEnabled,
    run_enabled: row.runtimeRunEnabled,
    allowlisted: row.creatorAllowlisted,
    asset_approved: row.expectedRuntimeType === "workflow_automation" ? row.workflowApproved : row.endpointApproved,
    security_passed: row.securityReviewPassed,
    paid_active_access: row.paidActiveAccessCount,
    successful_runs: row.successfulRunCount,
    reviews: row.verifiedReviewCount,
    earned_ledger: row.earnedLedgerCount,
    stale_runs: row.staleRunCount,
    blockers: row.blockers.join(", "),
  }));
}

loadEnvFile(path.join(ROOT, ".env.local"));

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const failOnBlockers = process.argv.includes("--fail-on-blockers");

if (!supabaseUrl) {
  fail("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
}

if (!serviceRoleKey) {
  fail("Missing SUPABASE_SERVICE_ROLE_KEY. This admin-only smoke must never run in client code.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const targetNames = TARGETS.map((target) => target.agentName);
const expectedRuntimeTypes = [...new Set(TARGETS.map((target) => target.expectedRuntimeType))];

const agents = await selectAll(supabase, "agents", (query) =>
  query
    .select("id,slug,name,status,creator_id,active_version_id,updated_at")
    .in("name", targetNames)
    .order("updated_at", { ascending: false })
);

const selectedAgents = TARGETS.map((target) => {
  const candidates = agents.filter((agent) => agent.name === target.agentName);
  return (
    candidates.find((agent) => agent.status === "approved") ??
    candidates[0] ??
    null
  );
});

const agentIds = compactRows(selectedAgents.map((agent) => agent?.id));
const versionIds = compactRows(selectedAgents.map((agent) => agent?.active_version_id));
const creatorIds = compactRows(selectedAgents.map((agent) => agent?.creator_id));

const [
  versions,
  runtimeSettings,
  runtimeAccess,
  workflows,
  endpointConfigs,
  securityReviews,
  payments,
  runs,
  workflowRuns,
  endpointRuns,
  reviews,
  ledgerEvents,
] = await Promise.all([
  versionIds.length
    ? selectAll(supabase, "agent_versions", (query) =>
        query.select("id,runtime_type,execution_mode,workspace_mode").in("id", versionIds)
      )
    : [],
  selectAll(supabase, "agent_runtime_settings", (query) =>
    query.select("runtime_type,enabled,run_enabled").in("runtime_type", expectedRuntimeTypes)
  ),
  creatorIds.length
    ? selectAll(supabase, "creator_runtime_access", (query) =>
        query.select("creator_id,runtime_type,enabled").in("creator_id", creatorIds)
      )
    : [],
  versionIds.length
    ? selectAll(supabase, "agent_version_workflows", (query) =>
        query.select("id,agent_version_id,status").in("agent_version_id", versionIds)
      )
    : [],
  versionIds.length
    ? selectAll(supabase, "agent_version_creator_endpoints", (query) =>
        query.select("id,agent_version_id,status,endpoint_id").in("agent_version_id", versionIds)
      )
    : [],
  versionIds.length
    ? selectAll(supabase, "security_reviews", (query) =>
        query.select("id,agent_version_id,runtime_type,status").in("agent_version_id", versionIds)
      )
    : [],
  agentIds.length
    ? selectAll(supabase, "payments", (query) =>
        query.select("id,agent_id,status,rental_request_id").in("agent_id", agentIds)
      )
    : [],
  agentIds.length
    ? selectAll(supabase, "agent_runs", (query) =>
        query.select("id,agent_id,status,created_at").in("agent_id", agentIds)
      )
    : [],
  agentIds.length
    ? selectAll(supabase, "agent_workflow_runs", (query) =>
        query.select("id,agent_id,status,created_at").in("agent_id", agentIds)
      )
    : [],
  agentIds.length
    ? selectAll(supabase, "agent_endpoint_runs", (query) =>
        query.select("id,agent_id,status,created_at").in("agent_id", agentIds)
      )
    : [],
  agentIds.length
    ? selectAll(supabase, "agent_reviews", (query) =>
        query.select("id,agent_id").in("agent_id", agentIds)
      )
    : [],
  agentIds.length
    ? selectAll(supabase, "creator_revenue_ledger", (query) =>
        query.select("id,agent_id,event_type,status").in("agent_id", agentIds)
      )
    : [],
]);

const rentalIds = compactRows(payments.map((payment) => payment.rental_request_id));
const rentals = rentalIds.length
  ? await selectAll(supabase, "rental_requests", (query) =>
      query.select("id,agent_id,status").in("id", rentalIds)
    )
  : [];

const endpointIds = compactRows(endpointConfigs.map((endpointConfig) => endpointConfig.endpoint_id));
const creatorEndpoints = endpointIds.length
  ? await selectAll(supabase, "creator_api_endpoints", (query) =>
      query.select("id,status").in("id", endpointIds)
    )
  : [];

const versionsById = new Map(versions.map((version) => [version.id, version]));
const runtimeSettingsByType = new Map(runtimeSettings.map((setting) => [setting.runtime_type, setting]));
const rentalsById = new Map(rentals.map((rental) => [rental.id, rental]));
const endpointStatusById = new Map(creatorEndpoints.map((endpoint) => [endpoint.id, endpoint.status]));
const paymentsByAgent = groupBy(payments, "agent_id");
const runsByAgent = groupBy(runs, "agent_id");
const workflowRunsByAgent = groupBy(workflowRuns, "agent_id");
const endpointRunsByAgent = groupBy(endpointRuns, "agent_id");
const reviewsByAgent = groupBy(reviews, "agent_id");
const ledgerByAgent = groupBy(ledgerEvents, "agent_id");

const report = TARGETS.map((target, index) => {
  const agent = selectedAgents[index];
  const version = agent?.active_version_id ? versionsById.get(agent.active_version_id) : null;
  const runtimeSetting = runtimeSettingsByType.get(target.expectedRuntimeType);
  const agentPayments = agent?.id ? paymentsByAgent.get(agent.id) ?? [] : [];
  const agentRuns = agent?.id ? runsByAgent.get(agent.id) ?? [] : [];
  const agentWorkflowRuns = agent?.id ? workflowRunsByAgent.get(agent.id) ?? [] : [];
  const agentEndpointRuns = agent?.id ? endpointRunsByAgent.get(agent.id) ?? [] : [];
  const agentReviews = agent?.id ? reviewsByAgent.get(agent.id) ?? [] : [];
  const agentLedger = agent?.id ? ledgerByAgent.get(agent.id) ?? [] : [];
  const workflowApproved = Boolean(
    version?.id &&
      workflows.some((workflow) => workflow.agent_version_id === version.id && workflow.status === "approved")
  );
  const endpointApproved = Boolean(
    version?.id &&
      endpointConfigs.some((endpointConfig) => {
        return (
          endpointConfig.agent_version_id === version.id &&
          endpointConfig.status === "approved" &&
          endpointStatusById.get(endpointConfig.endpoint_id) === "approved"
        );
      })
  );
  const securityReviewPassed = Boolean(
    version?.id &&
      securityReviews.some((review) => {
        return (
          review.agent_version_id === version.id &&
          review.runtime_type === target.expectedRuntimeType &&
          ["passed", "waived"].includes(review.status)
        );
      })
  );
  const creatorAllowlisted = Boolean(
    agent?.creator_id &&
      runtimeAccess.some((access) => {
        return (
          access.creator_id === agent.creator_id &&
          access.runtime_type === target.expectedRuntimeType &&
          access.enabled === true
        );
      })
  );
  const paidActiveAccessCount = countBy(agentPayments, (payment) => {
    const rental = payment.rental_request_id ? rentalsById.get(payment.rental_request_id) : null;
    return payment.status === "paid" && rental?.status === "active";
  });
  const paidWithoutActiveAccessCount = countBy(agentPayments, (payment) => {
    const rental = payment.rental_request_id ? rentalsById.get(payment.rental_request_id) : null;
    return payment.status === "paid" && (!rental || rental.status !== "active");
  });
  const paymentWatchCount = countBy(agentPayments, (payment) => ["pending", "paid_blocked"].includes(payment.status));
  const successfulRunCount = countBy(agentRuns, (run) => run.status === "succeeded");
  const staleRunCount =
    countBy(agentRuns, (run) => run.status === "running" && isOlderThan(run.created_at, 10)) +
    countBy(agentWorkflowRuns, (run) => ["queued", "running"].includes(run.status) && isOlderThan(run.created_at, 10)) +
    countBy(agentEndpointRuns, (run) => run.status === "running" && isOlderThan(run.created_at, 10));
  const verifiedReviewCount = agentReviews.length;
  const earnedLedgerCount = countBy(
    agentLedger,
    (event) => event.event_type === "access_created" && event.status === "earned"
  );
  const blockers = compactRows([
    ...[...readErrors].map((error) => `read_error_${error.split(":")[0]}`),
    !agent ? "agent_missing" : null,
    agent && agent.status !== "approved" ? "agent_not_approved" : null,
    agent && !agent.active_version_id ? "active_version_missing" : null,
    version?.runtime_type !== target.expectedRuntimeType ? "runtime_type_mismatch" : null,
    version && version.execution_mode !== "llm_prompt" ? "execution_mode_not_llm_prompt" : null,
    !runtimeSetting?.enabled ? "runtime_disabled" : null,
    !runtimeSetting?.run_enabled ? "runtime_run_disabled" : null,
    !creatorAllowlisted ? "creator_not_allowlisted" : null,
    target.expectedRuntimeType === "workflow_automation" && !workflowApproved ? "workflow_asset_not_approved" : null,
    target.expectedRuntimeType === "creator_endpoint" && !endpointApproved ? "creator_endpoint_not_approved" : null,
    !securityReviewPassed ? "security_review_missing" : null,
    paidActiveAccessCount === 0 ? "no_paid_active_access" : null,
    paidWithoutActiveAccessCount > 0 ? "paid_without_active_access" : null,
    paymentWatchCount > 0 ? "payment_watch_items" : null,
    successfulRunCount === 0 ? "no_successful_run" : null,
    verifiedReviewCount === 0 ? "no_verified_review" : null,
    earnedLedgerCount === 0 ? "no_earned_ledger" : null,
    staleRunCount > 0 ? "stale_running_run" : null,
  ]);

  return {
    agentName: target.agentName,
    expectedRuntimeType: target.expectedRuntimeType,
    slug: agent?.slug,
    agentId: agent?.id,
    agentVersionId: agent?.active_version_id,
    runtimeType: version?.runtime_type,
    executionMode: version?.execution_mode,
    workspaceMode: version?.workspace_mode,
    agentStatus: agent?.status,
    runtimeEnabled: Boolean(runtimeSetting?.enabled),
    runtimeRunEnabled: Boolean(runtimeSetting?.run_enabled),
    creatorAllowlisted,
    workflowApproved,
    endpointApproved,
    securityReviewPassed,
    paidActiveAccessCount,
    paidWithoutActiveAccessCount,
    paymentWatchCount,
    successfulRunCount,
    verifiedReviewCount,
    earnedLedgerCount,
    staleRunCount,
    blockers,
  };
});

console.table(formatReport(report));

const blockerCount = report.reduce((count, row) => count + row.blockers.length, 0);

if (blockerCount === 0) {
  console.log("agenthub-advanced-prod-readiness-ok");
} else {
  if (readErrors.size > 0) {
    console.log("Read errors:");

    for (const error of readErrors) {
      console.log(`- ${error}`);
    }
  }

  console.log(`agenthub-advanced-prod-readiness-blocked blockers=${blockerCount}`);

  if (failOnBlockers) {
    process.exit(1);
  }
}

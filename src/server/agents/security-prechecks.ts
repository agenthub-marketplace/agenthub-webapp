import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildAgentManifest, type AgentManifestV1, type SecurityPrecheckFinding, type SecurityPrecheckV0 } from "@/server/agents/manifest";

type PrecheckStatus = "pending" | "running" | "passed" | "warning" | "failed" | "error" | "stale";
type PrecheckTrigger = "admin_manual" | "admin_retry" | "resubmission" | "submission" | "system_refresh";

type AgentSecurityPrecheckRow = {
  admin_questions: unknown;
  completed_at: string | null;
  created_at: string;
  findings: unknown;
  id: string;
  recommended_action: string;
  risk_level_suggested: string;
  risk_score: number;
  status: PrecheckStatus;
  summary: string | null;
};

type SecurityReviewLinkRow = {
  id: string;
};

export type StoredSecurityPrecheck = {
  createdAt: string;
  id: string;
  precheck: SecurityPrecheckV0;
  riskScore: number;
  status: PrecheckStatus;
};

function statusFromPrecheck(precheck: SecurityPrecheckV0): PrecheckStatus {
  if (precheck.blockers.length > 0) {
    return "failed";
  }

  if (precheck.warnings.length > 0) {
    return "warning";
  }

  return "passed";
}

function riskScore(precheck: SecurityPrecheckV0) {
  if (precheck.riskLevel === "blocked") {
    return 95;
  }

  if (precheck.riskLevel === "high") {
    return 75;
  }

  if (precheck.riskLevel === "medium") {
    return 45;
  }

  return 15;
}

function storedRecommendation(precheck: SecurityPrecheckV0) {
  if (precheck.recommendation === "review_standard") {
    return "standard_review";
  }

  if (precheck.recommendation === "security_review_required") {
    return "require_security_review";
  }

  return precheck.recommendation;
}

function uiRecommendation(value: string): SecurityPrecheckV0["recommendation"] {
  if (value === "standard_review") {
    return "review_standard";
  }

  if (value === "require_security_review") {
    return "security_review_required";
  }

  if (value === "block_publication" || value === "request_changes") {
    return value;
  }

  return "request_changes";
}

function uiRiskLevel(value: string): SecurityPrecheckV0["riskLevel"] {
  if (value === "blocked" || value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return value === "forbidden_beta" ? "blocked" : "medium";
}

function isFinding(value: unknown): value is SecurityPrecheckFinding {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as SecurityPrecheckFinding).code === "string" &&
    typeof (value as SecurityPrecheckFinding).detail === "string" &&
    typeof (value as SecurityPrecheckFinding).suggestedAdminAction === "string" &&
    typeof (value as SecurityPrecheckFinding).title === "string" &&
    ["blocker", "pass", "warning"].includes((value as SecurityPrecheckFinding).severity)
  );
}

function readFindings(value: unknown) {
  return Array.isArray(value) ? value.filter(isFinding) : [];
}

function readQuestions(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function rowToStoredPrecheck(row: AgentSecurityPrecheckRow): StoredSecurityPrecheck {
  const findings = readFindings(row.findings);

  return {
    createdAt: row.created_at,
    id: row.id,
    precheck: {
      adminQuestions: readQuestions(row.admin_questions),
      blockers: findings.filter((finding) => finding.severity === "blocker"),
      passed: findings.filter((finding) => finding.severity === "pass"),
      recommendation: uiRecommendation(row.recommended_action),
      riskLevel: uiRiskLevel(row.risk_level_suggested),
      summary: row.summary || "Précheck sécurité enregistré.",
      warnings: findings.filter((finding) => finding.severity === "warning"),
    },
    riskScore: row.risk_score,
    status: row.status,
  };
}

export async function getLatestSecurityPrechecksByVersion(agentVersionIds: string[]) {
  const supabase = createSupabaseServiceClient();
  const latestByVersion = new Map<string, StoredSecurityPrecheck>();

  if (!supabase || agentVersionIds.length === 0) {
    return latestByVersion;
  }

  const { data } = await supabase
    .from("agent_security_prechecks")
    .select("id,agent_version_id,status,risk_score,risk_level_suggested,recommended_action,summary,findings,admin_questions,created_at,completed_at")
    .in("agent_version_id", agentVersionIds)
    .order("created_at", { ascending: false })
    .returns<(AgentSecurityPrecheckRow & { agent_version_id: string })[]>();

  for (const row of data ?? []) {
    if (!latestByVersion.has(row.agent_version_id)) {
      latestByVersion.set(row.agent_version_id, rowToStoredPrecheck(row));
    }
  }

  return latestByVersion;
}

export function applyStoredSecurityPrecheck(manifest: AgentManifestV1 | null, stored: StoredSecurityPrecheck | null | undefined): AgentManifestV1 | null {
  if (!manifest) {
    return null;
  }

  if (!stored) {
    return manifest;
  }

  return {
    ...manifest,
    securityPrecheck: stored.precheck,
    securityProfile: {
      ...manifest.securityProfile,
      precheckStatus: stored.status,
    },
  };
}

export async function generateSecurityPrecheckForAgent(input: {
  actorId: string;
  agentId: string;
  trigger: PrecheckTrigger;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { error: "missing-config", precheckId: null };
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,active_version_id,creator_id,status")
    .eq("id", input.agentId)
    .maybeSingle<{ active_version_id: string | null; creator_id: string; id: string; status: string }>();

  if (agentError || !agent?.active_version_id || !["submitted", "in_review"].includes(agent.status)) {
    return { error: "agent-not-reviewable", precheckId: null };
  }

  const { manifest, error } = await buildAgentManifest(agent.active_version_id);

  if (error || !manifest) {
    return { error: error ?? "manifest-load-failed", precheckId: null };
  }

  const precheck = manifest.securityPrecheck;
  const findings = [...precheck.blockers, ...precheck.warnings, ...precheck.passed];
  const status = statusFromPrecheck(precheck);
  const { data: securityReview } = await supabase
    .from("security_reviews")
    .select("id")
    .eq("agent_version_id", manifest.agentVersionId)
    .eq("runtime_type", manifest.runtimeType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SecurityReviewLinkRow>();
  const relatedSecurityReviewId = securityReview?.id ?? null;

  const { data, error: insertError } = await supabase
    .from("agent_security_prechecks")
    .insert({
      agent_id: manifest.agentId,
      agent_version_id: manifest.agentVersionId,
      admin_questions: precheck.adminQuestions,
      completed_at: new Date().toISOString(),
      created_by: input.actorId,
      creator_id: manifest.creatorId,
      findings,
      manifest_snapshot: manifest,
      prompt_version: "deterministic-v0",
      recommended_action: storedRecommendation(precheck),
      related_security_review_id: relatedSecurityReviewId,
      risk_level_suggested: precheck.riskLevel,
      risk_score: riskScore(precheck),
      runtime_type: manifest.runtimeType,
      security_review_required: manifest.securityProfile.securityReviewRequired,
      status,
      summary: precheck.summary,
      trigger: input.trigger,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertError || !data) {
    return { error: "precheck-insert-failed", precheckId: null };
  }

  await supabase
    .from("agent_security_prechecks")
    .update({ status: "stale" })
    .eq("agent_version_id", manifest.agentVersionId)
    .not("id", "eq", data.id)
    .not("status", "eq", "stale");

  await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    action: "security_precheck.completed",
    entity_type: "agent_security_precheck",
    entity_id: data.id,
    metadata: {
      agent_id: manifest.agentId,
      agent_version_id: manifest.agentVersionId,
      recommended_action: storedRecommendation(precheck),
      related_security_review_id: relatedSecurityReviewId,
      risk_level: precheck.riskLevel,
      runtime_type: manifest.runtimeType,
      status,
      trigger: input.trigger,
    },
  });

  return { error: null, precheckId: data.id };
}

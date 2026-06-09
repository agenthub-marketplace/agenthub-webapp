import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";

export type AgentContractQualitySeverity = "blocker" | "warning" | "info";
export type AgentContractQualityStatus = "pass" | "fail";

export type AgentContractQualityCheck = {
  id: string;
  label: string;
  detail: string;
  severity: AgentContractQualitySeverity;
  status: AgentContractQualityStatus;
};

export type AgentContractQualityInput = {
  name?: string | null;
  summary?: string | null;
  startingPriceCents?: number | null;
  riskLevel?: string | null;
  capabilities?: string[] | null;
  requiredInputs?: string[] | null;
  deliverables?: string[] | null;
  limitations?: string[] | null;
  workspaceMode?: string | null;
  setupRequirements?: unknown;
  outputPromise?: unknown;
  executionMode?: string | null;
  runtimeType?: string | null;
  dataPolicy?: unknown;
};

export type AgentContractQualityReport = {
  readyForClosedBeta: boolean;
  blockerCount: number;
  warningCount: number;
  checks: AgentContractQualityCheck[];
};

function hasUsefulText(value?: string | null) {
  return typeof value === "string" && value.trim().length >= 8;
}

function hasUsefulItems(value?: string[] | null) {
  return Array.isArray(value) && value.some((item) => hasUsefulText(item));
}

function addCheck(
  checks: AgentContractQualityCheck[],
  params: Omit<AgentContractQualityCheck, "status"> & { passes: boolean },
) {
  checks.push({
    id: params.id,
    label: params.label,
    detail: params.detail,
    severity: params.severity,
    status: params.passes ? "pass" : "fail",
  });
}

function isLlmSafe(contract: AgentContract) {
  return !contract.dataPolicy.requires_files && contract.dataPolicy.external_tools.length === 0;
}

export function evaluateAgentContractQuality(input: AgentContractQualityInput): AgentContractQualityReport {
  const checks: AgentContractQualityCheck[] = [];
  const contract = normalizeAgentContract({
    workspaceMode: input.workspaceMode,
    setupRequirements: input.setupRequirements,
    outputPromise: input.outputPromise,
    executionMode: input.executionMode,
    runtimeType: input.runtimeType,
    dataPolicy: input.dataPolicy,
  });

  addCheck(checks, {
    id: "name_present",
    label: "Nom exploitable",
    detail: "Le nom doit être clair pour la marketplace et le workspace.",
    severity: "blocker",
    passes: hasUsefulText(input.name),
  });

  addCheck(checks, {
    id: "summary_present",
    label: "Résumé clair",
    detail: "Le résumé doit expliquer rapidement ce que l’utilisateur obtient.",
    severity: "blocker",
    passes: hasUsefulText(input.summary),
  });

  addCheck(checks, {
    id: "price_positive",
    label: "Prix positif",
    detail: "Un agent beta testable doit avoir un prix strictement positif pour Stripe sandbox.",
    severity: "blocker",
    passes: typeof input.startingPriceCents === "number" && input.startingPriceCents > 0,
  });

  addCheck(checks, {
    id: "risk_allowed",
    label: "Risque compatible beta",
    detail: "Les agents forbidden_beta restent hors beta fermée.",
    severity: "blocker",
    passes: input.riskLevel !== "forbidden_beta",
  });

  addCheck(checks, {
    id: "capabilities_present",
    label: "Capacités remplies",
    detail: "Les capacités aident l’utilisateur et le prompt runner à cadrer l’agent.",
    severity: "warning",
    passes: hasUsefulItems(input.capabilities),
  });

  addCheck(checks, {
    id: "required_inputs_present",
    label: "Inputs préparés",
    detail: "Les inputs attendus doivent être compréhensibles avant l’usage.",
    severity: "warning",
    passes: hasUsefulItems(input.requiredInputs) || contract.setupRequirements.type === "none",
  });

  addCheck(checks, {
    id: "deliverables_present",
    label: "Livrables visibles",
    detail: "L’utilisateur doit comprendre le résultat attendu.",
    severity: "blocker",
    passes: hasUsefulItems(input.deliverables),
  });

  addCheck(checks, {
    id: "limitations_present",
    label: "Limites explicites",
    detail: "Les limites doivent être visibles avant validation admin.",
    severity: "blocker",
    passes: hasUsefulItems(input.limitations),
  });

  addCheck(checks, {
    id: "output_promise_summary_present",
    label: "Promesse de résultat",
    detail: "La promesse de résultat doit résumer ce que le workspace produit.",
    severity: "blocker",
    passes: hasUsefulText(contract.outputPromise.summary),
  });

  addCheck(checks, {
    id: "output_promise_examples_present",
    label: "Exemples de résultat",
    detail: "Au moins un exemple aide l’admin à valider la promesse.",
    severity: "warning",
    passes: hasUsefulItems(contract.outputPromise.examples),
  });

  addCheck(checks, {
    id: "llm_prompt_no_files",
    label: "LLM sans fichiers",
    detail: "Le runner v0 est texte uniquement et ne doit pas exiger d’upload.",
    severity: "blocker",
    passes: contract.executionMode !== "llm_prompt" || !contract.dataPolicy.requires_files,
  });

  addCheck(checks, {
    id: "llm_prompt_no_external_tools",
    label: "LLM sans outils externes",
    detail: "Le runner v0 n’appelle aucun outil externe.",
    severity: "blocker",
    passes: contract.executionMode !== "llm_prompt" || contract.dataPolicy.external_tools.length === 0,
  });

  addCheck(checks, {
    id: "document_setup_consistent",
    label: "Setup document cohérent",
    detail: "Un workspace document doit expliquer ce que l’utilisateur prépare.",
    severity: "warning",
    passes: contract.workspaceMode !== "document_required" || contract.setupRequirements.type !== "none",
  });

  addCheck(checks, {
    id: "closed_beta_execution_ready",
    label: "Exécution compatible beta fermée",
    detail: "Les 5 agents beta doivent être LLM texte sans fichier ni outil externe.",
    severity: "warning",
    passes: contract.executionMode === "llm_prompt" && isLlmSafe(contract),
  });

  const blockerCount = checks.filter((check) => check.status === "fail" && check.severity === "blocker").length;
  const warningCount = checks.filter((check) => check.status === "fail" && check.severity === "warning").length;

  return {
    readyForClosedBeta: blockerCount === 0,
    blockerCount,
    warningCount,
    checks,
  };
}

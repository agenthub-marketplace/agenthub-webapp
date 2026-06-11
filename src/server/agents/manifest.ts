import "server-only";

import {
  normalizeAgentContract,
  type AgentContract,
  type AgentRuntimeType,
  type ExecutionMode,
  type WorkspaceMode,
} from "@/lib/agent-contract";
import { evaluateAgentContractQuality, type AgentContractQualityCheck } from "@/lib/agent-contract-quality";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { normalizeWorkflowDefinition } from "@/server/workflows/runtime";

export type AgentPublicationType = "guided_assistant" | "advanced_agent";
export type AgentInfraMode = "agenthub_hosted" | "creator_hosted" | "hybrid";
export type SecurityPrecheckRiskLevel = "low" | "medium" | "high" | "blocked";
export type SecurityPrecheckRecommendation =
  | "review_standard"
  | "request_changes"
  | "security_review_required"
  | "block_publication";

export type SecurityPrecheckFinding = {
  code: string;
  detail: string;
  severity: "pass" | "warning" | "blocker";
  suggestedAdminAction: string;
  title: string;
};

export type SecurityPrecheckV0 = {
  adminQuestions: string[];
  blockers: SecurityPrecheckFinding[];
  passed: SecurityPrecheckFinding[];
  recommendation: SecurityPrecheckRecommendation;
  riskLevel: SecurityPrecheckRiskLevel;
  summary: string;
  warnings: SecurityPrecheckFinding[];
};

export type AgentManifestV1 = {
  agentId: string;
  agentVersionId: string;
  creatorId: string;
  dataPolicy: {
    creatorReceivesUserInput: boolean;
    externalTools: string[];
    requiresFiles: boolean;
    storesUserData: boolean;
  };
  executionMode: ExecutionMode;
  infraMode: AgentInfraMode;
  listing: {
    categoryLabel: string | null;
    categorySlug: string | null;
    description: string;
    name: string;
    pricingType: string;
    riskLevel: string;
    shortDescription: string;
    slug: string;
    targetUser: string | null;
  };
  manifestVersion: 1;
  outputSchema: {
    format: "markdown";
    primaryResultLabel: string;
    storeInAgentRuns: boolean;
  };
  pricingProfile: {
    currency: "eur";
    fixedPriceCents: number | null;
    payoutStatus: "not_enabled";
    pricingType: string;
  };
  qualityProfile: {
    blockerCount: number;
    checks: AgentContractQualityCheck[];
    readyForClosedBeta: boolean;
    score: number;
    warningCount: number;
  };
  publicationType: AgentPublicationType;
  runtimeRequirements: {
    requiresAssetApproval: boolean;
    requiresCreatorEndpoint: boolean;
    requiresDocumentExtraction: boolean;
    requiresOpenai: boolean;
    requiresRuntimeAllowlist: boolean;
    requiresSecurityReview: boolean;
    requiresWorkflowWorker: boolean;
  };
  runtimeSetting: {
    creatorVisible: boolean;
    enabled: boolean;
    runEnabled: boolean;
  } | null;
  runtimeType: AgentRuntimeType;
  securityProfile: {
    blockingFindings: string[];
    precheckRequired: boolean;
    precheckStatus: "not_started" | "pending" | "running" | "passed" | "warning" | "failed" | "error" | "stale";
    securityReviewRequired: boolean;
    securityReviewStatus: "not_required" | "pending" | "in_review" | "passed" | "failed" | "waived";
    warnings: string[];
  };
  securityPrecheck: SecurityPrecheckV0;
  setupSchema: {
    items: string[];
    requiredBeforeRun: boolean;
    sensitiveDataWarning: boolean;
    setupType: AgentContract["setupRequirements"]["type"];
  };
  workspaceBlocks: string[];
  workspaceMode: WorkspaceMode;
  workflow: {
    id: string;
    status: string;
    stepCount: number;
    webhookStepCount: number;
  } | null;
  creatorEndpoint: {
    configId: string;
    configStatus: string;
    endpointId: string;
    endpointStatus: string | null;
    host: string | null;
    name: string | null;
  } | null;
};

type AgentVersionManifestRow = {
  agent_id: string;
  agents:
    | {
        agent_categories: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
        creator_id: string;
        description: string;
        id: string;
        name: string;
        pricing_type: string;
        risk_level: string;
        slug: string;
        starting_price_cents: number | null;
        summary: string;
        target_user?: string | null;
      }
    | {
        agent_categories: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
        creator_id: string;
        description: string;
        id: string;
        name: string;
        pricing_type: string;
        risk_level: string;
        slug: string;
        starting_price_cents: number | null;
        summary: string;
        target_user?: string | null;
      }[]
    | null;
  capabilities: string[] | null;
  data_policy: unknown;
  deliverables: string[] | null;
  execution_mode: string | null;
  id: string;
  limitations: string[] | null;
  output_promise: unknown;
  required_inputs: string[] | null;
  runtime_type: string | null;
  setup_requirements: unknown;
  workspace_mode: string | null;
};

type RuntimeSettingManifestRow = {
  creator_visible: boolean;
  enabled: boolean;
  run_enabled: boolean;
};

type WorkflowManifestRow = {
  definition: unknown;
  id: string;
  status: string;
};

type CreatorEndpointManifestRow = {
  creator_api_endpoints:
    | {
        endpoint_url: string;
        id: string;
        name: string;
        status: string;
      }
    | {
        endpoint_url: string;
        id: string;
        name: string;
        status: string;
      }[]
    | null;
  endpoint_id: string;
  id: string;
  status: string;
};

type SecurityReviewManifestRow = {
  status: "pending" | "in_review" | "passed" | "failed" | "waived";
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function safeHost(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function publicationType(runtimeType: AgentRuntimeType): AgentPublicationType {
  return runtimeType === "workflow_automation" || runtimeType === "creator_endpoint" ? "advanced_agent" : "guided_assistant";
}

function infraMode(runtimeType: AgentRuntimeType): AgentInfraMode {
  if (runtimeType === "creator_endpoint") {
    return "creator_hosted";
  }

  if (runtimeType === "workflow_automation") {
    return "hybrid";
  }

  return "agenthub_hosted";
}

function workspaceBlocksForRuntime(runtimeType: AgentRuntimeType, contract: AgentContract) {
  const base = ["access_status", "agent_goal", "setup_checklist", "required_inputs", "primary_runner", "run_status", "result_viewer", "run_history"];
  const documentBlocks = contract.dataPolicy.requires_files || contract.workspaceMode === "document_required" || runtimeType === "document_file"
    ? ["document_upload", "extraction_status"]
    : [];
  const runtimeStatus =
    runtimeType === "workflow_automation"
      ? ["workflow_progress"]
      : runtimeType === "creator_endpoint"
        ? ["endpoint_status"]
        : [];

  return [...base.slice(0, 4), ...documentBlocks, ...base.slice(4, 6), ...runtimeStatus, ...base.slice(6), "deliverables", "limitations", "review_prompt", "support_state"];
}

function finding(input: Omit<SecurityPrecheckFinding, "severity"> & { severity?: SecurityPrecheckFinding["severity"] }) {
  return {
    severity: input.severity ?? "warning",
    ...input,
  } satisfies SecurityPrecheckFinding;
}

function hasWorkflowDecisionStep(workflowDefinition: ReturnType<typeof normalizeWorkflowDefinition>) {
  if (!workflowDefinition) {
    return false;
  }

  const decisionPattern =
    /\b(decid|class|priori|qualif|score|route|triage|cat[ée]gor|chois|select|rank|evaluate|assess|recommend|next action)\b/i;

  return workflowDefinition.steps.some((step) => step.type === "llm_step" && decisionPattern.test(step.label));
}

function buildSecurityPrecheck(input: {
  agent: {
    description: string;
    name: string;
    risk_level: string;
    summary: string;
  };
  contract: AgentContract;
  endpoint: {
    status: string;
  } | null;
  endpointConfig: CreatorEndpointManifestRow | null | undefined;
  infra: AgentInfraMode;
  limitations: string[] | null;
  requiresSecurityReview: boolean;
  runtimeSetting: RuntimeSettingManifestRow | null;
  securityReviewStatus: AgentManifestV1["securityProfile"]["securityReviewStatus"];
  type: AgentPublicationType;
  workflowDefinition: ReturnType<typeof normalizeWorkflowDefinition>;
  workflowRow: WorkflowManifestRow | null | undefined;
}) {
  const passed: SecurityPrecheckFinding[] = [];
  const warnings: SecurityPrecheckFinding[] = [];
  const blockers: SecurityPrecheckFinding[] = [];
  const adminQuestions: string[] = [];

  const addPass = (item: Omit<SecurityPrecheckFinding, "severity">) => passed.push(finding({ ...item, severity: "pass" }));
  const addWarning = (item: Omit<SecurityPrecheckFinding, "severity">) => warnings.push(finding({ ...item, severity: "warning" }));
  const addBlocker = (item: Omit<SecurityPrecheckFinding, "severity">) => blockers.push(finding({ ...item, severity: "blocker" }));

  if (!input.runtimeSetting) {
    addBlocker({
      code: "runtime_setting_missing",
      detail: "Aucun runtime setting n'a été trouvé pour ce runtime.",
      suggestedAdminAction: "Vérifier la configuration runtime avant toute publication.",
      title: "Runtime non configuré",
    });
  } else if (!input.runtimeSetting.enabled) {
    addBlocker({
      code: "runtime_disabled",
      detail: "Le runtime est désactivé au niveau plateforme.",
      suggestedAdminAction: "Activer le runtime uniquement si la beta est prête, sinon demander des changements.",
      title: "Runtime désactivé",
    });
  } else {
    addPass({
      code: "runtime_enabled",
      detail: "Le runtime existe et est activé côté plateforme.",
      suggestedAdminAction: "Continuer la review standard du runtime.",
      title: "Runtime activé",
    });
  }

  if (input.type === "advanced_agent" && !input.runtimeSetting?.run_enabled) {
    addBlocker({
      code: "runtime_run_disabled",
      detail: "Le runtime avancé existe mais l'exécution est désactivée.",
      suggestedAdminAction: "Ne pas publier tant que run_enabled n'est pas activé.",
      title: "Exécution runtime désactivée",
    });
  }

  if (input.agent.risk_level === "forbidden_beta") {
    addBlocker({
      code: "forbidden_beta",
      detail: "Le niveau de risque de cet agent est interdit pour la beta.",
      suggestedAdminAction: "Rejeter ou demander une refonte complète du périmètre.",
      title: "Risque interdit en beta",
    });
  }

  if (input.contract.runtimeType === "workflow_automation") {
    if (!input.workflowRow || !input.workflowDefinition) {
      addBlocker({
        code: "workflow_missing",
        detail: "Aucune définition workflow valide n'est attachée à cette version.",
        suggestedAdminAction: "Demander au créateur de définir 2 à 5 étapes workflow.",
        title: "Workflow manquant",
      });
    } else if (input.workflowRow.status !== "approved") {
      addBlocker({
        code: "workflow_not_approved",
        detail: `Le workflow est au statut ${input.workflowRow.status}.`,
        suggestedAdminAction: "Approuver les assets workflow ou demander des corrections.",
        title: "Workflow non approuvé",
      });
    } else {
      addPass({
        code: "workflow_approved",
        detail: "La définition workflow existe et ses assets sont approuvés.",
        suggestedAdminAction: "Vérifier le contenu des étapes avant publication.",
        title: "Workflow approuvé",
      });
    }

    if (input.workflowDefinition && !hasWorkflowDecisionStep(input.workflowDefinition)) {
      addWarning({
        code: "workflow_no_decision_step",
        detail: "Aucune étape LLM ne semble classer, prioriser, router ou décider la suite.",
        suggestedAdminAction: "Vérifier que l'agent dépasse une simple chaîne de prompts.",
        title: "Décision LLM peu explicite",
      });
    }
  }

  if (input.contract.runtimeType === "creator_endpoint") {
    if (!input.endpointConfig) {
      addBlocker({
        code: "creator_endpoint_missing",
        detail: "Aucune configuration endpoint n'est liée à cette version.",
        suggestedAdminAction: "Demander au créateur de soumettre un endpoint HTTPS.",
        title: "Endpoint creator manquant",
      });
    } else if (input.endpointConfig.status !== "approved") {
      addBlocker({
        code: "creator_endpoint_config_not_approved",
        detail: `La configuration endpoint est au statut ${input.endpointConfig.status}.`,
        suggestedAdminAction: "Approuver ou rejeter la configuration endpoint.",
        title: "Configuration endpoint non approuvée",
      });
    }

    if (!input.endpoint) {
      addBlocker({
        code: "creator_api_endpoint_missing",
        detail: "L'endpoint API référencé est introuvable.",
        suggestedAdminAction: "Demander une nouvelle URL endpoint.",
        title: "Endpoint API introuvable",
      });
    } else if (input.endpoint.status !== "approved") {
      addBlocker({
        code: "creator_api_endpoint_not_approved",
        detail: `L'endpoint API est au statut ${input.endpoint.status}.`,
        suggestedAdminAction: "Valider l'endpoint dans la console admin endpoints.",
        title: "Endpoint API non approuvé",
      });
    } else {
      addPass({
        code: "creator_api_endpoint_approved",
        detail: "L'endpoint API creator est présent et approuvé.",
        suggestedAdminAction: "Vérifier la security review et les limites de données.",
        title: "Endpoint API approuvé",
      });
    }
  }

  if (input.requiresSecurityReview && !["passed", "waived"].includes(input.securityReviewStatus)) {
    addWarning({
      code: "security_review_required",
      detail: `Security review requise. Statut actuel : ${input.securityReviewStatus}.`,
      suggestedAdminAction: "Créer ou finaliser la security review avant approbation.",
      title: "Security review requise",
    });
  } else if (input.requiresSecurityReview) {
    addPass({
      code: "security_review_cleared",
      detail: `Security review ${input.securityReviewStatus}.`,
      suggestedAdminAction: "Conserver la trace de décision avant publication.",
      title: "Security review passée ou waived",
    });
  }

  if (!input.contract.outputPromise.summary.trim()) {
    addWarning({
      code: "missing_output_promise",
      detail: "La promesse de résultat est vide.",
      suggestedAdminAction: "Demander une promesse concrète et vérifiable.",
      title: "Promesse de résultat absente",
    });
  }

  if ((input.limitations ?? []).length === 0) {
    addWarning({
      code: "missing_limitations",
      detail: "Aucune limitation n'est déclarée.",
      suggestedAdminAction: "Demander au créateur d'expliciter les limites avant publication.",
      title: "Limites absentes",
    });
  }

  const publicClaims = `${input.agent.name} ${input.agent.summary} ${input.agent.description} ${input.contract.outputPromise.summary}`.toLowerCase();
  const regulatedPattern = /\b(legal advice|medical|diagnosis|financial advice|investment|juridique|m[ée]dical|diagnostic|financier|investissement)\b/i;

  if (regulatedPattern.test(publicClaims)) {
    addWarning({
      code: "regulated_claim_possible",
      detail: "La fiche peut évoquer un usage juridique, médical ou financier.",
      suggestedAdminAction: "Vérifier que le wording reste assistif et non décisionnel.",
      title: "Usage réglementé potentiel",
    });
  }

  if (input.contract.dataPolicy.requires_files || input.contract.workspaceMode === "document_required") {
    addWarning({
      code: "document_data_review",
      detail: "L'agent demande un fichier ou un document utilisateur.",
      suggestedAdminAction: "Vérifier limites fichier, absence d'OCR et politique données.",
      title: "Données document à vérifier",
    });
  }

  if (input.infra !== "agenthub_hosted") {
    addWarning({
      code: "creator_infra_receives_input",
      detail: "Une partie de l'exécution peut transmettre du contexte utilisateur hors infra AgentHub.",
      suggestedAdminAction: "Vérifier disclosure user, HMAC, endpoint approuvé et security review.",
      title: "Infrastructure creator impliquée",
    });
  }

  if (input.contract.dataPolicy.external_tools.length > 0) {
    addWarning({
      code: "external_tools_declared",
      detail: `Outils externes déclarés : ${input.contract.dataPolicy.external_tools.join(", ")}.`,
      suggestedAdminAction: "Vérifier que ces outils sont réellement supportés et approuvés.",
      title: "Outils externes déclarés",
    });
  }

  adminQuestions.push(
    "La promesse utilisateur correspond-elle réellement au runtime disponible ?",
    "Les données demandées sont-elles strictement nécessaires ?",
  );

  if (input.type === "advanced_agent") {
    adminQuestions.push("Les assets workflow/API ont-ils été validés indépendamment de la fiche publique ?");
  }

  const riskLevel: SecurityPrecheckRiskLevel =
    blockers.length > 0
      ? "blocked"
      : warnings.some((item) =>
          ["security_review_required", "creator_infra_receives_input", "regulated_claim_possible", "document_data_review"].includes(item.code),
        )
        ? "high"
        : warnings.length > 0
          ? "medium"
          : "low";
  const recommendation: SecurityPrecheckRecommendation =
    blockers.length > 0
      ? "block_publication"
      : warnings.some((item) => item.code === "security_review_required")
        ? "security_review_required"
        : warnings.some((item) => ["missing_output_promise", "missing_limitations", "workflow_no_decision_step"].includes(item.code))
          ? "request_changes"
          : "review_standard";

  const summary =
    riskLevel === "blocked"
      ? "Blocage déterministe détecté : l'admin doit corriger ou demander des changements avant publication."
      : riskLevel === "high"
        ? "Agent publiable seulement après vérification approfondie des données, assets ou security review."
        : riskLevel === "medium"
          ? "Agent sans blocage déterministe, mais plusieurs points doivent être clarifiés en review."
          : "Agent cohérent pour une review standard.";

  return {
    adminQuestions,
    blockers,
    passed,
    recommendation,
    riskLevel,
    summary,
    warnings,
  } satisfies SecurityPrecheckV0;
}

export async function buildAgentManifest(agentVersionId: string): Promise<{ manifest: AgentManifestV1 | null; error: string | null }> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { manifest: null, error: "missing-config" };
  }

  const { data: version, error: versionError } = await supabase
    .from("agent_versions")
    .select(
      "id,agent_id,capabilities,required_inputs,deliverables,limitations,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy,agents!inner(id,creator_id,name,slug,summary,description,pricing_type,starting_price_cents,risk_level,agent_categories(name,slug))",
    )
    .eq("id", agentVersionId)
    .maybeSingle<AgentVersionManifestRow>();

  const agent = readSingle(version?.agents ?? null);

  if (versionError || !version || !agent) {
    return { manifest: null, error: "agent-version-not-found" };
  }

  const contract = normalizeAgentContract({
    dataPolicy: version.data_policy,
    executionMode: version.execution_mode,
    outputPromise: version.output_promise,
    runtimeType: version.runtime_type,
    setupRequirements: version.setup_requirements,
    workspaceMode: version.workspace_mode,
  });
  const category = readSingle(agent.agent_categories);
  const type = publicationType(contract.runtimeType);
  const infra = infraMode(contract.runtimeType);
  const qualityReport = evaluateAgentContractQuality({
    capabilities: version.capabilities,
    dataPolicy: version.data_policy,
    deliverables: version.deliverables,
    executionMode: version.execution_mode,
    limitations: version.limitations,
    name: agent.name,
    outputPromise: version.output_promise,
    requiredInputs: version.required_inputs,
    riskLevel: agent.risk_level,
    runtimeType: version.runtime_type,
    setupRequirements: version.setup_requirements,
    startingPriceCents: agent.starting_price_cents,
    summary: agent.summary,
    workspaceMode: version.workspace_mode,
  });
  const qualityScore = Math.max(0, 100 - qualityReport.blockerCount * 25 - qualityReport.warningCount * 8);
  const requiresSecurityReview =
    contract.runtimeType === "document_file" || contract.runtimeType === "workflow_automation" || contract.runtimeType === "creator_endpoint";

  const { data: runtimeSetting } = await supabase
    .from("agent_runtime_settings")
    .select("enabled,creator_visible,run_enabled")
    .eq("runtime_type", contract.runtimeType)
    .maybeSingle<RuntimeSettingManifestRow>();

  const { data: workflowRow } = await supabase
    .from("agent_version_workflows")
    .select("id,status,definition")
    .eq("agent_version_id", agentVersionId)
    .maybeSingle<WorkflowManifestRow>();
  const workflowDefinition = normalizeWorkflowDefinition(workflowRow?.definition);

  const { data: endpointConfig } = await supabase
    .from("agent_version_creator_endpoints")
    .select("id,status,endpoint_id,creator_api_endpoints(id,name,status,endpoint_url)")
    .eq("agent_version_id", agentVersionId)
    .maybeSingle<CreatorEndpointManifestRow>();
  const endpoint = readSingle(endpointConfig?.creator_api_endpoints ?? null);

  const { data: securityReview } = await supabase
    .from("security_reviews")
    .select("status")
    .eq("agent_version_id", agentVersionId)
    .eq("runtime_type", contract.runtimeType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SecurityReviewManifestRow>();
  const securityReviewStatus: AgentManifestV1["securityProfile"]["securityReviewStatus"] = requiresSecurityReview
    ? securityReview?.status ?? "pending"
    : "not_required";
  const workflowMissing = contract.runtimeType === "workflow_automation" && !workflowRow;
  const workflowNotApproved = contract.runtimeType === "workflow_automation" && Boolean(workflowRow) && workflowRow?.status !== "approved";
  const endpointConfigMissing = contract.runtimeType === "creator_endpoint" && !endpointConfig;
  const endpointConfigNotApproved =
    contract.runtimeType === "creator_endpoint" && Boolean(endpointConfig) && endpointConfig?.status !== "approved";
  const endpointMissing = contract.runtimeType === "creator_endpoint" && Boolean(endpointConfig) && !endpoint;
  const endpointNotApproved = contract.runtimeType === "creator_endpoint" && Boolean(endpoint) && endpoint?.status !== "approved";

  const blockingFindings = [
    !runtimeSetting?.enabled ? "runtime_disabled" : null,
    type === "advanced_agent" && !runtimeSetting?.run_enabled ? "runtime_run_disabled" : null,
    workflowMissing ? "workflow_missing" : null,
    workflowNotApproved ? "workflow_not_approved" : null,
    endpointConfigMissing ? "creator_endpoint_missing" : null,
    endpointConfigNotApproved ? "creator_endpoint_config_not_approved" : null,
    endpointMissing ? "creator_api_endpoint_missing" : null,
    endpointNotApproved ? "creator_api_endpoint_not_approved" : null,
    requiresSecurityReview && !["passed", "waived"].includes(securityReviewStatus) ? "security_review_required" : null,
  ].filter((item): item is string => Boolean(item));
  const securityPrecheck = buildSecurityPrecheck({
    agent,
    contract,
    endpoint,
    endpointConfig,
    infra,
    limitations: version.limitations,
    requiresSecurityReview,
    runtimeSetting: runtimeSetting ?? null,
    securityReviewStatus,
    type,
    workflowDefinition,
    workflowRow,
  });

  return {
    error: null,
    manifest: {
      agentId: agent.id,
      agentVersionId: version.id,
      creatorId: agent.creator_id,
      dataPolicy: {
        creatorReceivesUserInput: infra === "creator_hosted" || infra === "hybrid",
        externalTools: contract.dataPolicy.external_tools,
        requiresFiles: contract.dataPolicy.requires_files || contract.workspaceMode === "document_required",
        storesUserData: contract.dataPolicy.stores_user_data,
      },
      executionMode: contract.executionMode,
      infraMode: infra,
      listing: {
        categoryLabel: category?.name ?? null,
        categorySlug: category?.slug ?? null,
        description: agent.description,
        name: agent.name,
        pricingType: agent.pricing_type,
        riskLevel: agent.risk_level,
        shortDescription: agent.summary,
        slug: agent.slug,
        targetUser: agent.target_user ?? null,
      },
      manifestVersion: 1,
      outputSchema: {
        format: "markdown",
        primaryResultLabel: "Résultat généré",
        storeInAgentRuns: true,
      },
      pricingProfile: {
        currency: "eur",
        fixedPriceCents: agent.starting_price_cents,
        payoutStatus: "not_enabled",
        pricingType: agent.pricing_type,
      },
      qualityProfile: {
        blockerCount: qualityReport.blockerCount,
        checks: qualityReport.checks,
        readyForClosedBeta: qualityReport.readyForClosedBeta,
        score: qualityScore,
        warningCount: qualityReport.warningCount,
      },
      publicationType: type,
      runtimeRequirements: {
        requiresAssetApproval: contract.runtimeType === "workflow_automation" || contract.runtimeType === "creator_endpoint",
        requiresCreatorEndpoint: contract.runtimeType === "creator_endpoint",
        requiresDocumentExtraction: contract.runtimeType === "document_file" || contract.dataPolicy.requires_files || contract.workspaceMode === "document_required",
        requiresOpenai: contract.executionMode === "llm_prompt" || contract.runtimeType === "workflow_automation",
        requiresRuntimeAllowlist: type === "advanced_agent",
        requiresSecurityReview,
        requiresWorkflowWorker: contract.runtimeType === "workflow_automation",
      },
      runtimeSetting: runtimeSetting
        ? {
            creatorVisible: runtimeSetting.creator_visible,
            enabled: runtimeSetting.enabled,
            runEnabled: runtimeSetting.run_enabled,
          }
        : null,
      runtimeType: contract.runtimeType,
      securityProfile: {
        blockingFindings,
        precheckRequired: true,
        precheckStatus: "not_started",
        securityReviewRequired: requiresSecurityReview,
        securityReviewStatus,
        warnings: [],
      },
      securityPrecheck,
      setupSchema: {
        items: contract.setupRequirements.items,
        requiredBeforeRun: contract.setupRequirements.type !== "none",
        sensitiveDataWarning: infra !== "agenthub_hosted" || contract.dataPolicy.requires_files,
        setupType: contract.setupRequirements.type,
      },
      workspaceBlocks: workspaceBlocksForRuntime(contract.runtimeType, contract),
      workspaceMode: contract.workspaceMode,
      workflow:
        workflowRow && workflowDefinition
          ? {
              id: workflowRow.id,
              status: workflowRow.status,
              stepCount: workflowDefinition.steps.length,
              webhookStepCount: workflowDefinition.steps.filter((step) => step.type === "webhook_step").length,
            }
          : null,
      creatorEndpoint: endpointConfig
        ? {
            configId: endpointConfig.id,
            configStatus: endpointConfig.status,
            endpointId: endpointConfig.endpoint_id,
            endpointStatus: endpoint?.status ?? null,
            host: safeHost(endpoint?.endpoint_url),
            name: endpoint?.name ?? null,
          }
        : null,
    },
  };
}

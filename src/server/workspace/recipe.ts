import "server-only";

import type { WorkspaceManifestV1 } from "@/server/agents/workspace-manifest";
import type { AgentRunSummary } from "@/server/llm/runs";

export type WorkspaceRecipeRuntimePanel = "assistant" | "document" | "endpoint" | "workflow";
export type WorkspaceRecipeBlockStatus = "attention" | "disabled" | "hidden" | "ready";
export type WorkspaceRecipeLocale = "en" | "fr";
export type WorkspaceRecipeBlockId =
  | "access_status"
  | "agent_goal"
  | "document_upload"
  | "endpoint_status"
  | "extraction_status"
  | "limitations"
  | "primary_runner"
  | "result_viewer"
  | "review_prompt"
  | "run_history"
  | "run_status"
  | "setup_checklist"
  | "trust_boundary"
  | "workflow_progress";

export type WorkspaceRecipeBlock = {
  detail: string | null;
  id: WorkspaceRecipeBlockId;
  label: string;
  required: boolean;
  status: WorkspaceRecipeBlockStatus;
  tab: "details" | "overview" | "review" | "setup" | "use";
};

export type WorkspaceRecipeV1 = {
  blocks: WorkspaceRecipeBlock[];
  disabledReason: string | null;
  historyCount: number;
  limits: {
    maxFileBytes: number;
    maxInputChars: number;
  };
  primaryActionLabel: string;
  runtimePanel: WorkspaceRecipeRuntimePanel;
  setupChecklist: string[];
  trustWarnings: string[];
  version: 1;
};

type WorkspaceRecipeInput = {
  documentInputMode: boolean;
  enabled: boolean;
  history: AgentRunSummary[];
  locale: WorkspaceRecipeLocale;
  limits: {
    maxFileBytes: number;
    maxInputChars: number;
  };
  runner: {
    disabledMessage: string | null;
    kind: "assistant" | "creator_endpoint" | "document" | "workflow";
  };
  workspaceManifest: WorkspaceManifestV1;
};

function runtimePanel(kind: WorkspaceRecipeInput["runner"]["kind"]): WorkspaceRecipeRuntimePanel {
  return kind === "creator_endpoint" ? "endpoint" : kind;
}

function block(input: WorkspaceRecipeBlock): WorkspaceRecipeBlock {
  return input;
}

function formatBytes(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} KB`;
  }

  return `${value} bytes`;
}

function recipeLabels(locale: WorkspaceRecipeLocale) {
  if (locale === "en") {
    return {
      accessState: "Access state",
      creatorEndpointState: "Creator endpoint state",
      documentUpload: "Document upload",
      documentUploadDetail: "Max file size: {size}",
      executionState: "Execution state",
      extractionDetail: "Server-side text extraction",
      extractionState: "Extraction state",
      limitations: "Limitations",
      resultViewer: "Result viewer",
      verifiedReview: "Verified review",
      workflowDetail: "queued/running/succeeded/failed",
      workflowProgress: "Workflow progress",
    };
  }

  return {
    accessState: "État de l’accès",
    creatorEndpointState: "État endpoint créateur",
    documentUpload: "Ajout du document",
    documentUploadDetail: "Taille max : {size}",
    executionState: "État d’exécution",
    extractionDetail: "Extraction texte côté serveur",
    extractionState: "État extraction",
    limitations: "Limites",
    resultViewer: "Résultat",
    verifiedReview: "Avis vérifié",
    workflowDetail: "queued/running/succeeded/failed",
    workflowProgress: "Progression workflow",
  };
}

export function buildWorkspaceRecipe(input: WorkspaceRecipeInput): WorkspaceRecipeV1 {
  const labels = recipeLabels(input.locale);
  const panel = runtimePanel(input.runner.kind);
  const hasSetup = input.workspaceManifest.setup.requiredInputs.length > 0;
  const hasHistory = input.history.length > 0;
  const runnerStatus: WorkspaceRecipeBlockStatus = input.enabled ? "ready" : "disabled";
  const blocks: WorkspaceRecipeBlock[] = [
    block({
      detail: null,
      id: "access_status",
      label: labels.accessState,
      required: true,
      status: "ready",
      tab: "overview",
    }),
    block({
      detail: input.workspaceManifest.runner.description,
      id: "agent_goal",
      label: input.workspaceManifest.runner.title,
      required: true,
      status: "ready",
      tab: "overview",
    }),
    block({
      detail: hasSetup ? input.workspaceManifest.setup.requiredInputs.join(" · ") : null,
      id: "setup_checklist",
      label: input.workspaceManifest.setup.title,
      required: hasSetup,
      status: hasSetup ? "attention" : "ready",
      tab: "setup",
    }),
    block({
      detail: input.runner.disabledMessage,
      id: "primary_runner",
      label: input.workspaceManifest.runner.primaryActionLabel,
      required: true,
      status: runnerStatus,
      tab: "use",
    }),
    block({
      detail: input.runner.disabledMessage,
      id: "run_status",
      label: labels.executionState,
      required: true,
      status: runnerStatus,
      tab: "use",
    }),
    block({
      detail: hasHistory ? null : input.workspaceManifest.history.emptyText,
      id: "run_history",
      label: input.workspaceManifest.history.title,
      required: false,
      status: hasHistory ? "ready" : "attention",
      tab: "use",
    }),
    block({
      detail: null,
      id: "result_viewer",
      label: labels.resultViewer,
      required: false,
      status: hasHistory ? "ready" : "hidden",
      tab: "use",
    }),
    block({
      detail: input.workspaceManifest.trust.dataDisclosure,
      id: "trust_boundary",
      label: input.workspaceManifest.trust.title,
      required: true,
      status: input.workspaceManifest.trust.warnings.length > 0 ? "attention" : "ready",
      tab: "details",
    }),
    block({
      detail: null,
      id: "limitations",
      label: labels.limitations,
      required: true,
      status: "ready",
      tab: "details",
    }),
    block({
      detail: null,
      id: "review_prompt",
      label: labels.verifiedReview,
      required: false,
      status: "ready",
      tab: "review",
    }),
  ];

  if (panel === "document") {
    blocks.splice(
      3,
      0,
      block({
        detail: labels.documentUploadDetail.replace("{size}", formatBytes(input.limits.maxFileBytes)),
        id: "document_upload",
        label: labels.documentUpload,
        required: true,
        status: input.enabled ? "ready" : "disabled",
        tab: "setup",
      }),
      block({
        detail: labels.extractionDetail,
        id: "extraction_status",
        label: labels.extractionState,
        required: true,
        status: input.enabled ? "ready" : "disabled",
        tab: "setup",
      }),
    );
  }

  if (panel === "workflow") {
    blocks.splice(
      5,
      0,
      block({
        detail: labels.workflowDetail,
        id: "workflow_progress",
        label: labels.workflowProgress,
        required: true,
        status: input.enabled ? "ready" : "disabled",
        tab: "use",
      }),
    );
  }

  if (panel === "endpoint") {
    blocks.splice(
      5,
      0,
      block({
        detail: input.workspaceManifest.trust.creatorInfraDisclosure,
        id: "endpoint_status",
        label: labels.creatorEndpointState,
        required: true,
        status: input.enabled ? "ready" : "disabled",
        tab: "use",
      }),
    );
  }

  return {
    blocks,
    disabledReason: input.enabled ? null : input.runner.disabledMessage,
    historyCount: input.history.length,
    limits: input.limits,
    primaryActionLabel: input.workspaceManifest.runner.primaryActionLabel,
    runtimePanel: panel,
    setupChecklist: input.workspaceManifest.setup.requiredInputs,
    trustWarnings: input.workspaceManifest.trust.warnings,
    version: 1,
  };
}

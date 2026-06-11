import "server-only";

import type { AgentContract } from "@/lib/agent-contract";
import { serverEnv } from "@/lib/env.server";
import { buildWorkspaceManifest, type WorkspaceManifestV1 } from "@/server/agents/workspace-manifest";
import { isDocumentRuntimeRunEnabled } from "@/server/documents/runtime";
import { isCreatorEndpointRuntimeRunEnabled } from "@/server/endpoints/runtime";
import type { AgentRunSummary } from "@/server/llm/runs";
import { buildWorkspaceRecipe, type WorkspaceRecipeV1 } from "@/server/workspace/recipe";
import { isWorkflowRuntimeRunEnabled } from "@/server/workflows/runtime";

type WorkspaceRuntimeLocale = "en" | "fr";
type WorkspaceRunnerKind = "assistant" | "document" | "workflow" | "creator_endpoint";

type WorkspaceRuntimeAgent = {
  contract: AgentContract;
  status?: string | null;
  workspaceActions?: string[] | null;
  workspaceActionsEn?: string[] | null;
};

type WorkspaceRuntimeRental = {
  agent: WorkspaceRuntimeAgent | null;
  id: string;
};

export type WorkspaceRuntimeContractV1 = {
  actions: string[];
  documentInputMode: boolean;
  enabled: boolean;
  history: AgentRunSummary[];
  limits: {
    maxFileBytes: number;
    maxInputChars: number;
  };
  runner: {
    disabledMessage: string | null;
    kind: WorkspaceRunnerKind;
  };
  version: 1;
  workspaceRecipe: WorkspaceRecipeV1;
  workspaceManifest: WorkspaceManifestV1;
};

type BuildWorkspaceRuntimeContractInput = {
  actions: string[];
  agentRuns: AgentRunSummary[];
  locale: WorkspaceRuntimeLocale;
  rental: WorkspaceRuntimeRental;
};

function runnerKind(contract: AgentContract, documentInputMode: boolean): WorkspaceRunnerKind {
  if (contract.runtimeType === "creator_endpoint") {
    return "creator_endpoint";
  }

  if (contract.runtimeType === "workflow_automation") {
    return "workflow";
  }

  if (documentInputMode) {
    return "document";
  }

  return "assistant";
}

function disabledCopy(locale: WorkspaceRuntimeLocale) {
  if (locale === "en") {
    return {
      agentNotApproved: "This agent is not currently approved. Execution is closed while AgentHub reviews it.",
      assistantConfig: "This access is not configured as an executable text assistant.",
      assistantDocument: "This agent expects a document: use the document block to run the analysis.",
      documentRuntime: "The document_file capability is disabled in runtime settings.",
      documentServer: "Document analysis is disabled for this beta.",
      endpointRuntime: "The creator endpoint or runtime is not approved/enabled yet.",
      endpointSecret: "The API agent is unavailable: missing server signing secret.",
      endpointServer: "Creator API agents are disabled server-side for this beta.",
      llmKey: "AI generation is unavailable: missing server OpenAI key.",
      llmServer: "AI generation is disabled in the server configuration for this beta.",
      workflowRuntime: "Workflow runtime settings are off or this workflow is not ready yet.",
      workflowServer: "Workflow runtime is disabled server-side for this beta.",
    };
  }

  return {
    agentNotApproved: "Cet agent n’est pas approuvé actuellement. L’exécution est fermée pendant la vérification AgentHub.",
    assistantConfig: "Cet accès n’est pas configuré comme assistant texte exécutable.",
    assistantDocument: "Cet agent attend un document : utilisez le bloc document pour lancer l’analyse.",
    documentRuntime: "La capacité document_file est désactivée côté runtime settings.",
    documentServer: "L’analyse document est désactivée dans cette beta.",
    endpointRuntime: "L’endpoint créateur ou son runtime n’est pas encore approuvé/activé.",
    endpointSecret: "L’agent API est indisponible : secret de signature serveur manquant.",
    endpointServer: "Les agents API créateur sont désactivés côté serveur pour cette beta.",
    llmKey: "La génération IA est indisponible : clé OpenAI serveur manquante.",
    llmServer: "La génération IA est désactivée dans la configuration serveur de cette beta.",
    workflowRuntime: "Le runtime workflow n’est pas activé dans les settings ou le workflow n’est pas encore prêt.",
    workflowServer: "Le runtime workflow est désactivé côté serveur pour cette beta.",
  };
}

function disabledMessage(input: {
  contract: AgentContract;
  documentInputMode: boolean;
  documentRuntimeRunEnabled: boolean;
  locale: WorkspaceRuntimeLocale;
  rental: WorkspaceRuntimeRental;
  runner: WorkspaceRunnerKind;
}) {
  const text = disabledCopy(input.locale);

  if (input.rental.agent?.status !== "approved") {
    return text.agentNotApproved;
  }

  if (input.runner === "assistant") {
    if (!serverEnv.llmRunsEnabled) {
      return text.llmServer;
    }

    if (!serverEnv.openaiApiKey) {
      return text.llmKey;
    }

    if (input.contract.runtimeType !== "llm_prompt" || input.contract.executionMode !== "llm_prompt") {
      return text.assistantConfig;
    }

    if (input.documentInputMode) {
      return text.assistantDocument;
    }
  }

  if (input.runner === "document") {
    if (!serverEnv.documentRunsEnabled) {
      return text.documentServer;
    }

    if (!serverEnv.openaiApiKey) {
      return text.llmKey;
    }

    if (!input.documentRuntimeRunEnabled) {
      return text.documentRuntime;
    }
  }

  if (input.runner === "workflow") {
    if (!serverEnv.workflowRunsEnabled) {
      return text.workflowServer;
    }

    return text.workflowRuntime;
  }

  if (input.runner === "creator_endpoint") {
    if (!serverEnv.creatorEndpointRunsEnabled) {
      return text.endpointServer;
    }

    if (!serverEnv.creatorEndpointSigningSecret) {
      return text.endpointSecret;
    }

    return text.endpointRuntime;
  }

  return null;
}

export async function buildWorkspaceRuntimeContract(
  input: BuildWorkspaceRuntimeContractInput,
): Promise<WorkspaceRuntimeContractV1> {
  const contract = input.rental.agent?.contract;

  if (!contract) {
    throw new Error("workspace-runtime-contract-missing-agent-contract");
  }

  const documentInputMode =
    contract.runtimeType === "document_file" ||
    (contract.runtimeType === "llm_prompt" && (contract.dataPolicy.requires_files || contract.workspaceMode === "document_required"));
  const runner = runnerKind(contract, documentInputMode);
  const workspaceManifest = buildWorkspaceManifest({
    actions: input.actions,
    agent: input.rental.agent,
    contract,
    documentInputMode,
    locale: input.locale,
  });
  const [documentRuntimeRunEnabled, workflowRuntimeRunEnabled, creatorEndpointRuntimeRunEnabled] = await Promise.all([
    documentInputMode ? isDocumentRuntimeRunEnabled() : Promise.resolve(false),
    contract.runtimeType === "workflow_automation" ? isWorkflowRuntimeRunEnabled() : Promise.resolve(false),
    contract.runtimeType === "creator_endpoint" ? isCreatorEndpointRuntimeRunEnabled() : Promise.resolve(false),
  ]);
  const agentApproved = input.rental.agent?.status === "approved";
  const llmRunnerEnabled =
    serverEnv.llmRunsEnabled &&
    Boolean(serverEnv.openaiApiKey) &&
    contract.runtimeType === "llm_prompt" &&
    contract.executionMode === "llm_prompt" &&
    !documentInputMode &&
    contract.dataPolicy.external_tools.length === 0 &&
    agentApproved;
  const documentRunnerEnabled =
    serverEnv.documentRunsEnabled &&
    Boolean(serverEnv.openaiApiKey) &&
    documentRuntimeRunEnabled &&
    documentInputMode &&
    (contract.runtimeType === "document_file" || contract.runtimeType === "llm_prompt") &&
    agentApproved;
  const workflowRunnerEnabled =
    serverEnv.workflowRunsEnabled &&
    workflowRuntimeRunEnabled &&
    contract.runtimeType === "workflow_automation" &&
    contract.executionMode === "llm_prompt" &&
    agentApproved;
  const creatorEndpointRunnerEnabled =
    serverEnv.creatorEndpointRunsEnabled &&
    Boolean(serverEnv.creatorEndpointSigningSecret) &&
    creatorEndpointRuntimeRunEnabled &&
    contract.runtimeType === "creator_endpoint" &&
    contract.executionMode === "llm_prompt" &&
    agentApproved;
  const enabled =
    runner === "creator_endpoint"
      ? creatorEndpointRunnerEnabled
      : runner === "workflow"
        ? workflowRunnerEnabled
        : runner === "document"
          ? documentRunnerEnabled
          : llmRunnerEnabled;
  const limits = {
    maxFileBytes: serverEnv.documentMaxFileBytes,
    maxInputChars: serverEnv.llmRunMaxInputChars,
  };
  const disabledReason = enabled
    ? null
    : disabledMessage({
        contract,
        documentInputMode,
        documentRuntimeRunEnabled,
        locale: input.locale,
        rental: input.rental,
        runner,
      });
  const runnerContract = {
    disabledMessage: disabledReason,
    kind: runner,
  };

  return {
    actions: input.actions,
    documentInputMode,
    enabled,
    history: input.agentRuns,
    limits,
    runner: runnerContract,
    version: 1,
    workspaceRecipe: buildWorkspaceRecipe({
      documentInputMode,
      enabled,
      history: input.agentRuns,
      limits,
      runner: runnerContract,
      workspaceManifest,
    }),
    workspaceManifest,
  };
}

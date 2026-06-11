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
      assistantConfig: "This access is not configured as a guided AI assistant. Open the agent listing or contact AgentHub if this looks wrong.",
      assistantDocument: "This agent expects a document. Use the document block to upload a PDF/DOCX, then run the analysis.",
      documentRuntime: "Document execution is waiting for AgentHub runtime approval. The private file workspace stays closed until that beta gate is enabled.",
      documentServer: "Document analysis is disabled in this environment. You can still review the setup, but uploads stay closed for now.",
      endpointRuntime:
        "This API agent is waiting for endpoint approval, security review, or runtime activation. AgentHub keeps the workspace closed until the creator infrastructure is trusted.",
      endpointSecret: "This API agent is missing the server signing secret. AgentHub cannot call creator infrastructure without signed requests.",
      endpointServer: "Creator API agents are disabled in this environment. The endpoint is not called and no user input is sent to creator infrastructure.",
      llmKey: "AI generation is unavailable because the server OpenAI key is missing. The workspace is readable, but generation stays closed.",
      llmServer: "AI generation is disabled in this environment. The actions remain setup guidance until AgentHub enables runs.",
      workflowRuntime:
        "This workflow is waiting for runtime activation, asset approval, or security review. AgentHub blocks execution until every workflow gate is ready.",
      workflowServer: "Workflow execution is disabled in this environment. You can inspect the agent setup, but the worker will not run yet.",
    };
  }

  return {
    agentNotApproved: "Cet agent n’est pas approuvé actuellement. L’exécution est fermée pendant la vérification AgentHub.",
    assistantConfig: "Cet accès n’est pas configuré comme assistant IA guidé. Ouvrez la fiche agent ou contactez AgentHub si cet état semble incohérent.",
    assistantDocument: "Cet agent attend un document. Utilisez le bloc document pour ajouter un PDF/DOCX, puis lancer l’analyse.",
    documentRuntime: "L’exécution document attend l’activation runtime AgentHub. Le workspace fichier privé reste fermé tant que ce gate beta n’est pas validé.",
    documentServer: "L’analyse document est désactivée dans cet environnement. Vous pouvez lire la mise en place, mais l’upload reste fermé pour le moment.",
    endpointRuntime:
      "Cet agent API attend l’approbation endpoint, la security review ou l’activation runtime. AgentHub garde le workspace fermé tant que l’infra creator n’est pas validée.",
    endpointSecret: "Cet agent API n’a pas de secret de signature serveur. AgentHub ne peut pas appeler l’infra creator sans requêtes signées.",
    endpointServer: "Les agents API creator sont désactivés dans cet environnement. L’endpoint n’est pas appelé et aucun input user n’est transmis au creator.",
    llmKey: "La génération IA est indisponible car la clé OpenAI serveur manque. Le workspace reste lisible, mais la génération est fermée.",
    llmServer: "La génération IA est désactivée dans cet environnement. Les actions restent des repères de mise en place jusqu’à activation des runs.",
    workflowRuntime:
      "Ce workflow attend l’activation runtime, l’approbation des assets ou la security review. AgentHub bloque l’exécution tant que tous les gates workflow ne sont pas prêts.",
    workflowServer: "L’exécution workflow est désactivée dans cet environnement. Vous pouvez inspecter la mise en place, mais le worker ne tournera pas encore.",
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
      locale: input.locale,
      limits,
      runner: runnerContract,
      workspaceManifest,
    }),
    workspaceManifest,
  };
}

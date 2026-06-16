import "server-only";

import type { AgentContract, AgentRuntimeType } from "@/lib/agent-contract";

export type AgentWorkspaceBlueprintField = {
  example: string;
  helper: string;
  key: string;
  label: string;
  required: boolean;
};

export type AgentWorkspaceBlueprintSection = {
  expectedContent: string;
  key: string;
  label: string;
};

export type AgentWorkspaceBlueprintV1 = {
  inputSchema: {
    fields: AgentWorkspaceBlueprintField[];
  };
  outputSchema: {
    sections: AgentWorkspaceBlueprintSection[];
  };
  runChecklist: string[];
  successCriteria: string[];
  supportHints: string[];
  trustBoundary: {
    dataSentToAgentHub: string[];
    dataSentToCreatorInfra: string[];
    userWarnings: string[];
  };
  version: 1;
};

type WorkspaceBlueprintLocale = "en" | "fr";

type WorkspaceBlueprintInput = {
  actions?: string[];
  agent: {
    capabilities?: string[] | null;
    deliverables?: string[] | null;
    limitations?: string[] | null;
    requiredInputsList?: string[] | null;
  } | null;
  contract: AgentContract;
  documentInputMode: boolean;
  locale?: WorkspaceBlueprintLocale;
};

function compactKey(value: string, fallback: string) {
  const key = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return key || fallback;
}

function uniqueItems(items: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item?.replace(/\s+/g, " ").trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function runtimeFallbackInputs(runtimeType: AgentRuntimeType, documentInputMode: boolean, locale: WorkspaceBlueprintLocale) {
  if (locale === "en") {
    if (runtimeType === "creator_endpoint") {
      return ["Business context for the creator API", "Expected enrichment goal"];
    }

    if (runtimeType === "workflow_automation") {
      return ["Context to process", "Decision criteria to prioritize"];
    }

    if (runtimeType === "document_file" || documentInputMode) {
      return ["One PDF or DOCX with selectable text", "Question or analysis goal"];
    }

    return ["Context to process", "Expected response format"];
  }

  if (runtimeType === "creator_endpoint") {
    return ["Contexte métier pour l’API créateur", "Objectif d’enrichissement attendu"];
  }

  if (runtimeType === "workflow_automation") {
    return ["Contexte à traiter", "Critères de décision à prioriser"];
  }

  if (runtimeType === "document_file" || documentInputMode) {
    return ["Un PDF ou DOCX avec texte sélectionnable", "Question ou objectif d’analyse"];
  }

  return ["Contexte à traiter", "Format de réponse attendu"];
}

function fieldHelper(index: number, runtimeType: AgentRuntimeType, locale: WorkspaceBlueprintLocale) {
  if (locale === "en") {
    if (runtimeType === "creator_endpoint") {
      return index === 0
        ? "This may be sent to approved creator infrastructure through AgentHub servers."
        : "Keep it concise so the API output can be checked.";
    }

    if (runtimeType === "workflow_automation") {
      return index === 0
        ? "Give enough context for each workflow step to make its decision."
        : "Use business criteria the workflow can apply visibly.";
    }

    return "Provide only the context needed for this agent promise.";
  }

  if (runtimeType === "creator_endpoint") {
    return index === 0
      ? "Cet élément peut être transmis à l’infrastructure créateur approuvée via les serveurs AgentHub."
      : "Restez concis pour pouvoir vérifier la sortie API.";
  }

  if (runtimeType === "workflow_automation") {
    return index === 0
      ? "Donnez assez de contexte pour que chaque étape workflow puisse décider."
      : "Utilisez des critères métier que le workflow peut appliquer clairement.";
  }

  return "Fournissez uniquement le contexte nécessaire à la promesse de cet agent.";
}

function fieldExample(label: string, runtimeType: AgentRuntimeType, locale: WorkspaceBlueprintLocale) {
  if (locale === "en") {
    if (runtimeType === "creator_endpoint") {
      return `Example: ${label} with no secrets or private credentials.`;
    }

    if (runtimeType === "workflow_automation") {
      return `Example: ${label} written as short business context.`;
    }

    return `Example: ${label} in a few lines.`;
  }

  if (runtimeType === "creator_endpoint") {
    return `Exemple : ${label} sans secret ni identifiant privé.`;
  }

  if (runtimeType === "workflow_automation") {
    return `Exemple : ${label} rédigé comme un contexte métier court.`;
  }

  return `Exemple : ${label} en quelques lignes.`;
}

function buildInputFields(input: WorkspaceBlueprintInput, locale: WorkspaceBlueprintLocale): AgentWorkspaceBlueprintField[] {
  const requiredInputs = uniqueItems([
    ...(input.agent?.requiredInputsList ?? []),
    ...input.contract.setupRequirements.items,
  ]);
  const labels = requiredInputs.length > 0
    ? requiredInputs
    : runtimeFallbackInputs(input.contract.runtimeType, input.documentInputMode, locale);

  return labels.slice(0, 6).map((label, index) => ({
    example: fieldExample(label, input.contract.runtimeType, locale),
    helper: fieldHelper(index, input.contract.runtimeType, locale),
    key: compactKey(label, `input_${index + 1}`),
    label,
    required: index < Math.max(1, requiredInputs.length),
  }));
}

function buildOutputSections(input: WorkspaceBlueprintInput, locale: WorkspaceBlueprintLocale): AgentWorkspaceBlueprintSection[] {
  const deliverables = uniqueItems(input.agent?.deliverables ?? []);
  const examples = uniqueItems(input.contract.outputPromise.examples);
  const sections = deliverables.length > 0
    ? deliverables
    : uniqueItems([
        input.contract.outputPromise.summary,
        ...examples,
        locale === "en" ? "Actionable final answer" : "Réponse finale actionnable",
      ]);

  return sections.slice(0, 6).map((label, index) => ({
    expectedContent:
      locale === "en"
        ? `The result should contain a clear ${label.toLowerCase()} section.`
        : `Le résultat doit contenir une section claire : ${label}.`,
    key: compactKey(label, `output_${index + 1}`),
    label,
  }));
}

function buildRunChecklist(input: WorkspaceBlueprintInput, locale: WorkspaceBlueprintLocale) {
  const runtime = input.contract.runtimeType;
  const base = locale === "en"
    ? ["Confirm the access is active.", "Prepare the required inputs before launching."]
    : ["Confirmer que l’accès est actif.", "Préparer les inputs requis avant lancement."];
  const runtimeItem =
    locale === "en"
      ? runtime === "creator_endpoint"
        ? "Confirm that the context can be sent to approved creator infrastructure."
        : runtime === "workflow_automation"
          ? "Check that the workflow decision criteria are explicit."
          : runtime === "document_file" || input.documentInputMode
            ? "Use one PDF/DOCX with selectable text."
            : "Keep the request focused on the published promise."
      : runtime === "creator_endpoint"
        ? "Confirmer que le contexte peut être envoyé à l’infrastructure créateur approuvée."
        : runtime === "workflow_automation"
          ? "Vérifier que les critères de décision du workflow sont explicites."
          : runtime === "document_file" || input.documentInputMode
            ? "Utiliser un seul PDF/DOCX avec texte sélectionnable."
            : "Garder la demande centrée sur la promesse publiée.";
  const actions = input.actions?.slice(0, 2).map((action) =>
    locale === "en" ? `Use action: ${action}.` : `Utiliser l’action : ${action}.`,
  ) ?? [];

  return uniqueItems([...base, runtimeItem, ...actions]).slice(0, 6);
}

function buildSuccessCriteria(input: WorkspaceBlueprintInput, locale: WorkspaceBlueprintLocale) {
  const promise = input.contract.outputPromise.summary.trim();
  const runtime = input.contract.runtimeType;
  const criteria = [
    promise
      ? locale === "en"
        ? `The output satisfies the published promise: ${promise}`
        : `La sortie respecte la promesse publiée : ${promise}`
      : null,
    locale === "en"
      ? "The result is actionable without a critical missing input."
      : "La sortie est exploitable sans information critique manquante.",
    runtime === "workflow_automation"
      ? locale === "en"
        ? "The workflow decision is visible and consistent with the final output."
        : "La décision workflow est visible et cohérente avec la sortie finale."
      : null,
    runtime === "creator_endpoint"
      ? locale === "en"
        ? "The creator API output is stored in AgentHub history and does not expose internal payload details."
        : "La sortie API créateur est stockée dans l’historique AgentHub sans exposer le payload interne."
      : null,
    runtime === "document_file" || input.documentInputMode
      ? locale === "en"
        ? "The analysis only uses extractable document text and flags uncertainty."
        : "L’analyse utilise uniquement le texte extrait du document et signale les incertitudes."
      : null,
  ];

  return uniqueItems(criteria).slice(0, 5);
}

function buildSupportHints(input: WorkspaceBlueprintInput, locale: WorkspaceBlueprintLocale) {
  const limitations = uniqueItems(input.agent?.limitations ?? []);
  const runtime = input.contract.runtimeType;
  const runtimeHint =
    locale === "en"
      ? runtime === "creator_endpoint"
        ? "If the endpoint times out or returns invalid JSON, retry later or report the agent."
        : runtime === "workflow_automation"
          ? "If the workflow decision looks wrong, review the input criteria before rating."
          : runtime === "document_file" || input.documentInputMode
            ? "If extraction fails, check that the document contains selectable text."
            : "If the answer is too broad, relaunch with a narrower input."
      : runtime === "creator_endpoint"
        ? "Si l’endpoint expire ou retourne un JSON invalide, réessayez plus tard ou signalez l’agent."
        : runtime === "workflow_automation"
          ? "Si la décision workflow semble incohérente, vérifiez les critères donnés avant d’évaluer."
          : runtime === "document_file" || input.documentInputMode
            ? "Si l’extraction échoue, vérifiez que le document contient du texte sélectionnable."
            : "Si la réponse est trop large, relancez avec un input plus précis.";

  return uniqueItems([runtimeHint, ...limitations]).slice(0, 5);
}

function buildTrustBoundary(input: WorkspaceBlueprintInput, locale: WorkspaceBlueprintLocale) {
  const runtime = input.contract.runtimeType;
  const agentHubBase = locale === "en"
    ? ["Access state, run history, and verified review stay in AgentHub."]
    : ["L’état d’accès, l’historique de run et l’avis vérifié restent dans AgentHub."];
  const agentHubRuntime =
    locale === "en"
      ? runtime === "document_file" || input.documentInputMode
        ? "AgentHub stores private file metadata and extracted text according to the document beta policy."
        : runtime === "workflow_automation"
          ? "AgentHub orchestrates workflow steps and stores the final result."
          : "AgentHub stores the execution result for this workspace."
      : runtime === "document_file" || input.documentInputMode
        ? "AgentHub stocke les métadonnées fichier privées et le texte extrait selon la politique document beta."
        : runtime === "workflow_automation"
          ? "AgentHub orchestre les étapes workflow et stocke le résultat final."
          : "AgentHub stocke le résultat d’exécution de ce workspace.";
  const creatorInfra =
    runtime === "creator_endpoint" || input.contract.dataPolicy.external_tools.length > 0
      ? [
          locale === "en"
            ? "Only the server-side execution payload needed for the approved creator endpoint is sent."
            : "Seul le payload serveur nécessaire à l’endpoint créateur approuvé est transmis.",
        ]
      : [];
  const warnings = uniqueItems([
    ...(runtime === "creator_endpoint"
      ? [
          locale === "en"
            ? "Do not send secrets or unnecessary personal data to creator infrastructure."
            : "N’envoyez pas de secrets ni de données personnelles inutiles vers l’infra créateur.",
        ]
      : []),
    ...(runtime === "document_file" || input.documentInputMode
      ? [
          locale === "en"
            ? "No OCR in beta: scanned PDFs may fail."
            : "Pas d’OCR en beta : les PDF scannés peuvent échouer.",
        ]
      : []),
  ]);

  return {
    dataSentToAgentHub: uniqueItems([...agentHubBase, agentHubRuntime]),
    dataSentToCreatorInfra: creatorInfra,
    userWarnings: warnings,
  };
}

export function buildAgentWorkspaceBlueprint(input: WorkspaceBlueprintInput): AgentWorkspaceBlueprintV1 {
  const locale = input.locale ?? "fr";

  return {
    inputSchema: {
      fields: buildInputFields(input, locale),
    },
    outputSchema: {
      sections: buildOutputSections(input, locale),
    },
    runChecklist: buildRunChecklist(input, locale),
    successCriteria: buildSuccessCriteria(input, locale),
    supportHints: buildSupportHints(input, locale),
    trustBoundary: buildTrustBoundary(input, locale),
    version: 1,
  };
}

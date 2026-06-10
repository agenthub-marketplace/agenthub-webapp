import "server-only";

import type { AgentContract, AgentRuntimeType } from "@/lib/agent-contract";

type WorkspaceManifestLocale = "en" | "fr";
type WorkspaceRuntimeKind = "assistant" | "document" | "workflow" | "creator_endpoint";
type WorkspaceInfraMode = "agenthub_hosted" | "creator_hosted" | "hybrid";

export type WorkspaceManifestV1 = {
  history: {
    emptyText: string;
    showMoreLabel: string;
    title: string;
  };
  infraMode: WorkspaceInfraMode;
  runner: {
    description: string;
    kind: WorkspaceRuntimeKind;
    primaryActionLabel: string;
    title: string;
  };
  setup: {
    description: string;
    requiredInputs: string[];
    title: string;
    warnings: string[];
  };
  tabs: {
    icon: "clipboard" | "history" | "layers" | "play" | "sliders";
    id: "details" | "overview" | "review" | "setup" | "use";
    label: string;
    priority: number;
  }[];
  trust: {
    creatorInfraDisclosure: string | null;
    dataDisclosure: string;
    executionBoundary: string[];
    title: string;
    warnings: string[];
  };
  version: 1;
};

type WorkspaceManifestInput = {
  actions?: string[];
  agent: {
    limitations?: string[] | null;
    requiredInputsList?: string[] | null;
    workspaceActions?: string[] | null;
    workspaceActionsEn?: string[] | null;
  } | null;
  contract: AgentContract;
  documentInputMode: boolean;
  locale?: WorkspaceManifestLocale;
};

function runtimeKind(runtimeType: AgentRuntimeType, documentInputMode: boolean): WorkspaceRuntimeKind {
  if (runtimeType === "creator_endpoint") {
    return "creator_endpoint";
  }

  if (runtimeType === "workflow_automation") {
    return "workflow";
  }

  if (runtimeType === "document_file" || documentInputMode) {
    return "document";
  }

  return "assistant";
}

function infraMode(runtimeType: AgentRuntimeType): WorkspaceInfraMode {
  if (runtimeType === "creator_endpoint") {
    return "creator_hosted";
  }

  if (runtimeType === "workflow_automation") {
    return "hybrid";
  }

  return "agenthub_hosted";
}

function copy(locale: WorkspaceManifestLocale) {
  if (locale === "en") {
    return {
      assistant: {
        description: "Add context, choose an action, then generate a server-side AI response.",
        history: "Assistant history",
        primary: "Generate response",
        title: "Guided AI assistant",
      },
      creatorEndpoint: {
        description: "AgentHub sends your request to an approved creator API from the server.",
        history: "API agent history",
        primary: "Send to API agent",
        title: "Creator API agent",
      },
      dataAgenthub: "Processed by AgentHub server-side for this beta.",
      dataCreator:
        "Some execution context can be sent to approved creator infrastructure from AgentHub servers.",
      executionBoundaryAgenthub: [
        "AgentHub controls access, payment state, audit, run history, and verified reviews.",
        "Execution stays on AgentHub infrastructure for this beta runtime.",
      ],
      executionBoundaryCreator: [
        "AgentHub controls access, payment state, audit, run history, and verified reviews.",
        "The approved creator endpoint receives only the server-side execution payload needed for this run.",
        "AgentHub signs the request and handles timeout or failure states before showing the result.",
      ],
      executionBoundaryHybrid: [
        "AgentHub controls access, payment state, audit, run history, and verified reviews.",
        "Workflow steps run through AgentHub and may call approved creator infrastructure when configured.",
      ],
      infraTitleAgenthub: "AgentHub-hosted execution",
      infraTitleCreator: "Creator infrastructure fallback",
      infraTitleHybrid: "Hybrid AgentHub workflow",
      details: "Details",
      document: {
        description: "Upload one PDF/DOCX, extract text server-side, then run the analysis.",
        history: "Document analysis history",
        primary: "Analyze document",
        title: "Document agent",
      },
      documentWarnings: [
        "PDF/DOCX only in beta.",
        "No OCR: scanned PDFs may not work.",
        "Do not upload sensitive real documents during beta tests.",
      ],
      emptyHistory: "No saved execution yet.",
      endpointWarnings: [
        "The creator endpoint is called server-side and signed by AgentHub.",
        "Do not include secrets or sensitive real customer data during beta tests.",
      ],
      overview: "Overview",
      review: "Review",
      setup: "Setup",
      setupDescription: "Prepare the required context before running this agent.",
      setupTitle: "Setup before use",
      showMore: "Show more executions",
      use: "Use",
      workflow: {
        description: "Launch the approved workflow and follow the queued/running/succeeded lifecycle.",
        history: "Workflow history",
        primary: "Launch workflow",
        title: "Workflow agent",
      },
      workflowWarnings: [
        "Workflow steps are reviewed by AgentHub before publication.",
        "Workflow runs can take a few seconds while the worker processes each step.",
      ],
    };
  }

  return {
    assistant: {
      description: "Ajoutez votre contexte, choisissez une action, puis générez une réponse IA côté serveur.",
      history: "Historique assistant",
      primary: "Générer la réponse",
      title: "Assistant IA guidé",
    },
    creatorEndpoint: {
      description: "AgentHub envoie votre demande à une API créateur approuvée depuis le serveur.",
      history: "Historique agent API",
      primary: "Envoyer à l’agent API",
      title: "Agent API créateur",
    },
    dataAgenthub: "Traitement effectué côté serveur AgentHub pour cette beta.",
    dataCreator:
      "Une partie du contexte d’exécution peut être transmise à l’infrastructure créateur approuvée depuis les serveurs AgentHub.",
    executionBoundaryAgenthub: [
      "AgentHub contrôle l’accès, l’état paiement, l’audit, l’historique et les avis vérifiés.",
      "L’exécution reste sur l’infrastructure AgentHub pour ce runtime beta.",
    ],
    executionBoundaryCreator: [
      "AgentHub contrôle l’accès, l’état paiement, l’audit, l’historique et les avis vérifiés.",
      "L’endpoint créateur approuvé reçoit uniquement le payload serveur nécessaire à cette exécution.",
      "AgentHub signe la requête et gère les timeouts ou erreurs avant d’afficher le résultat.",
    ],
    executionBoundaryHybrid: [
      "AgentHub contrôle l’accès, l’état paiement, l’audit, l’historique et les avis vérifiés.",
      "Les étapes workflow passent par AgentHub et peuvent appeler une infra créateur approuvée si configurée.",
    ],
    infraTitleAgenthub: "Exécution hébergée AgentHub",
    infraTitleCreator: "Fallback infrastructure créateur",
    infraTitleHybrid: "Workflow hybride AgentHub",
    details: "Détails",
    document: {
      description: "Ajoutez un PDF/DOCX, AgentHub extrait le texte côté serveur, puis lance l’analyse.",
      history: "Historique document",
      primary: "Analyser le document",
      title: "Agent document",
    },
    documentWarnings: [
      "PDF/DOCX uniquement en beta.",
      "Pas d’OCR : les PDF scannés peuvent échouer.",
      "N’ajoutez pas de documents réels sensibles pendant les tests beta.",
    ],
    emptyHistory: "Aucune exécution enregistrée pour le moment.",
    endpointWarnings: [
      "L’endpoint créateur est appelé côté serveur et signé par AgentHub.",
      "N’incluez pas de secrets ou données client réelles sensibles pendant la beta.",
    ],
    overview: "Présentation",
    review: "Avis",
    setup: "Mise en place",
    setupDescription: "Préparez le contexte requis avant de lancer cet agent.",
    setupTitle: "Mise en place avant utilisation",
    showMore: "Voir plus d’exécutions",
    use: "Utiliser",
    workflow: {
      description: "Lancez le workflow approuvé et suivez son cycle queued/running/succeeded.",
      history: "Historique workflow",
      primary: "Lancer le workflow",
      title: "Agent workflow",
    },
    workflowWarnings: [
      "Les étapes workflow sont relues par AgentHub avant publication.",
      "Un workflow peut prendre quelques secondes pendant le traitement worker.",
    ],
  };
}

export function buildWorkspaceManifest(input: WorkspaceManifestInput): WorkspaceManifestV1 {
  const locale = input.locale ?? "fr";
  const labels = copy(locale);
  const kind = runtimeKind(input.contract.runtimeType, input.documentInputMode);
  const infra = infraMode(input.contract.runtimeType);
  const runnerCopy =
    kind === "creator_endpoint"
      ? labels.creatorEndpoint
      : kind === "workflow"
        ? labels.workflow
        : kind === "document"
          ? labels.document
          : labels.assistant;
  const warnings = [
    ...(kind === "document" ? labels.documentWarnings : []),
    ...(kind === "workflow" ? labels.workflowWarnings : []),
    ...(kind === "creator_endpoint" ? labels.endpointWarnings : []),
    ...(input.contract.dataPolicy.external_tools.length > 0
      ? [
          locale === "en"
            ? "This agent declares external tools; verify beta support before sharing sensitive context."
            : "Cet agent déclare des outils externes ; vérifiez le support beta avant de partager un contexte sensible.",
        ]
      : []),
  ];
  const setupInputs = input.agent?.requiredInputsList?.length
    ? input.agent.requiredInputsList
    : input.contract.setupRequirements.items;
  const tabs =
    kind === "document"
      ? [
          { id: "overview", label: labels.overview, icon: "layers", priority: 1 },
          { id: "setup", label: locale === "en" ? "Document" : "Document", icon: "sliders", priority: 2 },
          { id: "use", label: locale === "en" ? "Analysis" : "Analyse", icon: "play", priority: 3 },
          { id: "details", label: labels.details, icon: "clipboard", priority: 4 },
          { id: "review", label: labels.review, icon: "history", priority: 5 },
        ]
      : kind === "workflow"
        ? [
            { id: "overview", label: labels.overview, icon: "layers", priority: 1 },
            { id: "setup", label: locale === "en" ? "Preparation" : "Préparation", icon: "sliders", priority: 2 },
            { id: "use", label: locale === "en" ? "Workflow" : "Workflow", icon: "play", priority: 3 },
            { id: "details", label: labels.details, icon: "clipboard", priority: 4 },
            { id: "review", label: labels.review, icon: "history", priority: 5 },
          ]
        : kind === "creator_endpoint"
          ? [
              { id: "overview", label: labels.overview, icon: "layers", priority: 1 },
              { id: "setup", label: locale === "en" ? "Preparation" : "Préparation", icon: "sliders", priority: 2 },
              { id: "use", label: locale === "en" ? "API agent" : "Agent API", icon: "play", priority: 3 },
              { id: "details", label: labels.details, icon: "clipboard", priority: 4 },
              { id: "review", label: labels.review, icon: "history", priority: 5 },
            ]
          : [
              { id: "overview", label: labels.overview, icon: "layers", priority: 1 },
              { id: "setup", label: labels.setup, icon: "sliders", priority: 2 },
              { id: "use", label: labels.use, icon: "play", priority: 3 },
              { id: "details", label: labels.details, icon: "clipboard", priority: 4 },
              { id: "review", label: labels.review, icon: "history", priority: 5 },
            ];

  return {
    history: {
      emptyText: labels.emptyHistory,
      showMoreLabel: labels.showMore,
      title: runnerCopy.history,
    },
    infraMode: infra,
    runner: {
      description: runnerCopy.description,
      kind,
      primaryActionLabel: runnerCopy.primary,
      title: runnerCopy.title,
    },
    setup: {
      description: labels.setupDescription,
      requiredInputs: setupInputs ?? [],
      title: labels.setupTitle,
      warnings,
    },
    tabs: tabs.sort((a, b) => a.priority - b.priority) as WorkspaceManifestV1["tabs"],
    trust: {
      creatorInfraDisclosure: infra === "agenthub_hosted" ? null : labels.dataCreator,
      dataDisclosure: infra === "agenthub_hosted" ? labels.dataAgenthub : labels.dataCreator,
      executionBoundary:
        infra === "creator_hosted"
          ? labels.executionBoundaryCreator
          : infra === "hybrid"
            ? labels.executionBoundaryHybrid
            : labels.executionBoundaryAgenthub,
      title:
        infra === "creator_hosted"
          ? labels.infraTitleCreator
          : infra === "hybrid"
            ? labels.infraTitleHybrid
            : labels.infraTitleAgenthub,
      warnings,
    },
    version: 1,
  };
}

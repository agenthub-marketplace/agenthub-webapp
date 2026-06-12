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
  | "support_state"
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

export type WorkspaceRecipeStartupStep = {
  detail: string;
  key: string;
  label: string;
  status: Exclude<WorkspaceRecipeBlockStatus, "hidden">;
};

export type WorkspaceRecipeNextStep = {
  detail: string;
  label: string;
  tab: WorkspaceRecipeBlock["tab"];
};

export type WorkspaceRecipeV1 = {
  blocks: WorkspaceRecipeBlock[];
  disabledReason: string | null;
  fallbackPath: string[];
  historyCount: number;
  lastRun: {
    actionLabel: string;
    completedAt: string | null;
    createdAt: string;
    hint: string;
    status: AgentRunSummary["status"];
  } | null;
  historyPreview: {
    detail: string;
    inputPreview: string | null;
    outputPreview: string | null;
    title: string;
  } | null;
  limits: {
    maxFileBytes: number;
    maxInputChars: number;
  };
  nextActions: string[];
  nextStep: WorkspaceRecipeNextStep;
  outcomeChecklist: string[];
  primaryActionLabel: string;
  readiness: {
    blockers: string[];
    disclosureRequired: boolean;
    infraMode: WorkspaceManifestV1["infraMode"];
    score: number;
    scoreDetail: string;
    scoreLabel: string;
    status: "attention" | "blocked" | "ready";
  };
  runtimePanel: WorkspaceRecipeRuntimePanel;
  startupPlan: WorkspaceRecipeStartupStep[];
  successCriteria: string[];
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
  outputPromise: {
    examples: string[];
    summary: string;
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
      fallbackPath: {
        creatorDisclosure: "Only send context that can be handled by the approved creator infrastructure.",
        creatorHistory: "AgentHub still stores the final result and access history for this workspace.",
        creatorProxy: "AgentHub signs and proxies the request server-side; the browser never calls the creator endpoint directly.",
        disabled: "Resolve the runtime blocker before sending real user context.",
        review: "If the result does not match the published promise, leave verified feedback from this workspace.",
      },
      limitations: "Limitations",
      nextActions: {
        assistant: [
          "Describe the exact output you need.",
          "Run the assistant, then adjust the input if the result is too broad.",
          "Keep the generated result in history for later review.",
        ],
        document: [
          "Upload one PDF or DOCX that contains selectable text.",
          "Review the extracted text state before launching the document action.",
          "Run the action and check the stored result after reload.",
        ],
        endpoint: [
          "Confirm that user input may be sent to approved creator infrastructure.",
          "Send the request to the creator API agent.",
          "Check the returned result and retry later if the endpoint is unavailable.",
        ],
        workflow: [
          "Enter the context the workflow should process.",
          "Launch the workflow and wait for queued/running/succeeded state changes.",
          "Review the final result and step history before leaving feedback.",
        ],
      },
      resultViewer: "Result viewer",
      supportState: "Support state",
      supportStateReady: "No support blocker is active for this workspace.",
      verifiedReview: "Verified review",
      startupPlan: {
        assistant: [
          {
            key: "brief",
            label: "Frame the request",
            ready: "Use the setup context to describe the result you need.",
          },
          {
            key: "run",
            label: "Generate the response",
            ready: "Launch the assistant from the Use tab.",
          },
          {
            key: "history",
            label: "Keep the useful result",
            ready: "Stored runs stay available in this workspace.",
          },
        ],
        document: [
          {
            key: "file",
            label: "Prepare one document",
            ready: "Use a PDF or DOCX with selectable text.",
          },
          {
            key: "extract",
            label: "Check extraction",
            ready: "AgentHub extracts text server-side before analysis.",
          },
          {
            key: "run",
            label: "Analyze and save",
            ready: "Run the document action and keep the stored result.",
          },
        ],
        endpoint: [
          {
            key: "disclosure",
            label: "Confirm creator infrastructure",
            ready: "Only send context that can be handled by the approved creator endpoint.",
          },
          {
            key: "run",
            label: "Send to the API agent",
            ready: "AgentHub signs and proxies the request server-side.",
          },
          {
            key: "history",
            label: "Review returned output",
            ready: "The final answer is stored in your run history.",
          },
        ],
        workflow: [
          {
            key: "context",
            label: "Prepare workflow context",
            ready: "Give the workflow enough information to make its decisions.",
          },
          {
            key: "run",
            label: "Launch the workflow",
            ready: "Follow queued, running, and succeeded states.",
          },
          {
            key: "history",
            label: "Review final output",
            ready: "Use the saved result before leaving a verified review.",
          },
        ],
      },
      setupChecklist: {
        assistant: "Paste only the context needed for the expected response.",
        baseActive: "Confirm this access is active and the agent matches your current need.",
        disabled: "Resolve the runtime blocker before entering real data.",
        document: "Use one PDF or DOCX under {size} with selectable text.",
        endpoint: "Confirm the input can be sent to approved creator infrastructure.",
        history: "Review existing run history before launching a duplicate run.",
        requiredInputs: "Prepare: {items}",
        workflow: "Prepare concise context so each workflow step can make its decision.",
      },
      lastRun: {
        empty: "No run yet",
        failed: "Last run failed",
        running: "Run in progress",
        succeeded: "Last run completed",
      },
      lastRunHints: {
        failed: "Review the history error, adjust the input, then relaunch when ready.",
        running: "Wait for this run to finish before starting another execution.",
        succeeded: "Open the stored result before relaunching the agent.",
      },
      historyPreview: {
        failedDetail: "The latest run failed. Use the input below to adjust the next attempt.",
        inputTitle: "Latest input",
        outputTitle: "Latest output",
        runningDetail: "A run is still in progress. Wait for the stored result before relaunching.",
        succeededDetail: "A stored result is available. Reuse it before starting another run.",
        title: "Resume from latest run",
      },
      outcomeChecklist: {
        example: "Compare the result with one expected example: {example}",
        history: "The result you want to review is saved in this workspace history.",
        limit: "The output respects the agent limitations and does not claim unsupported actions.",
        missingHistory: "Run the agent once before leaving a verified review.",
        promise: "The result matches the published promise: {summary}",
        quality: "The output is actionable without a critical missing input.",
        retryAfterFailure: "If the last run failed, relaunch with clearer input before reviewing the agent.",
      },
      successCriteria: {
        assistant: "The answer directly matches the requested format and can be reused without a full rewrite.",
        document: "The analysis cites only information extractable from the uploaded document and flags uncertainty.",
        endpoint: "The returned output is useful even if the creator endpoint cannot perform actions outside the approved contract.",
        example: "At least one expected output example is recognizable in the result: {example}",
        history: "The successful result is stored and can be reopened after a page reload.",
        promise: "The result satisfies the published promise: {summary}",
        workflow: "The workflow made a visible decision, then produced a final output consistent with that decision.",
      },
      nextActionHints: {
        creatorInfra: "This agent uses approved creator infrastructure; do not send secrets or unnecessary personal data.",
        disabled: "Contact support or try another approved agent while this runtime is unavailable.",
        history: "Open a previous result if you want to continue from an existing run instead of starting over.",
        setup: "Prepare the required setup inputs before launching the runtime.",
      },
      nextStep: {
        blockedDetail: "Resolve the runtime blocker before adding real context.",
        blockedLabel: "Review setup",
        reviewDetail: "A successful result is saved. Check it, then leave verified feedback if it matches your need.",
        reviewLabel: "Review the result",
        retryDetail: "The latest run failed. Adjust the input or setup, then launch again.",
        retryLabel: "Retry execution",
        runDetail: "Setup is ready. Launch the main action to create the first stored result.",
        runLabel: "Run the agent",
        setupDetail: "Prepare the required context and trust boundary before execution.",
        setupLabel: "Finish setup",
        waitDetail: "A run is already in progress. Stay on the execution tab until it finishes.",
        waitLabel: "Follow current run",
      },
      runtimeUnavailable: "Runtime is not available in this environment.",
      readinessScore: {
        attentionDetail: "Prepare the missing setup or trust boundary before running this agent.",
        attentionLabel: "Needs preparation",
        blockedDetail: "Execution is blocked until the runtime gate is resolved.",
        blockedLabel: "Blocked",
        readyDetail: "This workspace is ready for a first useful run.",
        readyLabel: "Ready",
      },
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
    fallbackPath: {
      creatorDisclosure: "Envoyez uniquement le contexte compatible avec l’infrastructure créateur approuvée.",
      creatorHistory: "AgentHub conserve quand même le résultat final et l’historique de cet accès.",
      creatorProxy: "AgentHub signe et proxifie la requête côté serveur ; le navigateur n’appelle jamais l’endpoint créateur directement.",
      disabled: "Résolvez le blocage runtime avant d’envoyer un vrai contexte utilisateur.",
      review: "Si le résultat ne respecte pas la promesse publiée, laissez un avis vérifié depuis ce workspace.",
    },
    limitations: "Limites",
    nextActions: {
      assistant: [
        "Décrivez précisément le résultat attendu.",
        "Lancez l’assistant, puis ajustez l’input si la réponse est trop large.",
        "Gardez le résultat généré dans l’historique pour le retrouver.",
      ],
      document: [
        "Ajoutez un PDF ou DOCX contenant du texte sélectionnable.",
        "Vérifiez l’état d’extraction avant de lancer l’action document.",
        "Lancez l’action et contrôlez le résultat stocké après rechargement.",
      ],
      endpoint: [
        "Confirmez que l’input peut être envoyé à l’infrastructure creator approuvée.",
        "Envoyez la demande à l’agent API creator.",
        "Vérifiez le résultat retourné et réessayez plus tard si l’endpoint est indisponible.",
      ],
      workflow: [
        "Ajoutez le contexte que le workflow doit traiter.",
        "Lancez le workflow et suivez les états queued/running/succeeded.",
        "Relisez le résultat final et l’historique des étapes avant de laisser un avis.",
      ],
    },
    resultViewer: "Résultat",
    supportState: "État support",
    supportStateReady: "Aucun blocage support actif pour ce workspace.",
    verifiedReview: "Avis vérifié",
    startupPlan: {
      assistant: [
        {
          key: "brief",
          label: "Cadrer la demande",
          ready: "Utilisez le contexte de mise en place pour décrire le résultat attendu.",
        },
        {
          key: "run",
          label: "Générer la réponse",
          ready: "Lancez l’assistant depuis l’onglet Utiliser.",
        },
        {
          key: "history",
          label: "Conserver le résultat utile",
          ready: "Les exécutions restent disponibles dans ce workspace.",
        },
      ],
      document: [
        {
          key: "file",
          label: "Préparer un document",
          ready: "Utilisez un PDF ou DOCX avec texte sélectionnable.",
        },
        {
          key: "extract",
          label: "Vérifier l’extraction",
          ready: "AgentHub extrait le texte côté serveur avant analyse.",
        },
        {
          key: "run",
          label: "Analyser et sauvegarder",
          ready: "Lancez l’action document et gardez le résultat stocké.",
        },
      ],
      endpoint: [
        {
          key: "disclosure",
          label: "Confirmer l’infra créateur",
          ready: "Envoyez uniquement le contexte compatible avec l’endpoint créateur approuvé.",
        },
        {
          key: "run",
          label: "Envoyer à l’agent API",
          ready: "AgentHub signe et proxifie la requête côté serveur.",
        },
        {
          key: "history",
          label: "Relire la sortie retournée",
          ready: "La réponse finale est stockée dans l’historique d’exécution.",
        },
      ],
      workflow: [
        {
          key: "context",
          label: "Préparer le contexte workflow",
          ready: "Donnez assez d’informations au workflow pour prendre ses décisions.",
        },
        {
          key: "run",
          label: "Lancer le workflow",
          ready: "Suivez les états queued, running et succeeded.",
        },
        {
          key: "history",
          label: "Relire le résultat final",
          ready: "Utilisez le résultat sauvegardé avant de laisser un avis vérifié.",
        },
      ],
      },
      setupChecklist: {
        assistant: "Collez uniquement le contexte nécessaire à la réponse attendue.",
        baseActive: "Confirmez que l’accès est actif et que l’agent correspond au besoin du moment.",
        disabled: "Résolvez le blocage runtime avant de saisir de vraies données.",
        document: "Utilisez un seul PDF ou DOCX sous {size} avec du texte sélectionnable.",
        endpoint: "Confirmez que l’input peut être envoyé à l’infrastructure creator approuvée.",
        history: "Relisez l’historique existant avant de lancer une exécution en doublon.",
        requiredInputs: "Préparez : {items}",
        workflow: "Préparez un contexte concis pour que chaque étape workflow puisse décider.",
      },
      lastRun: {
        empty: "Aucune exécution",
        failed: "Dernière exécution échouée",
        running: "Exécution en cours",
        succeeded: "Dernière exécution terminée",
      },
      lastRunHints: {
        failed: "Relisez l’erreur dans l’historique, ajustez l’input, puis relancez si besoin.",
        running: "Attendez la fin de cette exécution avant d’en lancer une autre.",
        succeeded: "Ouvrez le résultat stocké avant de relancer l’agent.",
      },
      historyPreview: {
        failedDetail: "La dernière exécution a échoué. Utilisez l’input ci-dessous pour ajuster la prochaine tentative.",
        inputTitle: "Dernier input",
        outputTitle: "Dernière sortie",
        runningDetail: "Une exécution est encore en cours. Attendez le résultat stocké avant de relancer.",
        succeededDetail: "Un résultat stocké est disponible. Réutilisez-le avant de lancer une nouvelle exécution.",
        title: "Reprendre depuis la dernière exécution",
      },
      outcomeChecklist: {
        example: "Comparez le résultat avec un exemple attendu : {example}",
        history: "Le résultat que vous voulez évaluer est bien stocké dans l’historique.",
        limit: "La sortie respecte les limites de l’agent et ne promet pas d’action non supportée.",
        missingHistory: "Lancez l’agent au moins une fois avant de laisser un avis vérifié.",
        promise: "Le résultat correspond à la promesse publiée : {summary}",
        quality: "La sortie est exploitable sans information critique manquante.",
        retryAfterFailure: "Si la dernière exécution a échoué, relancez avec un input plus clair avant d’évaluer l’agent.",
      },
      successCriteria: {
        assistant: "La réponse correspond directement au format demandé et peut être réutilisée sans réécriture complète.",
        document: "L’analyse s’appuie uniquement sur le texte extrait du document et signale les zones incertaines.",
        endpoint: "La sortie retournée reste utile même si l’endpoint créateur ne peut agir que dans le contrat approuvé.",
        example: "Au moins un exemple de sortie attendu est reconnaissable dans le résultat : {example}",
        history: "Le résultat réussi est stocké et peut être rouvert après rechargement de la page.",
        promise: "Le résultat respecte la promesse publiée : {summary}",
        workflow: "Le workflow a pris une décision visible, puis produit une sortie finale cohérente avec cette décision.",
      },
      nextActionHints: {
        creatorInfra: "Cet agent utilise une infrastructure creator approuvée ; n’envoyez pas de secrets ni de données personnelles inutiles.",
        disabled: "Contactez le support ou essayez un autre agent approuvé tant que ce runtime est indisponible.",
        history: "Ouvrez un résultat précédent si vous voulez repartir d’une exécution existante plutôt que relancer.",
        setup: "Préparez les informations requises avant de lancer le runtime.",
      },
      nextStep: {
        blockedDetail: "Résolvez le blocage runtime avant d’ajouter un vrai contexte.",
        blockedLabel: "Vérifier la mise en place",
        reviewDetail: "Un résultat réussi est enregistré. Relisez-le, puis laissez un avis vérifié s’il répond au besoin.",
        reviewLabel: "Évaluer le résultat",
        retryDetail: "La dernière exécution a échoué. Ajustez l’input ou le setup, puis relancez.",
        retryLabel: "Relancer l’exécution",
        runDetail: "La mise en place est prête. Lancez l’action principale pour créer le premier résultat stocké.",
        runLabel: "Lancer l’agent",
        setupDetail: "Préparez le contexte requis et la frontière de confiance avant l’exécution.",
        setupLabel: "Terminer la mise en place",
        waitDetail: "Une exécution est déjà en cours. Restez sur l’onglet d’exécution jusqu’à la fin.",
        waitLabel: "Suivre l’exécution",
      },
    runtimeUnavailable: "Ce runtime n’est pas disponible dans cet environnement.",
    readinessScore: {
      attentionDetail: "Préparez le setup ou la frontière de confiance avant de lancer cet agent.",
      attentionLabel: "Préparation requise",
      blockedDetail: "L’exécution est bloquée tant que le gate runtime n’est pas résolu.",
      blockedLabel: "Bloqué",
      readyDetail: "Ce workspace est prêt pour une première exécution utile.",
      readyLabel: "Prêt",
    },
    workflowDetail: "queued/running/succeeded/failed",
    workflowProgress: "Progression workflow",
  };
}

function buildStartupPlan(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
  panel: WorkspaceRecipeRuntimePanel,
  hasHistory: boolean,
  hasSetup: boolean,
): WorkspaceRecipeStartupStep[] {
  const basePlan = labels.startupPlan[panel];
  const disabledReason = input.enabled ? null : input.runner.disabledMessage ?? labels.runtimeUnavailable;
  const setupDetail = input.workspaceManifest.setup.requiredInputs.length
    ? input.workspaceManifest.setup.requiredInputs.join(" · ")
    : input.workspaceManifest.setup.description;
  const historyStep = basePlan.find((step) => step.key === "history") ?? basePlan[basePlan.length - 1];
  const runStep = basePlan.find((step) => step.key === "run") ?? basePlan[Math.min(1, basePlan.length - 1)];
  const firstStep = basePlan[0];
  const steps: WorkspaceRecipeStartupStep[] = [
    {
      detail: hasSetup ? setupDetail : firstStep.ready,
      key: firstStep.key,
      label: firstStep.label,
      status: hasSetup ? "attention" : "ready",
    },
  ];

  if (input.workspaceManifest.infraMode !== "agenthub_hosted") {
    steps.push({
      detail: input.workspaceManifest.trust.creatorInfraDisclosure ?? input.workspaceManifest.trust.dataDisclosure,
      key: "trust-boundary",
      label: input.workspaceManifest.trust.title,
      status: "attention",
    });
  }

  steps.push({
    detail: disabledReason ?? runStep.ready,
    key: runStep.key,
    label: runStep.label,
    status: disabledReason ? "disabled" : "ready",
  });

  steps.push({
    detail: hasHistory ? historyStep.ready : input.workspaceManifest.history.emptyText,
    key: historyStep.key,
    label: historyStep.label,
    status: hasHistory ? "ready" : "attention",
  });

  return steps.slice(0, 5);
}

function buildNextActions(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
  panel: WorkspaceRecipeRuntimePanel,
  hasHistory: boolean,
  hasSetup: boolean,
) {
  if (!input.enabled) {
    return [
      input.runner.disabledMessage ?? labels.runtimeUnavailable,
      labels.nextActionHints.disabled,
    ];
  }

  const actions = [...labels.nextActions[panel]];

  if (hasSetup) {
    actions.unshift(labels.nextActionHints.setup);
  }

  if (hasHistory) {
    actions.push(labels.nextActionHints.history);
  }

  if (panel === "endpoint") {
    actions.unshift(labels.nextActionHints.creatorInfra);
  }

  return actions.slice(0, 5);
}

function buildNextStep(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
  hasHistory: boolean,
  hasSetup: boolean,
  lastRun: AgentRunSummary | null,
): WorkspaceRecipeNextStep {
  if (!input.enabled) {
    return {
      detail: input.runner.disabledMessage ?? labels.nextStep.blockedDetail,
      label: labels.nextStep.blockedLabel,
      tab: "setup",
    };
  }

  if (hasSetup) {
    return {
      detail: labels.nextStep.setupDetail,
      label: labels.nextStep.setupLabel,
      tab: "setup",
    };
  }

  if (lastRun?.status === "running") {
    return {
      detail: labels.nextStep.waitDetail,
      label: labels.nextStep.waitLabel,
      tab: "use",
    };
  }

  if (lastRun?.status === "failed") {
    return {
      detail: labels.nextStep.retryDetail,
      label: labels.nextStep.retryLabel,
      tab: "use",
    };
  }

  if (!hasHistory) {
    return {
      detail: labels.nextStep.runDetail,
      label: labels.nextStep.runLabel,
      tab: "use",
    };
  }

  return {
    detail: labels.nextStep.reviewDetail,
    label: labels.nextStep.reviewLabel,
    tab: "review",
  };
}

function uniqueItems(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function buildSetupChecklist(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
  panel: WorkspaceRecipeRuntimePanel,
  hasHistory: boolean,
  hasSetup: boolean,
) {
  const items = [labels.setupChecklist.baseActive];

  if (hasSetup) {
    items.push(labels.setupChecklist.requiredInputs.replace("{items}", input.workspaceManifest.setup.requiredInputs.join(" · ")));
  }

  if (!input.enabled) {
    items.push(labels.setupChecklist.disabled);
  }

  if (panel === "document") {
    items.push(labels.setupChecklist.document.replace("{size}", formatBytes(input.limits.maxFileBytes)));
  } else {
    items.push(labels.setupChecklist[panel]);
  }

  if (input.workspaceManifest.infraMode !== "agenthub_hosted") {
    items.push(labels.setupChecklist.endpoint);
  }

  if (hasHistory) {
    items.push(labels.setupChecklist.history);
  }

  return uniqueItems(items).slice(0, 6);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buildReadiness(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
  hasHistory: boolean,
  hasSetup: boolean,
  lastRun: AgentRunSummary | null,
) {
  const blockers = input.enabled ? [] : [input.runner.disabledMessage ?? labels.runtimeUnavailable];
  const disclosureRequired = input.workspaceManifest.infraMode !== "agenthub_hosted";
  let score = 100;

  if (!input.enabled) {
    score = 20;
  }

  if (hasSetup) {
    score -= 15;
  }

  if (disclosureRequired) {
    score -= 10;
  }

  if (input.workspaceManifest.trust.warnings.length > 0) {
    score -= 10;
  }

  if (!hasHistory) {
    score -= 5;
  }

  if (lastRun?.status === "running") {
    score -= 10;
  } else if (lastRun?.status === "failed") {
    score -= 20;
  }

  const readinessScore = clampScore(score);
  const status: WorkspaceRecipeV1["readiness"]["status"] = !input.enabled
    ? "blocked"
    : readinessScore < 80
      ? "attention"
      : "ready";
  const scoreCopy =
    status === "blocked"
      ? {
          scoreDetail: labels.readinessScore.blockedDetail,
          scoreLabel: labels.readinessScore.blockedLabel,
        }
      : status === "attention"
        ? {
            scoreDetail: labels.readinessScore.attentionDetail,
            scoreLabel: labels.readinessScore.attentionLabel,
          }
        : {
            scoreDetail: labels.readinessScore.readyDetail,
            scoreLabel: labels.readinessScore.readyLabel,
          };

  return {
    blockers,
    disclosureRequired,
    infraMode: input.workspaceManifest.infraMode,
    score: readinessScore,
    ...scoreCopy,
    status,
  };
}

function buildFallbackPath(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
) {
  const items: string[] = [];

  if (input.workspaceManifest.infraMode !== "agenthub_hosted") {
    items.push(labels.fallbackPath.creatorDisclosure);
    items.push(labels.fallbackPath.creatorProxy);
    items.push(labels.fallbackPath.creatorHistory);
  }

  if (!input.enabled) {
    items.push(labels.fallbackPath.disabled);
  }

  if (items.length > 0) {
    items.push(labels.fallbackPath.review);
  }

  return uniqueItems(items).slice(0, 5);
}

function buildLastRun(
  run: AgentRunSummary | null,
  labels: ReturnType<typeof recipeLabels>,
): WorkspaceRecipeV1["lastRun"] {
  if (!run) {
    return null;
  }

  return {
    actionLabel: run.actionLabel,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    hint: labels.lastRunHints[run.status] ?? labels.lastRun.empty,
    status: run.status,
  };
}

function compactPreview(value: string | null | undefined, maxLength = 220) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function buildHistoryPreview(
  run: AgentRunSummary | null,
  labels: ReturnType<typeof recipeLabels>,
): WorkspaceRecipeV1["historyPreview"] {
  if (!run) {
    return null;
  }

  const detail =
    run.status === "succeeded"
      ? labels.historyPreview.succeededDetail
      : run.status === "failed"
        ? labels.historyPreview.failedDetail
        : labels.historyPreview.runningDetail;

  return {
    detail,
    inputPreview: compactPreview(run.inputText, 180),
    outputPreview: compactPreview(run.outputText, 260),
    title: labels.historyPreview.title,
  };
}

function buildOutcomeChecklist(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
  lastRun: AgentRunSummary | null,
) {
  const items: string[] = [];
  const summary = input.outputPromise.summary.trim();
  const example = input.outputPromise.examples.find((item) => item.trim().length > 0)?.trim();

  if (summary) {
    items.push(labels.outcomeChecklist.promise.replace("{summary}", summary));
  }

  if (example) {
    items.push(labels.outcomeChecklist.example.replace("{example}", example));
  }

  items.push(labels.outcomeChecklist.quality);
  items.push(labels.outcomeChecklist.limit);

  if (!lastRun) {
    items.push(labels.outcomeChecklist.missingHistory);
  } else if (lastRun.status === "failed") {
    items.push(labels.outcomeChecklist.retryAfterFailure);
  } else {
    items.push(labels.outcomeChecklist.history);
  }

  return uniqueItems(items).slice(0, 5);
}

function buildSuccessCriteria(
  input: WorkspaceRecipeInput,
  labels: ReturnType<typeof recipeLabels>,
  panel: WorkspaceRecipeRuntimePanel,
  lastRun: AgentRunSummary | null,
) {
  const items: string[] = [];
  const summary = input.outputPromise.summary.trim();
  const example = input.outputPromise.examples.find((item) => item.trim().length > 0)?.trim();

  if (summary) {
    items.push(labels.successCriteria.promise.replace("{summary}", summary));
  }

  items.push(labels.successCriteria[panel]);

  if (example) {
    items.push(labels.successCriteria.example.replace("{example}", example));
  }

  if (lastRun?.status === "succeeded") {
    items.push(labels.successCriteria.history);
  }

  return uniqueItems(items).slice(0, 4);
}

export function buildWorkspaceRecipe(input: WorkspaceRecipeInput): WorkspaceRecipeV1 {
  const labels = recipeLabels(input.locale);
  const panel = runtimePanel(input.runner.kind);
  const hasSetup = input.workspaceManifest.setup.requiredInputs.length > 0;
  const hasHistory = input.history.length > 0;
  const lastRun = input.history[0] ?? null;
  const runnerStatus: WorkspaceRecipeBlockStatus = input.enabled ? "ready" : "disabled";
  const supportDetail =
    input.runner.disabledMessage ??
    input.workspaceManifest.trust.warnings[0] ??
    (input.workspaceManifest.infraMode !== "agenthub_hosted"
      ? input.workspaceManifest.trust.creatorInfraDisclosure
      : null);
  const supportStatus: WorkspaceRecipeBlockStatus = input.enabled ? "attention" : "disabled";
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
      detail: supportDetail ?? labels.supportStateReady,
      id: "support_state",
      label: labels.supportState,
      required: !input.enabled,
      status: supportDetail ? supportStatus : "hidden",
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
    fallbackPath: buildFallbackPath(input, labels),
    historyCount: input.history.length,
    historyPreview: buildHistoryPreview(lastRun, labels),
    lastRun: buildLastRun(lastRun, labels),
    limits: input.limits,
    nextActions: buildNextActions(input, labels, panel, hasHistory, hasSetup),
    nextStep: buildNextStep(input, labels, hasHistory, hasSetup, lastRun),
    outcomeChecklist: buildOutcomeChecklist(input, labels, lastRun),
    primaryActionLabel: input.workspaceManifest.runner.primaryActionLabel,
    readiness: buildReadiness(input, labels, hasHistory, hasSetup, lastRun),
    runtimePanel: panel,
    startupPlan: buildStartupPlan(input, labels, panel, hasHistory, hasSetup),
    successCriteria: buildSuccessCriteria(input, labels, panel, lastRun),
    setupChecklist: buildSetupChecklist(input, labels, panel, hasHistory, hasSetup),
    trustWarnings: input.workspaceManifest.trust.warnings,
    version: 1,
  };
}

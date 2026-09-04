import type { Locale } from "@/lib/i18n/config";

type WorkspaceActionInput = {
  locale: Locale;
  templateActions?: string[];
  templateActionsEn?: string[];
  workspaceMode?: string | null;
};

export type WorkspaceAction = {
  key: string;
  label: string;
};

const FALLBACK_ACTIONS = {
  fr: {
    instant: ["Voir les cas d’usage", "Copier un prompt de démarrage", "Comprendre les livrables"],
    instant_workspace: ["Voir les cas d’usage", "Copier un prompt de démarrage", "Comprendre les livrables"],
    guided: ["Définir mon objectif", "Préparer les informations utiles", "Générer ma checklist de démarrage"],
    guided_workspace: ["Définir mon objectif", "Préparer les informations utiles", "Générer ma checklist de démarrage"],
    document_required: ["Préparer mon document", "Vérifier les informations nécessaires", "Voir les limites de l’analyse"],
    document_workspace: ["Préparer mon document", "Vérifier les informations nécessaires", "Voir les limites de l’analyse"],
    report_workspace: ["Comprendre le rapport attendu", "Préparer le contexte", "Voir les sections du rapport"],
  },
  en: {
    instant: ["View use cases", "Copy a starter prompt", "Understand deliverables"],
    instant_workspace: ["View use cases", "Copy a starter prompt", "Understand deliverables"],
    guided: ["Define my goal", "Prepare useful information", "Generate my startup checklist"],
    guided_workspace: ["Define my goal", "Prepare useful information", "Generate my startup checklist"],
    document_required: ["Prepare my document", "Check required information", "Review analysis limits"],
    document_workspace: ["Prepare my document", "Check required information", "Review analysis limits"],
    report_workspace: ["Understand the expected report", "Prepare context", "Review report sections"],
  },
} as const;

function actionKey(index: number, label: string) {
  const normalized = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `action_${index + 1}_${normalized || "workspace"}`;
}

export function getWorkspaceActionLabels(input: WorkspaceActionInput): WorkspaceAction[] {
  const templateActions = input.locale === "en" ? input.templateActionsEn : input.templateActions;
  const mode = input.workspaceMode || "instant";
  const fallback = FALLBACK_ACTIONS[input.locale][mode as keyof (typeof FALLBACK_ACTIONS)["fr"]] ?? FALLBACK_ACTIONS[input.locale].instant;
  const labels = templateActions && templateActions.length > 0 ? templateActions : fallback;

  return labels.slice(0, 5).map((label, index) => ({
    key: actionKey(index, label),
    label,
  }));
}

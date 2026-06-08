export const PRIMARY_GOALS = [
  { value: "save_time", label: "Gagner du temps sur des tâches répétitives" },
  { value: "create_content", label: "Créer ou améliorer du contenu" },
  { value: "analyze_documents", label: "Analyser des documents" },
  { value: "business_strategy", label: "Améliorer mon business / ma stratégie" },
  { value: "study_research", label: "M’aider dans mes études ou ma recherche" },
  { value: "prepare_messages", label: "Préparer des emails, messages ou documents" },
  { value: "discover", label: "Découvrir ce que les agents peuvent faire" },
  { value: "unknown", label: "Autre / je ne sais pas encore" },
] as const;

export const MAIN_DOMAINS = [
  { value: "entrepreneur_startup", label: "Entrepreneur / startup" },
  { value: "freelance", label: "Freelance / indépendant" },
  { value: "marketing", label: "Marketing / communication" },
  { value: "sales", label: "Vente / prospection" },
  { value: "hr", label: "RH / recrutement" },
  { value: "study_training", label: "Études / formation" },
  { value: "legal_contracts", label: "Juridique / contrats" },
  { value: "finance_accounting", label: "Finance / comptabilité" },
  { value: "product_tech", label: "Produit / tech" },
  { value: "real_estate", label: "Immobilier" },
  { value: "administrative", label: "Administratif" },
  { value: "personal_productivity", label: "Personnel / productivité" },
  { value: "other", label: "Autre" },
] as const;

export const HELP_TYPES = [
  { value: "quick_answer", label: "Réponse rapide" },
  { value: "step_by_step", label: "Guide étape par étape" },
  { value: "detailed_analysis", label: "Analyse détaillée" },
  { value: "actionable_checklist", label: "Checklist actionnable" },
  { value: "structured_report", label: "Rapport structuré" },
  { value: "brainstorming", label: "Idées / brainstorming" },
  { value: "document_improvement", label: "Amélioration d’un document existant" },
] as const;

export const PREFERRED_OUTPUTS = [
  { value: "short_summary", label: "Synthèse courte" },
  { value: "action_plan", label: "Plan d’action" },
  { value: "checklist", label: "Checklist" },
  { value: "table", label: "Tableau" },
  { value: "ready_message", label: "Email ou message prêt à envoyer" },
  { value: "detailed_report", label: "Rapport détaillé" },
  { value: "score", label: "Score / évaluation" },
  { value: "prioritized_recommendations", label: "Recommandations classées par priorité" },
] as const;

export const GUIDANCE_LEVELS = [
  { value: "simple_direct", label: "Simple et direct" },
  { value: "step_by_step", label: "Guidé pas à pas" },
  { value: "detailed_explanations", label: "Détaillé avec explications" },
  { value: "unknown", label: "Je ne sais pas encore" },
] as const;

export const PREFERRED_LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "fr_en", label: "Français et anglais" },
  { value: "other", label: "Autre" },
] as const;

export const BETA_TUTORIAL_SLIDES = [
  {
    title: "1. Explore la marketplace",
    body: "Découvre des agents IA conçus pour des usages précis. Les agents visibles ont été validés avant publication.",
  },
  {
    title: "2. Active un agent",
    body: "Quand un agent t’intéresse, ouvre sa fiche puis active-le. En bêta, certaines activations peuvent encore être gratuites ou simplifiées.",
  },
  {
    title: "3. Utilise ton workspace",
    body: "Après activation, tu retrouves l’agent dans ton workspace avec les informations utiles pour commencer.",
  },
  {
    title: "4. Laisse un avis",
    body: "Après utilisation, tu peux laisser un avis vérifié. Ces avis aident à améliorer la qualité des agents.",
  },
] as const;

export type PrimaryGoal = (typeof PRIMARY_GOALS)[number]["value"];
export type MainDomain = (typeof MAIN_DOMAINS)[number]["value"];
export type HelpType = (typeof HELP_TYPES)[number]["value"];
export type PreferredOutput = (typeof PREFERRED_OUTPUTS)[number]["value"];
export type GuidanceLevel = (typeof GUIDANCE_LEVELS)[number]["value"];
export type PreferredLanguage = (typeof PREFERRED_LANGUAGES)[number]["value"];

export type UserOnboardingProfile = {
  primaryGoal: PrimaryGoal | null;
  mainDomain: MainDomain | null;
  preferredHelpTypes: HelpType[];
  preferredOutputs: PreferredOutput[];
  guidanceLevel: GuidanceLevel | null;
  preferredLanguage: PreferredLanguage | null;
  onboardingCompletedAt: string | null;
  onboardingSkippedAt: string | null;
  tutorialCompletedAt: string | null;
  tutorialSkippedAt: string | null;
};

export type OnboardingStep =
  | "welcome"
  | "primary_goal"
  | "main_domain"
  | "preferred_help_types"
  | "preferred_outputs"
  | "guidance_level"
  | "preferred_language"
  | "done"
  | "tutorial";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "primary_goal",
  "main_domain",
  "preferred_help_types",
  "preferred_outputs",
  "guidance_level",
  "preferred_language",
  "done",
  "tutorial",
];

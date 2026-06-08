import type {
  GuidanceLevel,
  HelpType,
  MainDomain,
  PreferredOutput,
  PrimaryGoal,
  UserOnboardingProfile,
} from "@/lib/onboarding/constants";

const primaryGoalTags: Partial<Record<PrimaryGoal, string[]>> = {
  save_time: ["productivity", "automation", "assistant"],
  create_content: ["content", "writing", "communication"],
  analyze_documents: ["document", "analysis", "review"],
  business_strategy: ["strategy", "business", "planning"],
  study_research: ["research", "education", "analysis"],
  prepare_messages: ["email", "message", "document"],
  discover: ["starter", "generalist"],
  unknown: ["starter", "generalist"],
};

const domainTags: Partial<Record<MainDomain, string[]>> = {
  entrepreneur_startup: ["startup", "business", "strategy"],
  freelance: ["freelance", "productivity", "admin"],
  marketing: ["marketing", "content", "communication"],
  sales: ["sales", "prospecting", "crm"],
  hr: ["hr", "recruitment", "cv"],
  study_training: ["education", "research", "summary"],
  legal_contracts: ["contract", "risk_review", "legal_disclaimer"],
  finance_accounting: ["finance", "accounting", "report"],
  product_tech: ["product", "tech", "spec"],
  real_estate: ["real_estate", "document", "analysis"],
  administrative: ["admin", "document", "productivity"],
  personal_productivity: ["personal", "productivity", "assistant"],
  other: ["starter", "generalist"],
};

const helpTypeTags: Partial<Record<HelpType, string[]>> = {
  quick_answer: ["quick_answer"],
  step_by_step: ["guided"],
  detailed_analysis: ["analysis"],
  actionable_checklist: ["checklist"],
  structured_report: ["report"],
  brainstorming: ["ideation"],
  document_improvement: ["document", "editing"],
};

const outputTags: Partial<Record<PreferredOutput, string[]>> = {
  short_summary: ["summary"],
  action_plan: ["action_plan"],
  checklist: ["checklist"],
  table: ["table"],
  ready_message: ["email", "message"],
  detailed_report: ["report"],
  score: ["score", "evaluation"],
  prioritized_recommendations: ["prioritization", "recommendation"],
};

const guidanceTags: Partial<Record<GuidanceLevel, string[]>> = {
  simple_direct: ["simple"],
  step_by_step: ["guided_workspace"],
  detailed_explanations: ["detailed"],
  unknown: ["starter"],
};

export function getRecommendationTags(profile: Partial<UserOnboardingProfile>) {
  const tags = new Set<string>();

  if (profile.primaryGoal) {
    primaryGoalTags[profile.primaryGoal]?.forEach((tag) => tags.add(tag));
  }

  if (profile.mainDomain) {
    domainTags[profile.mainDomain]?.forEach((tag) => tags.add(tag));
  }

  profile.preferredHelpTypes?.forEach((helpType) => {
    helpTypeTags[helpType]?.forEach((tag) => tags.add(tag));
  });

  profile.preferredOutputs?.forEach((output) => {
    outputTags[output]?.forEach((tag) => tags.add(tag));
  });

  if (profile.guidanceLevel) {
    guidanceTags[profile.guidanceLevel]?.forEach((tag) => tags.add(tag));
  }

  if (profile.preferredLanguage) {
    tags.add(`language:${profile.preferredLanguage}`);
  }

  return Array.from(tags);
}

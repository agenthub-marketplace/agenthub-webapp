"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronLeft, X } from "lucide-react";

import {
  BETA_TUTORIAL_SLIDES,
  GUIDANCE_LEVELS,
  HELP_TYPES,
  MAIN_DOMAINS,
  PREFERRED_LANGUAGES,
  PREFERRED_OUTPUTS,
  PRIMARY_GOALS,
  type GuidanceLevel,
  type HelpType,
  type MainDomain,
  type OnboardingStep,
  type PreferredLanguage,
  type PreferredOutput,
  type PrimaryGoal,
} from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Answers = {
  primaryGoal: PrimaryGoal | null;
  mainDomain: MainDomain | null;
  preferredHelpTypes: HelpType[];
  preferredOutputs: PreferredOutput[];
  guidanceLevel: GuidanceLevel | null;
  preferredLanguage: PreferredLanguage | null;
};

type ApiState = "idle" | "loading" | "submitting" | "error";

const questionSteps: OnboardingStep[] = [
  "primary_goal",
  "main_domain",
  "preferred_help_types",
  "preferred_outputs",
  "guidance_level",
  "preferred_language",
];

const initialAnswers: Answers = {
  primaryGoal: null,
  mainDomain: null,
  preferredHelpTypes: [],
  preferredOutputs: [],
  guidanceLevel: null,
  preferredLanguage: "fr",
};

async function postOnboardingAction(body: Record<string, unknown>) {
  const response = await fetch("/api/user-onboarding", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("onboarding-action-failed");
  }

  return response;
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
        active
          ? "border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[0_12px_36px_rgba(139,92,246,0.25)]"
          : "border-[#33214F] bg-[#100B1E] text-[#D9CFF0] hover:border-[#8B5CF6]/70 hover:text-white"
      )}
    >
      <span>{children}</span>
      {active && <Check className="ml-3 h-4 w-4 shrink-0" />}
    </button>
  );
}

function StepProgress({ step }: { step: OnboardingStep }) {
  const index = Math.max(0, questionSteps.indexOf(step));
  const value = step === "welcome" ? 0 : step === "done" || step === "tutorial" ? 100 : ((index + 1) / questionSteps.length) * 100;

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#2A1D45]">
      <div className="h-full rounded-full bg-[#8B5CF6] transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function UserOnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [apiState, setApiState] = useState<ApiState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recommendationTags, setRecommendationTags] = useState<string[]>([]);
  const [tutorialIndex, setTutorialIndex] = useState(0);

  const currentStepIndex = questionSteps.indexOf(step);
  const isQuestionStep = currentStepIndex >= 0;
  const isSubmitting = apiState === "submitting";

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      setApiState("loading");

      try {
        const response = await fetch("/api/user-onboarding", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("load-failed");
        }

        const payload = await response.json();

        if (!cancelled && payload?.eligible && payload?.shouldShowModal) {
          setOpen(true);
        }
      } catch {
        if (!cancelled) {
          setError(null);
        }
      } finally {
        if (!cancelled) {
          setApiState("idle");
        }
      }
    }

    loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case "primary_goal":
        return Boolean(answers.primaryGoal);
      case "main_domain":
        return Boolean(answers.mainDomain);
      case "preferred_help_types":
        return answers.preferredHelpTypes.length > 0;
      case "preferred_outputs":
        return answers.preferredOutputs.length > 0;
      case "guidance_level":
        return Boolean(answers.guidanceLevel);
      case "preferred_language":
        return Boolean(answers.preferredLanguage);
      default:
        return true;
    }
  }, [answers, step]);

  const closeModal = () => {
    setOpen(false);
  };

  const skipOnboarding = async () => {
    setApiState("submitting");
    setError(null);

    try {
      await postOnboardingAction({ action: "skip_onboarding" });
      closeModal();
    } catch {
      setError("Impossible d’enregistrer le refus pour le moment.");
    } finally {
      setApiState("idle");
    }
  };

  const showTutorialOnly = async () => {
    setApiState("submitting");
    setError(null);

    try {
      await postOnboardingAction({ action: "skip_onboarding" });
      setStep("tutorial");
    } catch {
      setError("Le tutoriel reste accessible, mais le refus n’a pas pu être enregistré.");
      setStep("tutorial");
    } finally {
      setApiState("idle");
    }
  };

  const saveProfile = async () => {
    setApiState("submitting");
    setError(null);

    try {
      const response = await postOnboardingAction({
        action: "save_profile",
        ...answers,
      });

      if (!response.ok) {
        throw new Error("save-failed");
      }

      const payload = await response.json();
      setRecommendationTags(Array.isArray(payload?.recommendationTags) ? payload.recommendationTags : []);
      setStep("done");
    } catch {
      setError("Impossible d’enregistrer vos préférences. Réessayez dans quelques secondes.");
    } finally {
      setApiState("idle");
    }
  };

  const finishTutorial = async (action: "complete_tutorial" | "skip_tutorial") => {
    setApiState("submitting");
    setError(null);

    try {
      await postOnboardingAction({ action });
    } catch {
      // Non-blocking: closing the beta tutorial should never block marketplace access.
    } finally {
      setApiState("idle");
      closeModal();
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (open && step !== "done" && step !== "tutorial") {
      void skipOnboarding();
      return;
    }

    closeModal();
  };

  const goNext = () => {
    if (!isQuestionStep) {
      return;
    }

    if (currentStepIndex === questionSteps.length - 1) {
      void saveProfile();
      return;
    }

    setStep(questionSteps[currentStepIndex + 1]);
  };

  const goBack = () => {
    if (step === "welcome") {
      return;
    }

    if (step === "tutorial") {
      setStep("done");
      return;
    }

    if (step === "done") {
      setStep(questionSteps[questionSteps.length - 1]);
      return;
    }

    if (currentStepIndex <= 0) {
      setStep("welcome");
      return;
    }

    setStep(questionSteps[currentStepIndex - 1]);
  };

  const setSingleAnswer = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const toggleArrayAnswer = <T extends HelpType | PreferredOutput>(key: "preferredHelpTypes" | "preferredOutputs", value: T) => {
    setAnswers((current) => {
      const values = current[key] as T[];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

      return { ...current, [key]: nextValues };
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideClose className="max-h-[92vh] max-w-2xl overflow-y-auto border-[#33214F] bg-[#0B0716] p-0 text-[#F5F1FA] shadow-[0_28px_120px_rgba(0,0,0,0.6)] sm:rounded-3xl">
        <div className="border-b border-[#211734] px-5 pb-4 pt-5 sm:px-7">
          <DialogHeader className="text-left">
            <p className="font-label text-[11px] text-[#A78BCF]">AgentHub bêta</p>
            <DialogTitle className="font-display text-2xl font-bold tracking-tight text-[#F5F1FA] sm:text-3xl">
              {step === "welcome" && "On vous oriente rapidement."}
              {step === "primary_goal" && "Votre objectif principal"}
              {step === "main_domain" && "Votre domaine"}
              {step === "preferred_help_types" && "Le type d’aide attendu"}
              {step === "preferred_outputs" && "Le format qui vous arrange"}
              {step === "guidance_level" && "Votre niveau de guidage"}
              {step === "preferred_language" && "Votre langue"}
              {step === "done" && "Profil prêt."}
              {step === "tutorial" && "Tutoriel bêta"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#D6C5E8]">
              {step === "welcome"
                ? "Quelques choix suffisent pour vous proposer une première direction."
                : step === "done"
                  ? "On utilisera ces préférences pour mieux classer les agents proposés."
                  : step === "tutorial"
                    ? "Quatre points courts pour comprendre la bêta."
                    : "Répondez simplement. Vous pourrez ajuster plus tard."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5">
            <StepProgress step={step} />
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7">
          {step === "welcome" && (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setStep("primary_goal")}
                className="flex min-h-16 items-center justify-between rounded-2xl border border-[#8B5CF6] bg-[#8B5CF6] px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-[#7C3AED]"
              >
                Commencer l’entretien
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={showTutorialOnly}
                disabled={isSubmitting}
                className="flex min-h-16 items-center justify-between rounded-2xl border border-[#33214F] bg-[#100B1E] px-4 py-3 text-left text-sm font-bold text-[#F5F1FA] transition-colors hover:border-[#8B5CF6]/70"
              >
                Voir seulement le tutoriel
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={skipOnboarding}
                disabled={isSubmitting}
                className="flex min-h-12 items-center justify-center rounded-2xl border border-[#33214F] px-4 py-3 text-sm font-semibold text-[#D6C5E8] transition-colors hover:bg-[#171025] hover:text-white"
              >
                Passer et voir la marketplace
              </button>
            </div>
          )}

          {step === "primary_goal" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {PRIMARY_GOALS.map((option) => (
                <OptionButton
                  key={option.value}
                  active={answers.primaryGoal === option.value}
                  onClick={() => setSingleAnswer("primaryGoal", option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          )}

          {step === "main_domain" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {MAIN_DOMAINS.map((option) => (
                <OptionButton
                  key={option.value}
                  active={answers.mainDomain === option.value}
                  onClick={() => setSingleAnswer("mainDomain", option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          )}

          {step === "preferred_help_types" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {HELP_TYPES.map((option) => (
                <OptionButton
                  key={option.value}
                  active={answers.preferredHelpTypes.includes(option.value)}
                  onClick={() => toggleArrayAnswer("preferredHelpTypes", option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          )}

          {step === "preferred_outputs" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {PREFERRED_OUTPUTS.map((option) => (
                <OptionButton
                  key={option.value}
                  active={answers.preferredOutputs.includes(option.value)}
                  onClick={() => toggleArrayAnswer("preferredOutputs", option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          )}

          {step === "guidance_level" && (
            <div className="grid gap-2">
              {GUIDANCE_LEVELS.map((option) => (
                <OptionButton
                  key={option.value}
                  active={answers.guidanceLevel === option.value}
                  onClick={() => setSingleAnswer("guidanceLevel", option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          )}

          {step === "preferred_language" && (
            <div className="grid gap-2">
              {PREFERRED_LANGUAGES.map((option) => (
                <OptionButton
                  key={option.value}
                  active={answers.preferredLanguage === option.value}
                  onClick={() => setSingleAnswer("preferredLanguage", option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          )}

          {step === "done" && (
            <div className="space-y-5">
              {recommendationTags.length > 0 && (
                <div className="rounded-2xl border border-[#33214F] bg-[#100B1E] p-4">
                  <p className="font-label text-[11px] text-[#A78BCF]">Orientation</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommendationTags.slice(0, 8).map((tag) => (
                      <span key={tag} className="rounded-full border border-[#33214F] px-3 py-1 text-xs font-semibold text-[#D6C5E8]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/agenthub/search?recommended=1";
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
                >
                  Voir les agents recommandés
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setStep("tutorial")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#33214F] px-5 text-sm font-bold text-[#F5F1FA] transition-colors hover:bg-[#171025]"
                >
                  Voir le tutoriel
                </button>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-full text-sm font-semibold text-[#A78BCF] transition-colors hover:text-white"
              >
                Continuer sans tutoriel
              </button>
            </div>
          )}

          {step === "tutorial" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#33214F] bg-[#100B1E] p-5">
                <p className="font-label text-[11px] text-[#A78BCF]">
                  {tutorialIndex + 1} / {BETA_TUTORIAL_SLIDES.length}
                </p>
                <h3 className="font-display mt-3 text-xl font-bold text-white">{BETA_TUTORIAL_SLIDES[tutorialIndex].title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#D6C5E8]">{BETA_TUTORIAL_SLIDES[tutorialIndex].body}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (tutorialIndex === BETA_TUTORIAL_SLIDES.length - 1) {
                      void finishTutorial("complete_tutorial");
                      return;
                    }

                    setTutorialIndex((current) => current + 1);
                  }}
                  disabled={isSubmitting}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
                >
                  {tutorialIndex === BETA_TUTORIAL_SLIDES.length - 1 ? "Terminer" : "Suivant"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void finishTutorial("skip_tutorial")}
                  disabled={isSubmitting}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-[#33214F] px-5 text-sm font-bold text-[#F5F1FA] transition-colors hover:bg-[#171025]"
                >
                  Passer le tutoriel
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="px-5 pb-4 text-sm text-[#FCA5A5] sm:px-7">{error}</p>}

        {isQuestionStep && (
          <div className="flex items-center justify-between gap-3 border-t border-[#211734] px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#33214F] px-4 text-sm font-semibold text-[#D6C5E8] transition-colors hover:bg-[#171025] hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={skipOnboarding}
                disabled={isSubmitting}
                className="hidden h-11 items-center rounded-xl px-4 text-sm font-semibold text-[#A78BCF] transition-colors hover:text-white sm:inline-flex"
              >
                Passer
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue || isSubmitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#110D24] transition-colors hover:bg-[#F2E9D8] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/50"
              >
                {currentStepIndex === questionSteps.length - 1 ? "Enregistrer" : "Continuer"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => handleOpenChange(false)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#33214F] bg-[#100B1E] text-[#A78BCF] transition-colors hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

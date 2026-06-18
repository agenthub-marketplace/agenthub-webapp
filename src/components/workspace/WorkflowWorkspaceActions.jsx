'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Workflow } from 'lucide-react';

import { Button } from '@/components/ui/button';
import WorkspaceNextActions from './WorkspaceNextActions';
import WorkspaceReadinessNotice from './WorkspaceReadinessNotice';
import WorkspaceRunGuidance from './WorkspaceRunGuidance';
import CopyTextButton from './CopyTextButton';
import {
  focusRunInput,
  formatRunCount,
  getLatestSuccessfulRunId,
  normalizeRunInputForReuse,
  shouldShowFullResultToggle,
  WorkspaceReviewCta,
} from './run-history-display';

const copy = {
  fr: {
    disabled: 'L’exécution workflow est désactivée pour le moment.',
    emptyHistory: 'Aucun workflow enregistré pour le moment.',
    error: 'Impossible de lancer ce workflow pour le moment.',
    currentStep: 'EN COURS',
    fallbackGuidance: 'Plan de secours',
    errors: {
      'access-not-active': 'Cet accès n’est plus actif.',
      'agent-not-approved': 'Cet agent n’est pas encore approuvé pour l’exécution.',
      'creator-not-allowlisted': 'Le créateur n’est pas autorisé pour ce type d’agent beta.',
      'missing-agent-version': 'La version approuvée de l’agent est introuvable.',
      'run-already-in-progress': 'Un workflow est déjà en cours pour cet accès.',
      'user-workflow-limit-reached': 'La limite quotidienne de workflows est atteinte pour ce compte.',
      'workflow-agent-not-enabled': 'Cet agent n’est pas configuré comme workflow.',
      'workflow-not-approved': 'Le workflow doit être approuvé avant exécution.',
      'workflow-run-create-failed': 'Le run workflow n’a pas pu être créé.',
      'workflow-runs-disabled': 'L’exécution workflow est désactivée dans cet environnement.',
      'workflow-state-load-failed': 'L’état du workflow n’a pas pu être chargé.',
      'workflow-steps-create-failed': 'Les étapes du workflow n’ont pas pu être préparées.',
      'workflow-worker-trigger-failed': 'Le worker workflow n’a pas pu être déclenché.',
    },
    history: 'Historique workflow',
    inputLabel: 'Votre demande',
    inputPlaceholder: 'Décrivez le résultat attendu et les contraintes importantes...',
    launch: 'Lancer le workflow',
    latestResult: 'Dernier résultat',
    loading: 'Workflow en cours...',
    nextActions: 'Prochaines actions',
    nextActionNow: 'À faire maintenant',
    queued: 'Workflow en file d’attente...',
    remaining: 'caractères restants',
    result: 'Résultat workflow',
    reviewCta: 'Comparer et laisser un avis',
    reviewDoneCta: 'Voir mon avis',
    reviewDoneHint: 'Avis déjà publié. Vous pouvez le retrouver dans l’onglet avis.',
    reviewHint: 'Ce workflow est stocké. Utilisez son résultat comme preuve pour un avis vérifié.',
    reuseInput: 'Réutiliser l’input',
    selectAction: 'Ajoutez votre demande, puis lancez le workflow validé par AgentHub.',
    setupGuidance: 'À préparer',
    showLess: 'Réduire',
    showLessHistory: 'Afficher moins d’historique',
    showMore: 'Voir le résultat complet',
    showMoreHistory: 'Voir plus de workflows',
    successGuidance: 'Résultat attendu',
    trustGuidance: 'Points de vigilance',
    stepOutput: 'Résultat étape',
    stepsTitle: 'Progression des étapes',
    stepTypes: {
      llm_step: 'Décision LLM',
      webhook_step: 'Webhook creator',
    },
    title: 'Lancer le workflow',
  },
  en: {
    disabled: 'Agent workflow runtime is disabled right now.',
    emptyHistory: 'No workflow history yet.',
    error: 'Unable to run this workflow right now.',
    currentStep: 'CURRENT',
    fallbackGuidance: 'Fallback path',
    errors: {
      'access-not-active': 'This access is no longer active.',
      'agent-not-approved': 'This agent is not approved for execution yet.',
      'creator-not-allowlisted': 'The creator is not allowed for this beta runtime.',
      'missing-agent-version': 'The approved agent version is missing.',
      'run-already-in-progress': 'A workflow is already running for this access.',
      'user-workflow-limit-reached': 'The daily workflow limit has been reached for this account.',
      'workflow-agent-not-enabled': 'This agent is not configured as a workflow.',
      'workflow-not-approved': 'The workflow must be approved before execution.',
      'workflow-run-create-failed': 'The workflow run could not be created.',
      'workflow-runs-disabled': 'Workflow runtime is disabled in this environment.',
      'workflow-state-load-failed': 'Workflow state could not be loaded.',
      'workflow-steps-create-failed': 'Workflow steps could not be prepared.',
      'workflow-worker-trigger-failed': 'The workflow worker could not be triggered.',
    },
    history: 'Workflow history',
    inputLabel: 'Your request',
    inputPlaceholder: 'Describe the expected outcome and important constraints...',
    launch: 'Run workflow',
    latestResult: 'Latest result',
    loading: 'Workflow running...',
    nextActions: 'Next actions',
    nextActionNow: 'Do now',
    queued: 'Workflow queued...',
    remaining: 'characters remaining',
    result: 'Workflow result',
    reviewCta: 'Compare and leave review',
    reviewDoneCta: 'View my review',
    reviewDoneHint: 'Review already published. You can find it in the review tab.',
    reviewHint: 'This workflow result is stored. Use it as proof for a verified review.',
    reuseInput: 'Reuse input',
    selectAction: 'Add your request, then run the AgentHub-reviewed workflow.',
    setupGuidance: 'Prepare',
    showLess: 'Collapse',
    showLessHistory: 'Show less history',
    showMore: 'View full result',
    showMoreHistory: 'Show more workflows',
    successGuidance: 'Expected result',
    trustGuidance: 'Watch points',
    stepOutput: 'Step output',
    stepsTitle: 'Step progress',
    stepTypes: {
      llm_step: 'LLM decision',
      webhook_step: 'Creator webhook',
    },
    title: 'Run workflow',
  },
};

function formatDate(value, locale) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function statusLabel(status, locale) {
  const labels = {
    en: {
      failed: 'Failed',
      queued: 'Queued',
      running: 'Running',
      succeeded: 'Done',
    },
    fr: {
      failed: 'Échec',
      queued: 'En file d’attente',
      running: 'En cours',
      succeeded: 'Terminé',
    },
  };

  return labels[locale]?.[status] ?? status;
}

function errorLabel(errorCode, t) {
  if (!errorCode) {
    return t.error;
  }

  return t.errors?.[errorCode] ?? errorCode;
}

function WorkflowStepProgress({ locale, t, workflowRun }) {
  const steps = workflowRun?.steps ?? [];

  if (!steps.length) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
      <p className="font-label mb-3 text-xs text-[#9B72CF]">{t.stepsTitle}</p>
      <ol className="space-y-3">
        {steps.map((step) => {
          const isCurrent =
            ['queued', 'running'].includes(workflowRun.status) &&
            step.stepIndex === workflowRun.currentStepIndex;
          const statusClass =
            step.status === 'succeeded'
              ? 'border-[#10B981]/30 bg-[#071611] text-[#6EE7B7]'
              : step.status === 'failed'
                ? 'border-[#EF4444]/35 bg-[#1A0810] text-[#FCA5A5]'
                : step.status === 'running' || isCurrent
                  ? 'border-[#F59E0B]/35 bg-[#1A1208] text-[#F6C177]'
                  : 'border-[#2F184B] bg-[#0F0A1E] text-[#C8B1E4]';

          return (
            <li key={step.id ?? `${step.stepIndex}-${step.stepKey}`} className={`rounded-2xl border p-3 ${statusClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#F4EFFA]">
                    {step.stepIndex + 1}. {step.stepLabel}
                  </p>
                  <p className="mt-1 text-xs">
                    {t.stepTypes?.[step.stepType] ?? step.stepType} · {statusLabel(step.status, locale)}
                  </p>
                </div>
                {isCurrent && <span className="rounded-full border border-[#F59E0B]/40 px-2 py-1 text-[10px] font-label">{t.currentStep}</span>}
              </div>
              {step.errorCode && <p className="mt-2 text-xs">{errorLabel(step.errorCode, t)}</p>}
              {step.outputText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold">{t.stepOutput}</summary>
                  <p className="mt-2 line-clamp-5 whitespace-pre-line text-xs leading-5 text-[#C8B1E4]">{step.outputText}</p>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function WorkflowWorkspaceActions({
  enabled = false,
  fallbackPath = [],
  disabledMessage,
  hasReview = false,
  initialRuns = [],
  locale = 'fr',
  maxInputChars = 4000,
  nextActions = [],
  readiness = null,
  rentalId,
  setupChecklist = [],
  successCriteria = [],
  trustWarnings = [],
}) {
  const t = copy[locale] ?? copy.fr;
  const [inputText, setInputText] = useState('');
  const [runs, setRuns] = useState(initialRuns);
  const [workflowRun, setWorkflowRun] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRunIds, setExpandedRunIds] = useState([]);
  const [visibleRunCount, setVisibleRunCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const submittedInputRef = useRef('');
  const reviewCtaLabel = hasReview ? t.reviewDoneCta : t.reviewCta;
  const reviewCtaHint = hasReview ? t.reviewDoneHint : t.reviewHint;
  const remainingChars = maxInputChars - inputText.length;
  const runningRun = runs.find((run) => ['queued', 'running'].includes(run.status));
  const activeWorkflowRun = workflowRun && ['queued', 'running'].includes(workflowRun.status) ? workflowRun : null;
  const activeRunId = activeWorkflowRun?.agentRunId ?? runningRun?.id;
  const activeStatus = activeWorkflowRun?.status ?? runningRun?.status;
  const canSubmit = enabled && inputText.trim().length >= 3 && !isSubmitting && !activeRunId;
  const latestSuccessfulRunId = getLatestSuccessfulRunId(runs);
  const visibleRuns = runs.slice(0, visibleRunCount);

  useEffect(() => {
    if (!activeRunId || !['queued', 'running'].includes(activeStatus)) {
      return undefined;
    }

    async function pollWorkflowRun() {
      try {
        const response = await fetch(`/api/agent-runs/workflow?runId=${encodeURIComponent(activeRunId)}`, {
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok || !data.workflowRun) {
          return;
        }

        setWorkflowRun(data.workflowRun);

        if (data.workflowRun.status === 'succeeded') {
          const completedRunInput = submittedInputRef.current || runningRun?.inputText || '';
          setResult(data.workflowRun.finalOutput);
          setRuns((current) =>
            [
              {
                actionLabel: 'Agent workflow',
                completedAt: data.workflowRun.completedAt,
                createdAt: data.workflowRun.createdAt,
                errorCode: null,
                id: data.workflowRun.agentRunId,
                inputText: completedRunInput,
                outputText: data.workflowRun.finalOutput,
                status: 'succeeded',
              },
              ...current.filter((run) => run.id !== data.workflowRun.agentRunId),
            ],
          );
        }

        if (data.workflowRun.status === 'failed') {
          const failedRunInput = submittedInputRef.current || runningRun?.inputText || '';
          setError(errorLabel(data.workflowRun.errorCode, t));
          setRuns((current) =>
            [
              {
                actionLabel: 'Agent workflow',
                completedAt: data.workflowRun.completedAt,
                createdAt: data.workflowRun.createdAt,
                errorCode: data.workflowRun.errorCode,
                id: data.workflowRun.agentRunId,
                inputText: failedRunInput,
                outputText: null,
                status: 'failed',
              },
              ...current.filter((run) => run.id !== data.workflowRun.agentRunId),
            ],
          );
        }
      } catch {
        // Keep polling; transient worker/status errors are common during beta.
      }
    }

    pollWorkflowRun();
    const timer = setInterval(pollWorkflowRun, 2500);

    return () => clearInterval(timer);
  }, [activeRunId, activeStatus, runningRun?.inputText, t]);

  async function submitRun(event) {
    event.preventDefault();

    if (!canSubmit || submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setError(null);
    setResult(null);
    setWorkflowRun(null);
    setIsSubmitting(true);
    const submittedInput = inputText.trim();
    submittedInputRef.current = submittedInput;

    try {
      const response = await fetch('/api/agent-runs/workflow', {
        body: JSON.stringify({
          inputText: submittedInput,
          locale,
          rentalId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data.workflowRun) {
        setError(errorLabel(data.error, t));
        return;
      }

      setWorkflowRun(data.workflowRun);

      if (data.workflowRun.status === 'succeeded') {
        setResult(data.workflowRun.finalOutput);
        setRuns((current) =>
          [
            {
              actionLabel: 'Agent workflow',
              completedAt: data.workflowRun.completedAt,
              createdAt: data.workflowRun.createdAt,
              errorCode: null,
              id: data.workflowRun.agentRunId,
              inputText: submittedInput,
              outputText: data.workflowRun.finalOutput,
              status: 'succeeded',
            },
            ...current.filter((run) => run.id !== data.workflowRun.agentRunId),
          ],
        );
        setInputText('');
      }
    } catch {
      setError(t.error);
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  function toggleRun(runId) {
    setExpandedRunIds((current) =>
      current.includes(runId) ? current.filter((id) => id !== runId) : [...current, runId],
    );
  }

  function reuseRunInput(runInput) {
    const normalizedInput = normalizeRunInputForReuse(runInput, maxInputChars);

    if (normalizedInput) {
      setInputText(normalizedInput);
      window.requestAnimationFrame(() => focusRunInput(inputRef.current));
    }
  }

  return (
    <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
          <Workflow className="h-5 w-5" />
        </div>
        <div>
          <p className="font-label mb-2 text-xs text-[#9B72CF]">WORKFLOW AUTOMATION BETA</p>
          <h2 className="font-display text-xl font-bold text-[#F4EFFA]">{t.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">{enabled ? t.selectAction : disabledMessage || t.disabled}</p>
        </div>
      </div>

      <WorkspaceReadinessNotice
        disabledMessage={disabledMessage || t.disabled}
        locale={locale}
        readiness={readiness}
        showDisabledMessage={!enabled}
      />

      <WorkspaceNextActions focusTitle={t.nextActionNow} items={nextActions} title={t.nextActions} />

      <WorkspaceRunGuidance
        fallbackItems={fallbackPath}
        fallbackTitle={t.fallbackGuidance}
        setupItems={setupChecklist}
        setupTitle={t.setupGuidance}
        successItems={successCriteria}
        successTitle={t.successGuidance}
        warningItems={trustWarnings}
        warningTitle={t.trustGuidance}
      />

      {enabled && (
        <form onSubmit={submitRun} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[#A78BCF]">{t.inputLabel}</span>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(event) => {
                const value = event.target.value;
                if (value.length <= maxInputChars) {
                  setInputText(value);
                }
              }}
              rows={4}
              minLength={3}
              maxLength={maxInputChars}
              placeholder={t.inputPlaceholder}
              className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F] focus:border-[#7C3AED]"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`text-xs ${remainingChars < 100 ? 'text-[#F59E0B]' : 'text-[#7F6B9C]'}`}>
              {remainingChars} {t.remaining}
            </p>
            <Button type="submit" disabled={!canSubmit} className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? t.queued : t.launch}
            </Button>
          </div>
        </form>
      )}

      {workflowRun && ['queued', 'running'].includes(workflowRun.status) && (
        <div className="mt-4 rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
          {workflowRun.status === 'queued' ? t.queued : t.loading}
        </div>
      )}

      {workflowRun && <WorkflowStepProgress locale={locale} t={t} workflowRun={workflowRun} />}

      {error && (
        <div className="mt-4 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-2xl border border-[#10B981]/30 bg-[#07130F] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-label text-xs text-[#6EE7B7]">{t.result}</p>
            <CopyTextButton
              copiedLabel={locale === 'en' ? 'Copied' : 'Copié'}
              errorLabel={locale === 'en' ? 'Copy failed' : 'Copie impossible'}
              label={locale === 'en' ? 'Copy' : 'Copier'}
              text={result}
            />
          </div>
          <div className="whitespace-pre-line text-sm leading-relaxed text-[#D6C5E8]">{result}</div>
          <WorkspaceReviewCta hint={reviewCtaHint} label={reviewCtaLabel} locale={locale} rentalId={rentalId} />
        </div>
      )}

      <div className="mt-6 border-t border-[#2F184B] pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-label text-xs text-[#9B72CF]">{t.history}</p>
          {runs.length > 0 && (
            <span className="rounded-full border border-[#2F184B] px-2.5 py-1 text-[10px] font-label text-[#9B72CF]">
              {formatRunCount(runs.length, locale)}
            </span>
          )}
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-[#7F6B9C]">{t.emptyHistory}</p>
        ) : (
          <div className="space-y-3">
            {visibleRuns.map((run) => {
              const expanded = expandedRunIds.includes(run.id);
              const canExpand = run.status === 'succeeded' && shouldShowFullResultToggle(run.outputText);
              const isLatestSuccessfulRun = run.id === latestSuccessfulRunId;

              return (
                <article key={run.id} className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold text-[#F4EFFA]">{run.actionLabel}</p>
                      {isLatestSuccessfulRun && (
                        <span className="rounded-full border border-[#10B981]/35 bg-[#10B981]/10 px-2 py-1 text-[10px] font-label text-[#6EE7B7]">
                          {t.latestResult}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full border border-[#2F184B] px-2 py-1 text-[10px] font-label text-[#9B72CF]">
                      {statusLabel(run.status, locale)}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-[#7F6B9C]">{formatDate(run.completedAt || run.createdAt, locale)}</p>
                  {run.status === 'succeeded' && run.outputText ? (
                    <>
                      <p className={`${expanded ? '' : 'line-clamp-5'} whitespace-pre-line text-sm leading-relaxed text-[#C8B1E4]`}>
                        {run.outputText}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {canExpand && (
                          <button
                            type="button"
                            onClick={() => toggleRun(run.id)}
                            className="inline-flex items-center gap-1 text-xs font-label text-[#9B72CF] hover:text-[#F4EFFA]"
                          >
                            {expanded ? t.showLess : t.showMore}
                            <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                        <CopyTextButton
                          copiedLabel={locale === 'en' ? 'Copied' : 'Copié'}
                          errorLabel={locale === 'en' ? 'Copy failed' : 'Copie impossible'}
                          label={locale === 'en' ? 'Copy' : 'Copier'}
                          text={run.outputText}
                        />
                        {run.inputText && (
                          <button
                            type="button"
                            onClick={() => reuseRunInput(run.inputText)}
                            className="inline-flex rounded-full border border-[#2F184B] px-2.5 py-1 text-xs font-label text-[#9B72CF] transition-colors hover:border-[#6B3FA0] hover:text-[#F4EFFA]"
                          >
                            {t.reuseInput}
                          </button>
                        )}
                        {isLatestSuccessfulRun && (
                          <WorkspaceReviewCta compact label={reviewCtaLabel} locale={locale} rentalId={rentalId} />
                        )}
                      </div>
                    </>
                  ) : run.status === 'failed' ? (
                    <p className="text-sm text-[#FCA5A5]">{errorLabel(run.errorCode, t)}</p>
                  ) : (
                    <p className="text-sm text-[#F59E0B]">{t.loading}</p>
                  )}
                </article>
              );
            })}
            {runs.length > 5 && (
              <button
                type="button"
                onClick={() => setVisibleRunCount((current) => (current >= runs.length ? 5 : Math.min(runs.length, current + 5)))}
                className="inline-flex rounded-xl border border-[#2F184B] px-3 py-2 text-xs font-label text-[#9B72CF] transition-colors hover:border-[#6B3FA0] hover:text-[#F4EFFA]"
              >
                {visibleRunCount >= runs.length ? t.showLessHistory : t.showMoreHistory}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

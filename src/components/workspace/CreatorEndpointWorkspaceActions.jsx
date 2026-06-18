'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, PlugZap } from 'lucide-react';

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
    pending: 'Un appel API est en attente de traitement...',
    queued: 'Un appel API est en file d’attente...',
    disabled: 'L’agent API créateur est désactivé pour le moment.',
    emptyHistory: 'Aucun appel API enregistré pour le moment.',
    error: 'Impossible d’envoyer cette demande à l’agent API pour le moment.',
    fallbackGuidance: 'Plan de secours',
    errors: {
      'creator-endpoint-invalid-json': 'L’API créateur a répondu dans un format invalide. Le créateur doit retourner un JSON avec output_text.',
      'creator-endpoint-missing-output': 'L’API créateur n’a pas retourné de résultat exploitable.',
      'creator-endpoint-not-approved': 'L’API créateur n’est pas encore approuvée par l’admin.',
      'creator-endpoint-response-too-large': 'La réponse de l’API créateur dépasse la limite beta.',
      'creator-endpoint-runtime-disabled': 'L’exécution Agent API est désactivée pour ce type d’agent.',
      'creator-endpoint-signing-secret-missing': 'La signature serveur AgentHub n’est pas configurée.',
      'creator-endpoint-timeout-or-network': 'L’API créateur ne répond pas ou a dépassé le délai beta.',
      'creator-endpoint-url-not-safe': 'L’URL de l’API créateur ne respecte pas les règles de sécurité.',
      'creator-endpoint-redirect-blocked': 'L’API créateur a tenté une redirection, ce qui est bloqué en beta.',
      'run-already-in-progress': 'Un appel Agent API est déjà en cours pour cet accès.',
      'user-endpoint-limit-reached': 'La limite quotidienne d’appels Agent API est atteinte pour ce compte.',
      'rental-endpoint-limit-reached': 'La limite quotidienne d’appels Agent API est atteinte pour cet accès.',
    },
    history: 'Historique agent API',
    inputLabel: 'Votre demande',
    inputPlaceholder: 'Décrivez le résultat attendu et les contraintes importantes...',
    launch: 'Envoyer à l’agent',
    latestResult: 'Dernier résultat',
    loading: 'Agent API en cours...',
    nextActions: 'Prochaines actions',
    nextActionNow: 'À faire maintenant',
    running: 'Un appel agent API est déjà en cours...',
    remaining: 'caractères restants',
    result: 'Résultat agent API',
    reviewCta: 'Comparer et laisser un avis',
    reviewDoneCta: 'Voir mon avis',
    reviewDoneHint: 'Avis déjà publié. Vous pouvez le retrouver dans l’onglet avis.',
    reviewHint: 'Ce résultat API est stocké. Utilisez-le comme base pour un avis vérifié.',
    reuseInput: 'Réutiliser l’input',
    selectAction: 'Ajoutez votre demande. AgentHub appellera l’API créateur approuvée côté serveur, avec signature et historique conservé ici.',
    setupGuidance: 'À préparer',
    showLess: 'Réduire',
    showLessHistory: 'Afficher moins d’historique',
    showMore: 'Voir le résultat complet',
    showMoreHistory: 'Voir plus d’appels API',
    successGuidance: 'Résultat attendu',
    trustGuidance: 'Points de vigilance',
    title: 'Agent API créateur',
  },
  en: {
    pending: 'An API call is waiting to be processed...',
    disabled: 'The creator API agent is disabled right now.',
    emptyHistory: 'No API agent history yet.',
    error: 'Unable to send this request to the API agent right now.',
    fallbackGuidance: 'Fallback path',
    errors: {
      'creator-endpoint-invalid-json': 'The creator API returned invalid JSON. It must return output_text.',
      'creator-endpoint-missing-output': 'The creator API did not return a usable result.',
      'creator-endpoint-not-approved': 'The creator API is not approved by an admin yet.',
      'creator-endpoint-response-too-large': 'The creator API response is above the beta limit.',
      'creator-endpoint-runtime-disabled': 'API agent execution is disabled for this runtime.',
      'creator-endpoint-signing-secret-missing': 'The AgentHub server signature is not configured.',
      'creator-endpoint-timeout-or-network': 'The creator API did not respond or exceeded the beta timeout.',
      'creator-endpoint-url-not-safe': 'The creator API URL does not meet the security rules.',
      'creator-endpoint-redirect-blocked': 'The creator API attempted a redirect, which is blocked in beta.',
      'run-already-in-progress': 'An API agent call is already running for this access.',
      'user-endpoint-limit-reached': 'The daily API agent limit has been reached for this account.',
      'rental-endpoint-limit-reached': 'The daily API agent limit has been reached for this access.',
    },
    history: 'API agent history',
    inputLabel: 'Your request',
    inputPlaceholder: 'Describe the expected outcome and important constraints...',
    launch: 'Send to agent',
    latestResult: 'Latest result',
    loading: 'API agent running...',
    nextActions: 'Next actions',
    nextActionNow: 'Do now',
    running: 'An API call is already running...',
    queued: 'An API call is queued and waiting to start...',
    remaining: 'characters remaining',
    result: 'API agent result',
    reviewCta: 'Compare and leave review',
    reviewDoneCta: 'View my review',
    reviewDoneHint: 'Review already published. You can find it in the review tab.',
    reviewHint: 'This API result is stored. Use it as the basis for a verified review.',
    reuseInput: 'Reuse input',
    selectAction: 'Add your request. AgentHub will call the approved creator API server-side, with signing and history kept here.',
    setupGuidance: 'Prepare',
    showLess: 'Collapse',
    showLessHistory: 'Show less history',
    showMore: 'View full result',
    showMoreHistory: 'Show more API calls',
    successGuidance: 'Expected result',
    trustGuidance: 'Watch points',
    title: 'Creator API agent',
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
      pending: 'Queued',
      failed: 'Failed',
      running: 'Running',
      queued: 'Queued',
      succeeded: 'Done',
    },
    fr: {
      pending: 'En attente',
      failed: 'Échec',
      running: 'En cours',
      queued: 'En file d’attente',
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

export default function CreatorEndpointWorkspaceActions({
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
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRunIds, setExpandedRunIds] = useState([]);
  const [visibleRunCount, setVisibleRunCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const reviewCtaLabel = hasReview ? t.reviewDoneCta : t.reviewCta;
  const reviewCtaHint = hasReview ? t.reviewDoneHint : t.reviewHint;
  const remainingChars = maxInputChars - inputText.length;
  const activeRunId = runs.find((run) => ['pending', 'queued', 'running'].includes(run.status))?.id;
  const canSubmit = enabled && inputText.trim().length >= 3 && !isSubmitting && !activeRunId;
  const latestSuccessfulRunId = getLatestSuccessfulRunId(runs);
  const visibleRuns = runs.slice(0, visibleRunCount);

  useEffect(() => {
    if (!activeRunId) {
      return undefined;
    }

    async function pollActiveRun() {
      try {
        const response = await fetch(`/api/agent-runs/endpoint?runId=${encodeURIComponent(activeRunId)}`, {
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok || !data.run) {
          return;
        }

        setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)]);

        if (data.run.status === 'succeeded') {
          setResult(data.run.outputText);
          setError(null);
        }

        if (data.run.status === 'failed') {
          setError(errorLabel(data.run.errorCode, t));
        }
      } catch {
        // Keep polling; endpoint status can be transient during beta.
      }
    }

    pollActiveRun();
    const timer = setInterval(pollActiveRun, 2500);

    return () => clearInterval(timer);
  }, [activeRunId, t]);

  async function submitRun(event) {
    event.preventDefault();

    if (!canSubmit || submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/agent-runs/endpoint', {
        body: JSON.stringify({
          inputText,
          locale,
          rentalId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok && data.status === 'running' && data.run) {
        setError(null);
        setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)]);
        setResult(null);
        return;
      }

      if (!response.ok || data.status !== 'succeeded') {
        setError(errorLabel(data.error, t));
        if (data.run) {
          setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)]);
        }
        return;
      }

      setResult(data.outputText);
      setInputText('');

      if (data.run) {
        setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)]);
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
          <PlugZap className="h-5 w-5" />
        </div>
        <div>
          <p className="font-label mb-2 text-xs text-[#9B72CF]">
            {locale === 'en' ? 'CREATOR API AGENT' : 'AGENT API CRÉATEUR'}
          </p>
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
              {isSubmitting ? t.loading : t.launch}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
          {error}
        </div>
      )}

      {runs.some((run) => ['pending', 'queued', 'running'].includes(run.status)) && !error && (
        <div className="mt-4 rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
          {runs.some((run) => run.status === 'pending')
            ? t.pending
            : runs.some((run) => run.status === 'queued')
              ? t.queued
              : t.running}
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

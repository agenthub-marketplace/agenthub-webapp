'use client';

import { useState } from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import WorkspaceNextActions from './WorkspaceNextActions';
import WorkspaceReadinessNotice from './WorkspaceReadinessNotice';
import WorkspaceRunGuidance from './WorkspaceRunGuidance';

const copy = {
  fr: {
    actionSoon: 'Génération IA bientôt disponible pour cet assistant.',
    disabled: 'Ces actions restent des repères statiques pour le moment.',
    emptyHistory: 'Aucune exécution enregistrée pour le moment.',
    error: 'Impossible de générer cette réponse pour le moment.',
    fallbackGuidance: 'Plan de secours',
    history: 'Historique d’exécution',
    inputLabel: 'Votre besoin',
    inputPlaceholder: 'Décrivez ce que vous voulez obtenir avec cet assistant...',
    launch: 'Générer la réponse',
    loading: 'Génération en cours...',
    nextActions: 'Prochaines actions',
    nextActionNow: 'À faire maintenant',
    remaining: 'caractères restants',
    result: 'Résultat généré',
    selectAction: 'Choisissez une action, ajoutez votre contexte, puis générez une réponse.',
    setupGuidance: 'À préparer',
    showLess: 'Réduire',
    showLessHistory: 'Afficher moins d’historique',
    showMore: 'Voir le résultat complet',
    showMoreHistory: 'Voir plus d’exécutions',
    successGuidance: 'Résultat attendu',
    trustGuidance: 'Points de vigilance',
    title: 'Démarrer avec cet assistant',
  },
  en: {
    actionSoon: 'AI generation will be available soon for this assistant.',
    disabled: 'These actions are static starting points for now.',
    emptyHistory: 'No execution history yet.',
    error: 'Unable to generate this response right now.',
    fallbackGuidance: 'Fallback path',
    history: 'Execution history',
    inputLabel: 'Your need',
    inputPlaceholder: 'Describe what you want to get from this assistant...',
    launch: 'Generate response',
    loading: 'Generating...',
    nextActions: 'Next actions',
    nextActionNow: 'Do now',
    remaining: 'characters remaining',
    result: 'Generated result',
    selectAction: 'Choose an action, add context, then generate a response.',
    setupGuidance: 'Prepare',
    showLess: 'Collapse',
    showLessHistory: 'Show less history',
    showMore: 'View full result',
    showMoreHistory: 'Show more runs',
    successGuidance: 'Expected result',
    trustGuidance: 'Watch points',
    title: 'Start with this assistant',
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
      queued: 'Queued',
      failed: 'Failed',
      running: 'Running',
      succeeded: 'Done',
    },
    fr: {
      queued: 'En file d’attente',
      failed: 'Échec',
      running: 'En cours',
      succeeded: 'Terminé',
    },
  };

  return labels[locale]?.[status] ?? status;
}

export default function WorkspaceRunActions({
  actions = [],
  enabled = false,
  fallbackPath = [],
  disabledMessage,
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [runs, setRuns] = useState(initialRuns);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRunIds, setExpandedRunIds] = useState([]);
  const [visibleRunCount, setVisibleRunCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedAction = actions[selectedIndex] ?? actions[0] ?? null;
  const canSubmit = enabled && selectedAction && inputText.trim().length >= 3 && !isSubmitting;
  const remainingChars = maxInputChars - inputText.length;
  const visibleRuns = runs.slice(0, visibleRunCount);

  async function submitRun(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/agent-runs', {
        body: JSON.stringify({
          actionIndex: selectedIndex,
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

      if (!response.ok || data.status !== 'succeeded') {
        setError(data.error || t.error);

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
      setIsSubmitting(false);
    }
  }

  function toggleRun(runId) {
    setExpandedRunIds((current) =>
      current.includes(runId) ? current.filter((id) => id !== runId) : [...current, runId],
    );
  }

  return (
    <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-label mb-2 text-xs text-[#9B72CF]">{enabled ? 'ASSISTANT IA GUIDÉ' : 'ACCES DIRECT'}</p>
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

      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((action, index) => (
          <button
            key={action.key ?? action.label}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={`rounded-xl border px-3 py-3 text-left text-xs font-label transition ${
              enabled && selectedIndex === index
                ? 'border-[#8B5CF6] bg-[#1A1130] text-[#F4EFFA]'
                : 'border-[#2F184B] bg-[#080612] text-[#C8B1E4] hover:border-[#6B3FA0]'
            }`}
          >
            <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1130] text-[11px] text-[#9B72CF]">
              {index + 1}
            </span>
            {action.label}
          </button>
        ))}
      </div>

      {!enabled && <p className="mt-3 text-xs text-[#7F6B9C]">{t.actionSoon}</p>}

      {enabled && (
        <form onSubmit={submitRun} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[#A78BCF]">{t.inputLabel}</span>
            <textarea
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

      {result && (
        <div className="mt-5 rounded-2xl border border-[#10B981]/30 bg-[#07130F] p-4">
          <p className="font-label mb-2 text-xs text-[#6EE7B7]">{t.result}</p>
          <div className="whitespace-pre-line text-sm leading-relaxed text-[#D6C5E8]">{result}</div>
        </div>
      )}

      <div className="mt-6 border-t border-[#2F184B] pt-5">
        <p className="font-label mb-3 text-xs text-[#9B72CF]">{t.history}</p>
        {runs.length === 0 ? (
          <p className="text-sm text-[#7F6B9C]">{t.emptyHistory}</p>
        ) : (
          <div className="space-y-3">
            {visibleRuns.map((run) => {
              const expanded = expandedRunIds.includes(run.id);
              const canExpand = run.status === 'succeeded' && run.outputText;

              return (
              <article key={run.id} className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-sm font-bold text-[#F4EFFA]">{run.actionLabel}</p>
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
                    {canExpand && (
                      <button
                        type="button"
                        onClick={() => toggleRun(run.id)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-label text-[#9B72CF] hover:text-[#F4EFFA]"
                      >
                        {expanded ? t.showLess : t.showMore}
                        <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </>
                ) : run.status === 'failed' ? (
                  <p className="text-sm text-[#FCA5A5]">{run.errorCode || t.error}</p>
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

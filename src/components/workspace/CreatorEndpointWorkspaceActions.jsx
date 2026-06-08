'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Loader2, PlugZap } from 'lucide-react';

import { Button } from '@/components/ui/button';

const copy = {
  fr: {
    disabled: 'Le runtime endpoint creator est désactivé pour le moment.',
    emptyHistory: 'Aucun appel endpoint enregistré pour le moment.',
    error: 'Impossible d’appeler cet endpoint pour le moment.',
    history: 'Historique endpoint',
    inputLabel: 'Votre demande',
    inputPlaceholder: 'Décrivez le résultat attendu et les contraintes importantes...',
    launch: 'Appeler l’endpoint',
    loading: 'Endpoint en cours...',
    running: 'Un appel endpoint est déjà en cours...',
    remaining: 'caractères restants',
    result: 'Résultat endpoint',
    selectAction: 'Ajoutez votre demande, puis AgentHub appelle l’endpoint approuvé côté serveur.',
    showLess: 'Réduire',
    showMore: 'Voir le résultat complet',
    title: 'Endpoint creator',
  },
  en: {
    disabled: 'Creator endpoint runtime is disabled right now.',
    emptyHistory: 'No endpoint call history yet.',
    error: 'Unable to call this endpoint right now.',
    history: 'Endpoint history',
    inputLabel: 'Your request',
    inputPlaceholder: 'Describe the expected outcome and important constraints...',
    launch: 'Call endpoint',
    loading: 'Endpoint running...',
    running: 'An endpoint call is already running...',
    remaining: 'characters remaining',
    result: 'Endpoint result',
    selectAction: 'Add your request, then AgentHub calls the approved endpoint server-side.',
    showLess: 'Collapse',
    showMore: 'View full result',
    title: 'Creator endpoint',
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
      running: 'Running',
      succeeded: 'Done',
    },
    fr: {
      failed: 'Échec',
      running: 'En cours',
      succeeded: 'Terminé',
    },
  };

  return labels[locale]?.[status] ?? status;
}

export default function CreatorEndpointWorkspaceActions({
  enabled = false,
  initialRuns = [],
  locale = 'fr',
  maxInputChars = 4000,
  rentalId,
}) {
  const t = copy[locale] ?? copy.fr;
  const [inputText, setInputText] = useState('');
  const [runs, setRuns] = useState(initialRuns);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRunIds, setExpandedRunIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remainingChars = maxInputChars - inputText.length;
  const latestRuns = useMemo(() => runs.slice(0, 5), [runs]);
  const canSubmit = enabled && inputText.trim().length >= 3 && !isSubmitting;

  async function submitRun(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

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
        setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)].slice(0, 5));
        setResult(null);
        return;
      }

      if (!response.ok || data.status !== 'succeeded') {
        setError(data.error || t.error);
        if (data.run) {
          setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)].slice(0, 5));
        }
        return;
      }

      setResult(data.outputText);
      setInputText('');

      if (data.run) {
        setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)].slice(0, 5));
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
          <PlugZap className="h-5 w-5" />
        </div>
        <div>
          <p className="font-label mb-2 text-xs text-[#9B72CF]">CREATOR ENDPOINT BETA</p>
          <h2 className="font-display text-xl font-bold text-[#F4EFFA]">{t.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">{enabled ? t.selectAction : t.disabled}</p>
        </div>
      </div>

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

      {latestRuns.some((run) => run.status === 'running') && !error && (
        <div className="mt-4 rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
          {t.running}
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
        {latestRuns.length === 0 ? (
          <p className="text-sm text-[#7F6B9C]">{t.emptyHistory}</p>
        ) : (
          <div className="space-y-3">
            {latestRuns.map((run) => {
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
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, FileText, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';

const copy = {
  fr: {
    accepted: 'PDF/DOCX uniquement, 3.5 MB maximum. Pas d’OCR pour les PDF scannés en beta.',
    disabled: 'Le runtime document est désactivé pour le moment.',
    emptyHistory: 'Aucune analyse de document enregistrée pour le moment.',
    error: 'Impossible de traiter ce document pour le moment.',
    extracted: 'Document extrait. Vous pouvez lancer une action.',
    fileLabel: 'Document PDF ou DOCX',
    history: 'Historique document',
    inputLabel: 'Instruction courte',
    inputPlaceholder: 'Exemple : résume les décisions et actions importantes...',
    launch: 'Lancer l’analyse',
    loading: 'Analyse en cours...',
    noSensitive: 'N’ajoutez pas de documents sensibles réels pendant la beta.',
    remaining: 'caractères restants',
    result: 'Résultat généré',
    selectAction: 'Ajoutez un document, choisissez une action, puis lancez l’analyse.',
    showLess: 'Réduire',
    showMore: 'Voir le résultat complet',
    showMoreRuns: 'Voir plus d’analyses',
    title: 'Ajouter un document',
    upload: 'Extraire le document',
    uploading: 'Upload et extraction...',
  },
  en: {
    accepted: 'PDF/DOCX only, 3.5 MB maximum. No OCR for scanned PDFs in beta.',
    disabled: 'Document runtime is disabled right now.',
    emptyHistory: 'No document analysis history yet.',
    error: 'Unable to process this document right now.',
    extracted: 'Document extracted. You can run an action.',
    fileLabel: 'PDF or DOCX document',
    history: 'Document history',
    inputLabel: 'Short instruction',
    inputPlaceholder: 'Example: summarize the key decisions and action items...',
    launch: 'Run analysis',
    loading: 'Analyzing...',
    noSensitive: 'Do not upload real sensitive documents during beta.',
    remaining: 'characters remaining',
    result: 'Generated result',
    selectAction: 'Add a document, choose an action, then run the analysis.',
    showLess: 'Collapse',
    showMore: 'View full result',
    showMoreRuns: 'Show more analyses',
    title: 'Add a document',
    upload: 'Extract document',
    uploading: 'Uploading and extracting...',
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

function formatBytes(value) {
  if (!value) {
    return '';
  }

  return `${(value / 1_000_000).toFixed(2)} MB`;
}

export default function DocumentWorkspaceActions({
  actions = [],
  enabled = false,
  disabledMessage,
  initialRuns = [],
  locale = 'fr',
  maxFileBytes = 3500000,
  maxInputChars = 4000,
  rentalId,
}) {
  const t = copy[locale] ?? copy.fr;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [inputText, setInputText] = useState('');
  const [runs, setRuns] = useState(initialRuns);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRunIds, setExpandedRunIds] = useState([]);
  const [visibleRunCount, setVisibleRunCount] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedAction = actions[selectedIndex] ?? actions[0] ?? null;
  const latestRuns = useMemo(() => runs.slice(0, visibleRunCount), [runs, visibleRunCount]);
  const remainingChars = maxInputChars - inputText.length;
  const canUpload = enabled && selectedFile && selectedFile.size <= maxFileBytes && !isUploading && !isSubmitting;
  const canSubmit = enabled && documentFile?.status === 'extracted' && selectedAction && !isSubmitting && !isUploading;

  async function uploadDocument(event) {
    event.preventDefault();

    if (!canUpload) {
      return;
    }

    setError(null);
    setResult(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('rentalId', rentalId);
      formData.append('file', selectedFile);

      const response = await fetch('/api/agent-documents/upload', {
        body: formData,
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || data.status !== 'extracted') {
        setError(data.error || t.error);
        if (data.file) {
          setDocumentFile(data.file);
        }
        return;
      }

      setDocumentFile(data.file);
    } catch {
      setError(t.error);
    } finally {
      setIsUploading(false);
    }
  }

  async function submitRun(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/agent-runs/document', {
        body: JSON.stringify({
          actionIndex: selectedIndex,
          fileId: documentFile.id,
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
      setDocumentFile(null);
      setSelectedFile(null);

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
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="font-label mb-2 text-xs text-[#9B72CF]">DOCUMENT RUNTIME BETA</p>
          <h2 className="font-display text-xl font-bold text-[#F4EFFA]">{t.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">{enabled ? t.selectAction : disabledMessage || t.disabled}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 p-4 text-sm leading-relaxed text-[#FCD34D]">
        <p>{t.accepted}</p>
        <p className="mt-1">{t.noSensitive}</p>
      </div>

      {enabled && (
        <form onSubmit={uploadDocument} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[#A78BCF]">{t.fileLabel}</span>
            <input
              type="file"
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
              onChange={(event) => {
                setError(null);
                setDocumentFile(null);
                setSelectedFile(event.target.files?.[0] ?? null);
              }}
              className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] file:mr-3 file:rounded-lg file:border-0 file:bg-[#532B88] file:px-3 file:py-1.5 file:text-white"
            />
          </label>
          {selectedFile && (
            <p className={`text-xs ${selectedFile.size > maxFileBytes ? 'text-[#FCA5A5]' : 'text-[#7F6B9C]'}`}>
              {selectedFile.name} · {formatBytes(selectedFile.size)}
            </p>
          )}
          <Button type="submit" disabled={!canUpload} className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? t.uploading : t.upload}
          </Button>
        </form>
      )}

      {documentFile?.status === 'extracted' && (
        <div className="mt-5 rounded-2xl border border-[#10B981]/30 bg-[#07130F] p-4 text-sm text-[#6EE7B7]">
          {t.extracted} {documentFile.originalFilename ? `(${documentFile.originalFilename})` : ''}
        </div>
      )}

      {documentFile?.status === 'extracted' && (
        <form onSubmit={submitRun} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {actions.map((action, index) => (
              <button
                key={action.key ?? action.label}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`rounded-xl border px-3 py-3 text-left text-xs font-label transition ${
                  selectedIndex === index
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
              rows={3}
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
                    <div>
                      <p className="font-display text-sm font-bold text-[#F4EFFA]">{run.actionLabel}</p>
                      {run.documentFile?.originalFilename && (
                        <p className="mt-1 text-xs text-[#7F6B9C]">{run.documentFile.originalFilename}</p>
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
        {runs.length > visibleRunCount && (
          <button
            type="button"
            onClick={() => setVisibleRunCount((count) => count + 5)}
            className="mt-4 text-xs font-label text-[#9B72CF] hover:text-[#F4EFFA]"
          >
            {t.showMoreRuns}
          </button>
        )}
      </div>
    </div>
  );
}

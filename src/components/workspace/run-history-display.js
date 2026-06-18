import Link from 'next/link';

export function formatRunCount(count, locale = 'fr') {
  const normalizedCount = Number.isFinite(count) ? count : 0;

  if (locale === 'en') {
    return `${normalizedCount} ${normalizedCount === 1 ? 'run' : 'runs'}`;
  }

  return `${normalizedCount} exécution${normalizedCount > 1 ? 's' : ''}`;
}

export function focusRunInput(inputElement) {
  if (!inputElement) {
    return;
  }

  inputElement.focus();
  inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function getLatestSuccessfulRunId(runs = []) {
  return runs.find((run) => run?.status === 'succeeded' && run?.outputText)?.id ?? null;
}

export function getWorkspaceReviewHref(rentalId, locale = 'fr') {
  if (!rentalId) {
    return null;
  }

  const basePath = locale === 'en' ? '/en/workspace' : '/agenthub/workspace';

  return `${basePath}/${rentalId}?tab=review`;
}

export function WorkspaceReviewCta({ compact = false, hint, label, locale = 'fr', rentalId }) {
  const reviewHref = getWorkspaceReviewHref(rentalId, locale);

  if (!reviewHref) {
    return null;
  }

  const ctaLabel = label ?? (locale === 'en' ? 'Compare and leave review' : 'Comparer et laisser un avis');
  const ctaHint =
    hint ??
    (locale === 'en'
      ? 'This result is stored. Use it as the basis for a verified review.'
      : 'Ce résultat est stocké. Utilisez-le comme base pour un avis vérifié.');

  if (compact) {
    return (
      <Link
        href={reviewHref}
        className="inline-flex rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 text-xs font-label text-[#6EE7B7] transition-colors hover:border-[#34D399] hover:text-[#D1FAE5]"
      >
        {ctaLabel}
      </Link>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#10B981]/20 bg-[#10B981]/10 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-5 text-[#B7F7D3]">{ctaHint}</p>
      <Link
        href={reviewHref}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-[#10B981] px-3 text-xs font-bold text-[#07130F] transition-colors hover:bg-[#34D399]"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

export function normalizeRunInputForReuse(runInput, maxInputChars = 4000) {
  const normalizedInput = String(runInput ?? '').trim();

  if (!normalizedInput) {
    return '';
  }

  return normalizedInput.slice(0, maxInputChars);
}

export function shouldShowFullResultToggle(outputText) {
  const text = String(outputText ?? '');

  return text.length > 700 || text.split(/\r\n|\r|\n/).length > 8;
}

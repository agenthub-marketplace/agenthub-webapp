const copy = {
  fr: {
    blockedTitle: 'Exécution indisponible',
    attentionTitle: 'Point à vérifier avant exécution',
    creatorInfra:
      'Cet agent utilise une infrastructure créateur approuvée. AgentHub garde l’accès, l’historique et les garde-fous côté serveur.',
    creatorInfraTitle: 'Infra créateur approuvée',
    hybridInfra:
      'Cet agent combine l’infrastructure AgentHub et une capacité créateur approuvée. Les secrets et endpoints restent côté serveur.',
    hybridInfraTitle: 'Exécution hybride contrôlée',
    fallback: 'Cette exécution n’est pas disponible pour le moment.',
  },
  en: {
    blockedTitle: 'Execution unavailable',
    attentionTitle: 'Check before running',
    creatorInfra:
      'This agent uses approved creator infrastructure. AgentHub keeps access, history, and server-side guardrails in place.',
    creatorInfraTitle: 'Approved creator infrastructure',
    hybridInfra:
      'This agent combines AgentHub infrastructure with an approved creator capability. Secrets and endpoints stay server-side.',
    hybridInfraTitle: 'Controlled hybrid execution',
    fallback: 'This execution is not available right now.',
  },
};

function infraMessage(readiness, t) {
  if (!readiness?.disclosureRequired) {
    return null;
  }

  if (readiness.infraMode === 'creator_hosted') {
    return {
      message: t.creatorInfra,
      title: t.creatorInfraTitle,
    };
  }

  return {
    message: t.hybridInfra,
    title: t.hybridInfraTitle,
  };
}

export default function WorkspaceReadinessNotice({
  disabledMessage,
  locale = 'fr',
  readiness,
  showDisabledMessage = false,
}) {
  const t = copy[locale] ?? copy.fr;
  const blockers = Array.isArray(readiness?.blockers)
    ? readiness.blockers.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];
  const disclosure = infraMessage(readiness, t);
  const readinessStatus = readiness?.status ?? null;
  const isBlocked = showDisabledMessage || blockers.length > 0 || readinessStatus === 'blocked';
  const needsAttention = !isBlocked && readinessStatus === 'attention';
  const message = blockers.length > 0 ? null : disabledMessage || readiness?.scoreDetail || t.fallback;

  if (!showDisabledMessage && blockers.length === 0 && !needsAttention && !isBlocked && !disclosure) {
    return null;
  }

  return (
    <div
      className={`mb-5 space-y-3 rounded-2xl border p-4 text-sm leading-relaxed ${
        isBlocked || needsAttention
          ? 'border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F6C177]'
          : 'border-[#10B981]/25 bg-[#071611] text-[#6EE7B7]'
      }`}
    >
      {(isBlocked || needsAttention) && (
        <div>
          <p className="font-label mb-2 text-xs text-[#FCD34D]">
            {isBlocked ? t.blockedTitle : t.attentionTitle}
          </p>
          {message && <p>{message}</p>}
          {blockers.length > 0 && (
            <ul className="space-y-1">
              {blockers.map((blocker) => (
                <li key={blocker} className="flex gap-2">
                  <span aria-hidden="true">-</span>
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {disclosure && (
        <div className={isBlocked ? 'border-t border-[#F59E0B]/20 pt-3' : ''}>
          <p className={`font-label mb-2 text-xs ${isBlocked ? 'text-[#FCD34D]' : 'text-[#6EE7B7]'}`}>
            {disclosure.title}
          </p>
          <p className={isBlocked ? 'text-[#FCD34D]' : 'text-[#A7F3D0]'}>{disclosure.message}</p>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Edit3, ExternalLink, FileText, PlayCircle, ShieldCheck, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CodeAlert,
  CodePageHeader,
  CodePanel,
  EmptyCodeState,
  StatusBadge,
  canEditAgent,
  cleanAdminNotes,
  formatDate,
  formatMoney,
  formatRating,
  getAgentStatusLabel,
  getRuntimeTypeLabel,
  getWorkspaceModeLabel,
  pricingLabels,
  riskLabels,
} from './code-console-ui';

const runtimeReadiness = {
  static_guided: {
    title: 'Static guided',
    state: 'Disponible legacy',
    tone: 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]',
    ready: ['Workspace statique', 'Aucun appel runtime', 'Compatible agents historiques'],
    blocked: ['Pas de génération IA', 'Pas de document', 'Pas de workflow'],
  },
  llm_prompt: {
    title: 'Agent IA',
    state: 'Beta active',
    tone: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
    ready: ['Runner texte server-side', 'Historique agent_runs', 'Accès actif requis'],
    blocked: ['Document contrôlé par flag beta', 'Pas d’outil externe', 'Pas de code creator'],
  },
  document_file: {
    title: 'Agent IA',
    state: 'Mode document compat',
    tone: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
    ready: ['Bucket privé prévu', 'PDF/DOCX uniquement', 'Extraction serveur'],
    blocked: ['Capacité désactivée par défaut', 'Pas d’OCR', 'Pas de multi-fichier'],
  },
  workflow_automation: {
    title: 'Workflow Automation',
    state: 'Interne',
    tone: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
    ready: ['Queue durable', 'Worker contrôlé', 'Allowlist creator'],
    blocked: ['Désactivé par défaut', 'Pas de n8n', 'Pas d’actions libres'],
  },
  creator_endpoint: {
    title: 'Creator Endpoint',
    state: 'Foundation beta',
    tone: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
    ready: ['Proxy serveur', 'Signature HMAC', 'Endpoint approuvé'],
    blocked: ['Désactivé par défaut', 'Jamais client-side', 'Pas exposé creators publics'],
  },
};

const runStatusLabels = {
  running: 'En cours',
  succeeded: 'Réussi',
  failed: 'Échec',
};

function DetailMetric({ label, value }) {
  return (
    <CodePanel className="bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)] p-4">
      <p className="font-label text-xs text-[#6B3FA0]">{label}</p>
      <p className="mt-2 font-stat text-2xl text-[#111827]">{value}</p>
    </CodePanel>
  );
}

function BulletList({ emptyText = 'Non renseigné.', items }) {
  if (!items?.length) {
    return <p className="text-sm text-[#6B7280]">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-[#374151]">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#10B981]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RuntimeReadiness({ version }) {
  const runtimeType = version?.runtimeType || 'static_guided';
  const documentInputMode =
    runtimeType === 'document_file' ||
    (runtimeType === 'llm_prompt' && (version?.dataPolicy?.requires_files || version?.workspaceMode === 'document_required'));
  const readinessKey = documentInputMode && runtimeType === 'llm_prompt' ? 'document_file' : runtimeType;
  const readiness = runtimeReadiness[readinessKey] || runtimeReadiness.static_guided;

  return (
    <CodePanel>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-label mb-1 text-xs text-[#6B3FA0]">Runtime readiness</p>
          <h2 className="font-display text-xl font-bold text-[#111827]">{readiness.title}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-label ${readiness.tone}`}>{readiness.state}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4">
          <p className="font-label mb-2 text-xs text-[#6B7280]">Runtime</p>
          <p className="font-semibold text-[#111827]">{getRuntimeTypeLabel(runtimeType)}</p>
        </div>
        <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4">
          <p className="font-label mb-2 text-xs text-[#6B7280]">Execution mode</p>
          <p className="font-semibold text-[#111827]">{version?.executionMode || 'Non défini'}</p>
        </div>
        <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4">
          <p className="font-label mb-2 text-xs text-[#6B7280]">Workspace</p>
          <p className="font-semibold text-[#111827]">{getWorkspaceModeLabel(version?.workspaceMode)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-label mb-3 text-xs text-[#6B3FA0]">Prêt</p>
          <BulletList items={readiness.ready} />
        </div>
        <div>
          <p className="font-label mb-3 text-xs text-[#6B3FA0]">Verrouillé pour la beta</p>
          <BulletList items={readiness.blocked} />
        </div>
      </div>
    </CodePanel>
  );
}

export default function CodeAgentDetailContent({ agentResult }) {
  const agent = agentResult?.agent;

  if (agentResult?.creatorProfileMissing) {
    return (
      <main className="px-4 py-8 lg:px-8">
        <CodeAlert title="Profil créateur requis">Aucun profil créateur n’est lié à ce compte.</CodeAlert>
      </main>
    );
  }

  if (!agent || agentResult?.error) {
    return (
      <main className="px-4 py-8 lg:px-8">
        <EmptyCodeState
          icon={FileText}
          title="Agent introuvable"
          text="Cet agent n’existe pas, a été archivé ou n’appartient pas à votre profil créateur."
          action={
            <Link href="/code/agents">
              <Button variant="outline" className="border-[#D8DDEE] bg-white text-[#111827]">
                Retour aux agents
              </Button>
            </Link>
          }
        />
      </main>
    );
  }

  const adminNotes = cleanAdminNotes(agent.latestAdminReview?.notes);
  const editable = canEditAgent(agent);
  const usageAnalyticsLimited = Boolean(agent.analyticsLimited);

  return (
    <main className="px-4 py-8 lg:px-8">
      <Link href="/code/agents" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#6B3FA0] hover:text-[#4C1D95]">
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      <CodePageHeader
        eyebrow="AGENT DETAIL"
        title={agent.name}
        description={agent.summary}
        action={
          <>
            {agent.status === 'approved' && agent.slug && (
              <Link href={`/agenthub/agents/${agent.slug}`}>
                <Button variant="outline" className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir la fiche publique
                </Button>
              </Link>
            )}
            {editable && (
              <Link href={`/code/agents/${agent.id}/edit`}>
                <Button className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44]">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
            )}
          </>
        }
      />

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <DetailMetric label="Accès actifs" value={agent.accessStats.active} />
        <DetailMetric label="Accès total" value={agent.accessStats.total} />
        <DetailMetric label="Runs récents" value={agent.recentRuns.length} />
        <DetailMetric label="Avis" value={formatRating(agent.rating, agent.reviews)} />
      </div>

      {usageAnalyticsLimited && (
        <div className="mb-8">
          <CodeAlert title="Analytics masqués">
            Les accès et runs des utilisateurs ne sont pas exposés aux créateurs dans cette beta.
          </CodeAlert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <CodePanel>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={agent.status} label={getAgentStatusLabel(agent)} />
              <span className="rounded-full border border-[#D8DDEE] bg-[#F8FAFC] px-2.5 py-1 text-xs text-[#4B5563]">
                {riskLabels[agent.riskLevel] || agent.riskLevel}
              </span>
              {agent.categoryName && (
                <span className="rounded-full border border-[#D8DDEE] bg-[#F8FAFC] px-2.5 py-1 text-xs text-[#4B5563]">
                  {agent.categoryName}
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold text-[#111827]">Preview fiche publique</h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">{agent.description || agent.summary}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-[#4B5563]">
              <span>{formatMoney(agent.startingPriceCents, agent.currency)}</span>
              <span>{pricingLabels[agent.pricingType] || agent.pricingType}</span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                {formatRating(agent.rating, agent.reviews)}
              </span>
              <span>Mis à jour le {formatDate(agent.updatedAt)}</span>
            </div>
          </CodePanel>

          <RuntimeReadiness version={agent.version} />

          <CodePanel>
            <p className="font-label mb-2 text-xs text-[#6B3FA0]">Agent Contract</p>
            <h2 className="font-display text-xl font-bold text-[#111827]">Promesse et cadre d’utilisation</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <p className="font-semibold text-[#111827]">Ce que l’agent peut faire</p>
                <div className="mt-3">
                  <BulletList items={agent.version?.capabilities} />
                </div>
              </div>
              <div>
                <p className="font-semibold text-[#111827]">Inputs à préparer</p>
                <div className="mt-3">
                  <BulletList items={agent.version?.requiredInputs || agent.version?.setupRequirements?.items} />
                </div>
              </div>
              <div>
                <p className="font-semibold text-[#111827]">Livrables attendus</p>
                <div className="mt-3">
                  <BulletList items={agent.version?.deliverables} />
                </div>
              </div>
              <div>
                <p className="font-semibold text-[#111827]">Limites</p>
                <div className="mt-3">
                  <BulletList items={agent.version?.limitations} />
                </div>
              </div>
            </div>
            {agent.version?.outputPromise?.summary && (
              <div className="mt-5 rounded-2xl border border-[#DDD6FE] bg-[#FAF7FF] p-4">
                <p className="font-label mb-1 text-xs text-[#6B3FA0]">Promesse de résultat</p>
                <p className="text-sm leading-6 text-[#374151]">{agent.version.outputPromise.summary}</p>
              </div>
            )}
          </CodePanel>
        </div>

        <aside className="space-y-6">
          <CodePanel>
            <div className="mb-4 flex items-center gap-3">
              <PlayCircle className="h-5 w-5 text-[#6B3FA0]" />
              <h2 className="font-display text-lg font-bold text-[#111827]">Runs récents</h2>
            </div>
            {agent.recentRuns.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                {usageAnalyticsLimited ? "Les runs utilisateur sont masqués pendant la beta." : "Aucune exécution enregistrée pour le moment."}
              </p>
            ) : (
              <div className="space-y-3">
                {agent.recentRuns.map((run) => (
                  <div key={run.id} className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#111827]">{run.actionLabel}</p>
                      <StatusBadge status={run.status} label={runStatusLabels[run.status] || run.status} />
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      {formatDate(run.createdAt)}
                      {run.errorCode ? ` - ${run.errorCode}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CodePanel>

          <CodePanel>
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-[#6B3FA0]" />
              <h2 className="font-display text-lg font-bold text-[#111827]">Accès clients</h2>
            </div>
            {usageAnalyticsLimited && (
              <p className="mb-4 text-sm text-[#6B7280]">Les accès utilisateur restent masqués côté créateur pendant la beta.</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                <p className="text-[#6B7280]">Arrêtés</p>
                <p className="mt-1 font-stat text-xl text-[#111827]">{agent.accessStats.stopped}</p>
              </div>
              <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                <p className="text-[#6B7280]">Expirés</p>
                <p className="mt-1 font-stat text-xl text-[#111827]">{agent.accessStats.expired}</p>
              </div>
              <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                <p className="text-[#6B7280]">Annulés</p>
                <p className="mt-1 font-stat text-xl text-[#111827]">{agent.accessStats.cancelled}</p>
              </div>
              <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                <p className="text-[#6B7280]">Total</p>
                <p className="mt-1 font-stat text-xl text-[#111827]">{agent.accessStats.total}</p>
              </div>
            </div>
          </CodePanel>

          <CodePanel>
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#6B3FA0]" />
              <h2 className="font-display text-lg font-bold text-[#111827]">Validation admin</h2>
            </div>
            {agent.latestAdminReview ? (
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={agent.latestAdminReview.decision} label={getAgentStatusLabel(agent)} />
                  <span className="text-xs text-[#6B7280]">{formatDate(agent.latestAdminReview.createdAt)}</span>
                </div>
                <p className="text-sm leading-6 text-[#4B5563]">{adminNotes || 'Aucun commentaire ajouté.'}</p>
              </div>
            ) : (
              <p className="text-sm leading-6 text-[#6B7280]">Aucun retour admin enregistré.</p>
            )}
          </CodePanel>
        </aside>
      </div>
    </main>
  );
}

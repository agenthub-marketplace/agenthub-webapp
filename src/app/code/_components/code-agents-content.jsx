import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity, ArrowRight, Box, CalendarDays, CheckCircle2, Plus, ShieldAlert, Trophy } from 'lucide-react';
import {
  CodeAlert,
  CodePageHeader,
  CodePanel,
  EmptyCodeState,
  StatusBadge,
  cleanAdminNotes,
  formatDate,
  formatMoney,
  getAgentStatusLabel,
  getAdminReviewLabel,
  pricingLabels,
  riskLabels,
} from './code-console-ui';
import ClearNewAgentDraftOnSubmit from './clear-new-agent-draft-on-submit';

function CountPill({ label, tone = 'violet', value }) {
  const toneClasses = {
    violet: 'border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7F2FF_100%)]',
    green: 'border-[#BBF7D0] bg-[linear-gradient(135deg,#FFFFFF_0%,#F0FDF4_100%)]',
    amber: 'border-[#FDE68A] bg-[linear-gradient(135deg,#FFFFFF_0%,#FFFBEB_100%)]',
    blue: 'border-[#BFDBFE] bg-[linear-gradient(135deg,#FFFFFF_0%,#EFF6FF_100%)]',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-[0_10px_28px_rgba(109,64,160,0.06)] transition duration-200 hover:brightness-[0.97] hover:shadow-[0_14px_34px_rgba(109,64,160,0.08)] ${toneClasses[tone] || toneClasses.violet}`}>
      <p className="font-label mb-2 text-xs text-[#6B3FA0]">{label}</p>
      <p className="font-stat text-2xl text-[#111827]">{value}</p>
    </div>
  );
}

function PostSubmissionMission({ precheckStatus, submittedSlug }) {
  if (!submittedSlug) {
    return null;
  }

  const precheckFailed = precheckStatus === 'failed';
  const steps = [
    {
      done: true,
      label: 'Brouillon envoyé',
      text: 'La fiche est sortie du wizard et le brouillon local a été nettoyé.',
    },
    {
      done: !precheckFailed,
      label: precheckFailed ? 'Précheck à relancer' : 'Précheck enregistré',
      text: precheckFailed
        ? 'Un admin devra relancer ou traiter le précheck depuis la review.'
        : 'La review admin peut s’appuyer sur le premier contrôle sécurité.',
    },
    {
      done: false,
      label: 'Review admin',
      text: 'Surveillez les retours admin avant de créer une nouvelle variante.',
    },
    {
      done: false,
      label: 'Smoke test user',
      text: 'Dès approval, testez marketplace -> location -> workspace -> run -> avis.',
    },
  ];

  return (
    <CodePanel tone={precheckFailed ? 'amber' : 'green'} className="mb-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={precheckFailed ? 'rejected' : 'approved'} label={precheckFailed ? 'Action admin requise' : 'Soumission validée'} />
            <span className="rounded-full border border-[#DDD6FE] bg-white px-2.5 py-1 text-[10px] font-label text-[#6B3FA0]">
              {submittedSlug}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#111827]">Mission post-soumission</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
            Ne repartez pas dans la création tout de suite. La meilleure action est de suivre cette fiche jusqu’à publication, puis de lancer un smoke test complet.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.label} className="rounded-2xl border border-[#E3E7F2] bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.done ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F5F3FF] text-[#6B3FA0]'
                    }`}
                  >
                    {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <p className="text-sm font-bold text-[#111827]">{step.label}</p>
                </div>
                <p className="text-xs leading-5 text-[#64748B]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
        <Link href="/code/agents">
          <Button variant="outline" className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
            Suivre mes agents
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </CodePanel>
  );
}

const precheckActionLabels = {
  block_publication: 'Bloquer avant publication',
  manual_review: 'Review manuelle',
  reject_candidate: 'Rejet recommandé',
  request_changes: 'Modifications à prévoir',
  require_security_review: 'Security review requise',
  standard_review: 'Review standard',
  wait_precheck: 'Attendre le précheck',
};

function createEmptyRunStats() {
  return {
    failed: 0,
    lastRunAt: null,
    running: 0,
    succeeded: 0,
    total: 0,
  };
}

function buildRunStatsByAgent(recentRuns) {
  const statsByAgent = new Map();

  for (const run of recentRuns ?? []) {
    if (!run.agentId) {
      continue;
    }

    const current = statsByAgent.get(run.agentId) ?? createEmptyRunStats();
    const createdAt = run.createdAt ?? null;
    const lastRunAt =
      createdAt && (!current.lastRunAt || new Date(createdAt).getTime() > new Date(current.lastRunAt).getTime())
        ? createdAt
        : current.lastRunAt;

    statsByAgent.set(run.agentId, {
      failed: current.failed + (run.status === 'failed' ? 1 : 0),
      lastRunAt,
      running: current.running + (run.status === 'running' ? 1 : 0),
      succeeded: current.succeeded + (run.status === 'succeeded' ? 1 : 0),
      total: current.total + 1,
    });
  }

  return statsByAgent;
}

function buildAgentPipeline(agent, runStats = createEmptyRunStats()) {
  const changesRequested =
    agent.status === 'in_review' &&
    (agent.latestAdminReview?.isChangesRequest || Boolean(agent.latestAdminReview?.notes?.trim()));
  const precheckBlocked =
    agent.securityPrecheckSignal &&
    (agent.securityPrecheckSignal.status === 'failed' ||
      agent.securityPrecheckSignal.riskLevel === 'blocked' ||
      ['block_publication', 'fix_before_publish', 'request_changes'].includes(agent.securityPrecheckSignal.recommendedAction));
  const workspaceBlocked = Boolean(agent.workspaceSignal?.fallbackRequired);
  const steps = [
    {
      done: true,
      key: 'created',
      label: 'Fiche créée',
    },
    {
      done: agent.status !== 'draft',
      key: 'submitted',
      label: 'Soumise',
    },
    {
      done: ['approved', 'suspended', 'archived'].includes(agent.status),
      key: 'published',
      label: 'Publiée',
    },
    {
      done: agent.reviews > 0 || runStats.succeeded > 0,
      key: 'proof',
      label: 'Preuve usage',
    },
  ];
  const score = Math.round((steps.filter((step) => step.done).length / steps.length) * 100);

  if (changesRequested || agent.status === 'rejected') {
    return {
      actionHref: `/code/agents/${agent.id}/edit`,
      actionLabel: 'Corriger',
      detail: 'Un retour admin bloque la publication. Priorité : ajuster la fiche et resoumettre.',
      label: 'Correction prioritaire',
      score,
      steps,
      tone: 'rejected',
    };
  }

  if (agent.status === 'draft') {
    return {
      actionHref: `/code/agents/${agent.id}/edit`,
      actionLabel: 'Finaliser',
      detail: 'Brouillon non soumis. Complétez le contrat agent, les limites et la promesse de résultat.',
      label: 'À finaliser',
      score,
      steps,
      tone: 'draft',
    };
  }

  if (precheckBlocked) {
    return {
      actionHref: `/code/agents/${agent.id}`,
      actionLabel: 'Voir le précheck',
      detail: `${agent.securityPrecheckSignal.label}. À traiter avant une publication fiable.`,
      label: 'Précheck à traiter',
      score,
      steps,
      tone: 'failed',
    };
  }

  if (workspaceBlocked) {
    return {
      actionHref: `/code/agents/${agent.id}`,
      actionLabel: 'Voir le workspace',
      detail: 'Le workspace indique un fallback ou une dépendance infra à vérifier avant test user.',
      label: 'Workspace à vérifier',
      score,
      steps,
      tone: 'in_review',
    };
  }

  if (agent.status === 'submitted' || agent.status === 'in_review') {
    return {
      actionHref: `/code/agents/${agent.id}`,
      actionLabel: 'Suivre la review',
      detail: 'La fiche est entre les mains de l’admin. Surveillez les retours et les préchecks.',
      label: 'Validation en cours',
      score,
      steps,
      tone: 'in_review',
    };
  }

  if (agent.status === 'approved' && agent.reviews === 0) {
    const hasSuccessfulRun = runStats.succeeded > 0;

    return {
      actionHref: `/code/agents/${agent.id}`,
      actionLabel: hasSuccessfulRun ? 'Collecter un avis' : 'Préparer un test',
      detail: hasSuccessfulRun
        ? 'Exécution réussie détectée. Prochaine preuve marketplace : un avis vérifié.'
        : 'Agent publié. Prochaine preuve produit : un test user complet et un avis vérifié.',
      label: hasSuccessfulRun ? 'Avis vérifié à obtenir' : 'Test user à obtenir',
      score,
      steps,
      tone: 'approved',
    };
  }

  if (agent.status === 'approved') {
    return {
      actionHref: `/code/agents/${agent.id}`,
      actionLabel: 'Optimiser',
      detail: 'La boucle publication est lancée. Comparez les exécutions, avis et revenus beta pour améliorer la fiche.',
      label: 'Boucle active',
      score,
      steps,
      tone: 'approved',
    };
  }

  if (agent.status === 'suspended') {
    return {
      actionHref: `/code/agents/${agent.id}`,
      actionLabel: 'Voir le motif',
      detail: 'Agent suspendu : il n’est plus louable tant qu’un admin ne le restaure pas. Vérifiez le retour admin avant toute relance.',
      label: 'Suspendu par admin',
      score,
      steps,
      tone: 'suspended',
    };
  }

  if (agent.status === 'archived') {
    return {
      actionHref: `/code/agents/${agent.id}`,
      actionLabel: 'Consulter',
      detail: 'Agent archivé : il reste consultable pour historique, mais sort du flux principal de publication et de vente.',
      label: 'Archivé',
      score,
      steps,
      tone: 'archived',
    };
  }

  return {
    actionHref: `/code/agents/${agent.id}`,
    actionLabel: 'Voir',
    detail: 'Ouvrez le détail pour comprendre le prochain blocage.',
    label: 'À inspecter',
    score,
    steps,
    tone: agent.status,
  };
}

function AgentPipelineCard({ pipeline }) {
  return (
    <div className="mt-4 rounded-2xl border border-[#DDD6FE] bg-[radial-gradient(circle_at_top_left,#F3E8FF_0%,#FFFFFF_42%,#F8FAFC_100%)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={pipeline.tone} label={pipeline.label} />
            <span className="inline-flex items-center gap-1 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[10px] font-label text-[#166534]">
              <Trophy className="h-3 w-3" />
              {pipeline.score}%
            </span>
          </div>
          <p className="text-xs leading-5 text-[#64748B]">{pipeline.detail}</p>
        </div>
        <Link href={pipeline.actionHref} className="shrink-0">
          <Button size="sm" className="h-9 border-0 bg-[#111827] px-3 text-white hover:bg-[#2B1A44]">
            {pipeline.actionLabel}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {pipeline.steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
              step.done
                ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                : 'border-[#E2E8F0] bg-white text-[#64748B]'
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${step.done ? 'text-[#10B981]' : 'text-[#CBD5E1]'}`} />
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentRunSignalCard({ runStats }) {
  if (runStats.total === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-label text-[10px] text-[#64748B]">Usage beta</p>
          <StatusBadge status="draft" label="Aucune exécution récente" />
        </div>
        <p className="mt-2 text-xs leading-5 text-[#64748B]">
          Dès qu’un testeur lance une action workspace, le signal apparaît ici sans afficher son contenu.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5F3FF_100%)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-label text-[10px] text-[#6B3FA0]">Usage beta</p>
        <StatusBadge
          status={runStats.failed > 0 ? 'in_review' : 'approved'}
          label={`${runStats.total} exécution${runStats.total > 1 ? 's' : ''} récente${runStats.total > 1 ? 's' : ''}`}
        />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2">
          <p className="font-label text-[10px] text-[#166534]">Réussis</p>
          <p className="font-stat text-lg text-[#14532D]">{runStats.succeeded}</p>
        </div>
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
          <p className="font-label text-[10px] text-[#92400E]">En cours</p>
          <p className="font-stat text-lg text-[#78350F]">{runStats.running}</p>
        </div>
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2">
          <p className="font-label text-[10px] text-[#991B1B]">Échecs</p>
          <p className="font-stat text-lg text-[#7F1D1D]">{runStats.failed}</p>
        </div>
      </div>
      {runStats.lastRunAt && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#64748B]">
          <Activity className="h-3.5 w-3.5 text-[#8B5CF6]" />
          Dernière exécution : {formatDate(runStats.lastRunAt)}
        </p>
      )}
    </div>
  );
}

function getAgentPriorityRank(agent, pipeline, runStats = createEmptyRunStats()) {
  if (pipeline.label === 'Correction prioritaire' || agent.status === 'rejected') {
    return 10;
  }

  if (agent.status === 'draft') {
    return 20;
  }

  if (pipeline.label === 'Précheck à traiter') {
    return 30;
  }

  if (pipeline.label === 'Workspace à vérifier') {
    return 40;
  }

  if (agent.status === 'submitted' || agent.status === 'in_review') {
    return 50;
  }

  if (agent.status === 'approved' && agent.reviews === 0 && runStats.succeeded > 0) {
    return 55;
  }

  if (agent.status === 'approved' && agent.reviews === 0) {
    return 60;
  }

  if (agent.status === 'approved') {
    return 80;
  }

  if (agent.status === 'suspended') {
    return 85;
  }

  if (agent.status === 'archived') {
    return 95;
  }

  return 90;
}

function buildCreatorPriorityQueue(agents, hasProfile, runStatsByAgent) {
  if (!hasProfile) {
    return [
      {
        actionHref: '/onboarding/creator',
        actionLabel: 'Ouvrir l’onboarding',
        detail: 'Le profil créateur doit être lié avant de pouvoir publier et suivre les agents.',
        key: 'creator-profile',
        label: 'Profil créateur à finaliser',
        tone: 'in_review',
      },
    ];
  }

  if (agents.length === 0) {
    return [
      {
        actionHref: '/code/agents/new',
        actionLabel: 'Créer un agent',
        detail: 'Commencez depuis un template beta pour obtenir rapidement une fiche testable.',
        key: 'first-agent',
        label: 'Premier agent à créer',
        tone: 'draft',
      },
    ];
  }

  return agents
    .map((agent) => {
      const runStats = runStatsByAgent.get(agent.id) ?? createEmptyRunStats();
      const pipeline = buildAgentPipeline(agent, runStats);

      return {
        actionHref: pipeline.actionHref,
        actionLabel: pipeline.actionLabel,
        detail: pipeline.detail,
        key: agent.id,
        label: `${agent.name} · ${pipeline.label}`,
        rank: getAgentPriorityRank(agent, pipeline, runStats),
        tone: pipeline.tone,
      };
    })
    .sort((left, right) => left.rank - right.rank || left.label.localeCompare(right.label))
    .slice(0, 3);
}

function buildPortfolioHealth({ agents, counts, hasProfile, runStatsByAgent }) {
  const successfulRunCount = agents.reduce((total, agent) => {
    const runStats = runStatsByAgent.get(agent.id) ?? createEmptyRunStats();

    return total + runStats.succeeded;
  }, 0);
  const reviewCount = agents.reduce((total, agent) => total + (agent.reviews ?? 0), 0);
  const items = [
    {
      done: hasProfile,
      key: 'profile',
      label: 'Profil créateur',
    },
    {
      done: agents.length > 0,
      key: 'agent',
      label: 'Agent créé',
    },
    {
      done: counts.published > 0,
      key: 'published',
      label: 'Agent publié',
    },
    {
      done: counts.changes === 0 && counts.fallback === 0,
      key: 'clean',
      label: 'Aucun blocage visible',
    },
    {
      done: successfulRunCount > 0,
      key: 'run',
      label: 'Exécution réussie',
    },
    {
      done: reviewCount > 0,
      key: 'review',
      label: 'Avis vérifié',
    },
  ];
  const doneCount = items.filter((item) => item.done).length;
  const score = Math.round((doneCount / items.length) * 100);
  const nextItem = items.find((item) => !item.done);

  return {
    doneCount,
    items,
    nextLabel: nextItem?.label ?? 'Optimiser les agents publiés',
    reviewCount,
    score,
    successfulRunCount,
  };
}

function PortfolioHealthPanel({ health }) {
  return (
    <CodePanel tone="blue" className="mb-8">
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
        <div className="rounded-2xl border border-[#BFDBFE] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-label text-xs text-[#1D4ED8]">Santé portefeuille</p>
            <Trophy className="h-5 w-5 text-[#6B3FA0]" />
          </div>
          <p className="font-stat text-5xl text-[#111827]">{health.score}%</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#DBEAFE]">
            <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${health.score}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#64748B]">
            {health.doneCount}/{health.items.length} signaux beta validés.
          </p>
        </div>
        <div>
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-label text-xs text-[#6B3FA0]">BOUCLE CRÉATEUR</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-[#111827]">Ce qui rend vos agents testables</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Le score privilégie les preuves concrètes : publication, exécution workspace, avis vérifié et absence de blocage admin.
              </p>
            </div>
            <StatusBadge status={health.score >= 80 ? 'approved' : 'in_review'} label={`Prochain signal : ${health.nextLabel}`} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {health.items.map((item) => (
              <div
                key={item.key}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  item.done
                    ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.done ? 'text-[#10B981]' : 'text-[#CBD5E1]'}`} />
                {item.label}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#DDD6FE] bg-white px-4 py-3">
              <p className="font-label text-[10px] text-[#6B3FA0]">RUNS RÉUSSIS</p>
              <p className="font-stat mt-1 text-2xl text-[#111827]">{health.successfulRunCount}</p>
            </div>
            <div className="rounded-2xl border border-[#DDD6FE] bg-white px-4 py-3">
              <p className="font-label text-[10px] text-[#6B3FA0]">AVIS VÉRIFIÉS</p>
              <p className="font-stat mt-1 text-2xl text-[#111827]">{health.reviewCount}</p>
            </div>
          </div>
        </div>
      </div>
    </CodePanel>
  );
}

export default function CodeAgentsContent({ creatorAgentsResult, draftScopeKey = null, precheckStatus, submittedSlug }) {
  const agents = creatorAgentsResult?.agents ?? [];
  const hasProfile = !creatorAgentsResult?.creatorProfileMissing;
  const runStatsByAgent = buildRunStatsByAgent(creatorAgentsResult?.recentRuns ?? []);
  const priorityQueue = buildCreatorPriorityQueue(agents, hasProfile, runStatsByAgent);
  const counts = {
    all: agents.length,
    published: agents.filter((agent) => agent.status === 'approved').length,
    review: agents.filter((agent) => agent.status === 'in_review').length,
    changes: agents.filter((agent) => agent.status === 'in_review' && (agent.latestAdminReview?.isChangesRequest || Boolean(agent.latestAdminReview?.notes?.trim()))).length,
    fallback: agents.filter((agent) => agent.workspaceSignal?.fallbackRequired).length,
  };
  const portfolioHealth = buildPortfolioHealth({ agents, counts, hasProfile, runStatsByAgent });

  return (
    <main className="px-4 py-8 lg:px-8">
      {submittedSlug && (
        <ClearNewAgentDraftOnSubmit draftScopeKey={draftScopeKey} submittedSlug={submittedSlug} />
      )}
      <CodePageHeader
        eyebrow="MES AGENTS"
        title="Vos agents, leurs statuts et les actions à faire."
        description="Suivez ce qui est publié, en validation, à corriger ou encore en brouillon."
        action={
          hasProfile ? (
            <Link href="/code/agents/new">
              <Button className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44]">
                <Plus className="mr-2 h-4 w-4" />
                Créer un agent
              </Button>
            </Link>
          ) : (
            <Button disabled className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm disabled:opacity-50">
              <Plus className="mr-2 h-4 w-4" />
              Créer un agent
            </Button>
          )
        }
      />

        <div className="mb-6 space-y-4">
          {creatorAgentsResult?.creatorProfileMissing && (
            <CodeAlert title="Profil créateur requis">
              Ce compte a accès à l’espace créateur, mais aucun profil créateur ne lui est lié.
            </CodeAlert>
          )}
          {creatorAgentsResult?.error && (
            <CodeAlert tone="error">Impossible de charger vos agents pour le moment.</CodeAlert>
          )}
          {submittedSlug && precheckStatus === 'completed' && (
            <CodeAlert tone="success" title="Agent soumis">
              La publication est partie en validation et le précheck sécurité a été enregistré.
            </CodeAlert>
          )}
          {submittedSlug && precheckStatus === 'failed' && (
            <CodeAlert tone="warning" title="Agent soumis, précheck à relancer">
              La publication est bien partie en validation, mais le précheck sécurité n’a pas pu être enregistré automatiquement.
              L’admin devra le relancer depuis la file de review avant publication.
            </CodeAlert>
          )}
        </div>

        <PostSubmissionMission precheckStatus={precheckStatus} submittedSlug={submittedSlug} />

        <PortfolioHealthPanel health={portfolioHealth} />

        <CodePanel tone="violet" className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">À FAIRE MAINTENANT</p>
              <h2 className="font-display text-2xl font-bold text-[#111827]">La prochaine action utile</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                AgentHub Code classe vos agents par blocage réel pour éviter de chercher quoi corriger en premier.
              </p>
            </div>
            {agents.length > 0 && counts.published === agents.length && counts.fallback === 0 && counts.changes === 0 && (
              <StatusBadge status="approved" label="Pipeline propre" />
            )}
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {priorityQueue.map((item, index) => (
              <Link
                key={item.key}
                href={item.actionHref}
                className="group rounded-2xl border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_24px_rgba(109,64,160,0.04)] transition duration-200 hover:border-[#8B5CF6] hover:bg-[#FCFAFF]"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-1 text-[10px] font-label text-[#6B3FA0]">
                      Priorité {index + 1}
                    </span>
                    <StatusBadge status={item.tone} label={item.label} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8B5CF6] transition group-hover:translate-x-0.5" />
                </div>
                <p className="text-sm leading-6 text-[#4B5563]">{item.detail}</p>
                <span className="mt-4 inline-flex text-sm font-semibold text-[#6B3FA0]">{item.actionLabel}</span>
              </Link>
            ))}
          </div>
        </CodePanel>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <CountPill label="Total" tone="blue" value={counts.all} />
          <CountPill label="Publiés" tone="green" value={counts.published} />
          <CountPill label="En validation" tone="violet" value={counts.review} />
          <CountPill label="À corriger" tone="amber" value={counts.changes} />
          <CountPill label="Fallback infra" tone={counts.fallback > 0 ? 'amber' : 'green'} value={counts.fallback} />
        </div>

        {agents.length === 0 ? (
          <EmptyCodeState
            action={
              hasProfile && (
                <Link href="/code/agents/new">
                  <Button className="border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer mon premier agent
                  </Button>
                </Link>
              )
            }
            icon={Box}
            title="Aucun agent soumis"
            text="Créez une fiche claire avec les inputs, les livrables, les limites et la promesse de résultat. Elle partira ensuite en validation AgentHub."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#DDD6FE] bg-white shadow-[0_14px_40px_rgba(109,64,160,0.06)]">
            <div className="hidden min-w-[880px] grid-cols-[minmax(320px,1fr)_150px_150px_150px_120px] gap-4 border-b border-[#DDD6FE] bg-[#F5F3FF] px-5 py-3 text-xs font-label text-[#6B3FA0] lg:grid">
              <span>Agent</span>
              <span>Statut</span>
              <span>Prix</span>
              <span>Mis à jour</span>
              <span className="text-right">Action</span>
            </div>
            <div className="min-w-0 divide-y divide-[#E3E7F2] lg:min-w-[880px]">
              {agents.map((agent) => {
                const adminNotes = cleanAdminNotes(agent.latestAdminReview?.notes);
                const runStats = runStatsByAgent.get(agent.id) ?? createEmptyRunStats();
                const pipeline = buildAgentPipeline(agent, runStats);

                return (
                  <article key={agent.id} className="grid gap-4 p-5 transition-colors hover:bg-[#FCFAFF] lg:grid-cols-[minmax(320px,1fr)_150px_150px_150px_120px] lg:items-start">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-bold text-[#111827]">{agent.name}</h2>
                        {agent.categoryName && (
                          <span className="rounded-full border border-[#E3E7F2] bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-label text-[#6B7280]">
                            {agent.categoryName}
                          </span>
                        )}
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-[#4B5563]">{agent.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6B7280]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(agent.createdAt)}
                        </span>
                        <span>{riskLabels[agent.riskLevel] || agent.riskLevel}</span>
                      </div>
                      <AgentPipelineCard pipeline={pipeline} />
                      {agent.status === 'approved' && <AgentRunSignalCard runStats={runStats} />}
                      {agent.workspaceSignal && (
                        <div className="mt-4 rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-label text-[10px] text-[#6B3FA0]">Workspace</p>
                            <StatusBadge
                              status={agent.workspaceSignal.fallbackRequired ? 'in_review' : 'approved'}
                              label={agent.workspaceSignal.label}
                            />
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#64748B]">{agent.workspaceSignal.detail}</p>
                        </div>
                      )}
                      {agent.securityPrecheckSignal && (
                        <div className="mt-3 rounded-2xl border border-[#BFDBFE] bg-[linear-gradient(135deg,#FFFFFF_0%,#EFF6FF_100%)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-label text-[10px] text-[#1D4ED8]">Précheck sécurité</p>
                            <StatusBadge
                              status={agent.securityPrecheckSignal.status === 'passed' ? 'approved' : agent.securityPrecheckSignal.status === 'failed' || agent.securityPrecheckSignal.riskLevel === 'blocked' ? 'failed' : 'in_review'}
                              label={agent.securityPrecheckSignal.label}
                            />
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#64748B]">
                            Action suggérée : {precheckActionLabels[agent.securityPrecheckSignal.recommendedAction] || agent.securityPrecheckSignal.recommendedAction}
                          </p>
                        </div>
                      )}
                      {agent.latestAdminReview && (
                          <CodePanel tone="violet" className="mt-4 p-3">
                          <p className="font-label mb-1 text-[10px] text-[#6B3FA0]">Retour admin</p>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <StatusBadge status={agent.latestAdminReview.decision} label={getAdminReviewLabel(agent.latestAdminReview)} />
                            <span className="text-xs text-[#6B7280]">{formatDate(agent.latestAdminReview.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-[#4B5563]">
                            {adminNotes || 'Aucun commentaire ajouté.'}
                          </p>
                        </CodePanel>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:block">
                      <StatusBadge status={agent.status} label={getAgentStatusLabel(agent)} />
                    </div>

                    <div className="text-sm text-[#4B5563]">
                      <p className="font-semibold text-[#111827]">{formatMoney(agent.startingPriceCents, agent.currency)}</p>
                      <p className="text-xs text-[#6B7280]">{pricingLabels[agent.pricingType] || agent.pricingType}</p>
                    </div>

                    <div className="text-sm text-[#4B5563]">
                      {formatDate(agent.updatedAt)}
                    </div>

                    <div className="flex justify-start lg:justify-end">
                      <Link href={`/code/agents/${agent.id}`}>
                        <Button size="sm" variant="outline" className="border-[#D8DDEE] bg-white text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/code/dashboard" className="rounded-2xl border border-[#BFDBFE] bg-[linear-gradient(135deg,#FFFFFF_0%,#EFF6FF_100%)] p-5 shadow-sm transition duration-200 hover:border-[#8B5CF6] hover:brightness-[0.97] hover:shadow-[0_14px_34px_rgba(109,64,160,0.08)]">
            <ShieldAlert className="mb-4 h-5 w-5 text-[#6B3FA0]" />
            <h2 className="font-display text-lg font-bold text-[#111827]">Suivre l’activité</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Retrouvez les agents en validation, les corrections demandées et les activations utilisateurs.</p>
            <span className="mt-4 inline-flex text-sm font-medium text-[#6B3FA0]">
              Ouvrir le tableau de bord
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </span>
          </Link>
          <Link href="/code/docs" className="rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)] p-5 shadow-sm transition duration-200 hover:border-[#8B5CF6] hover:brightness-[0.97] hover:shadow-[0_14px_34px_rgba(109,64,160,0.08)]">
            <Box className="mb-4 h-5 w-5 text-[#6B3FA0]" />
            <h2 className="font-display text-lg font-bold text-[#111827]">Améliorer une fiche</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Consultez les standards de promesse, entrées demandées, limites et exemples.</p>
            <span className="mt-4 inline-flex text-sm font-medium text-[#6B3FA0]">
              Ouvrir les docs
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </span>
          </Link>
        </div>
      </main>
  );
}

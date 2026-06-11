import { Check, Edit, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { requireAdminAccess } from '@/lib/auth/session';
import { AGENT_RUNTIME_TYPE_LABELS, EXECUTION_MODE_OPTIONS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import {
  approveCreatorEndpointAssetsAction,
  approveWorkflowAutomationAssetsAction,
  createSecurityReviewAction,
  generateSecurityPrecheckAction,
  reviewAgentAction,
} from '@/server/admin/actions';
import { getAdminReviewQueue } from '@/server/admin/review-queue';
import { Button } from '@/components/ui/button';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, cleanAdminNotes, formatDate } from '../../_components/code-console-ui';
import { EmptyAdminState, RuntimeSettingSummary } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

const reviewErrors = {
  'security-review-required': 'Une security review passée ou waived est requise pour ce runtime sensible.',
  'runtime-disabled': 'Ce runtime est désactivé.',
  'workflow-not-approved': 'Les assets de l’agent workflow doivent être approuvés avant publication.',
  'creator-endpoint-not-approved': 'L’API creator doit être approuvée avant publication.',
  'changes-notes-required': 'Ajoutez au moins 10 caractères pour demander des modifications.',
  'security-review-create-failed': 'Impossible de créer la security review.',
  'security-review-not-required': 'Ce runtime ne nécessite pas de security review par défaut.',
  'agent-not-reviewable': 'Ce précheck ne peut être généré que pour un agent soumis ou en review.',
  'invalid-precheck': 'Impossible de générer le précheck pour cet agent.',
  'manifest-load-failed': 'Impossible de charger le manifest pour générer le précheck.',
  'precheck-insert-failed': 'Impossible d’enregistrer le précheck sécurité.',
};

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function hasChangesRequest(agent) {
  return agent?.latestAdminReview?.decision === 'in_review' && Boolean(agent.latestAdminReview.notes?.trim());
}

function publicationLabel(value) {
  if (value === 'advanced_agent') {
    return 'Agent avancé';
  }

  return 'Assistant IA guidé';
}

function infraLabel(value) {
  if (value === 'creator_hosted') {
    return 'Infra créateur';
  }

  if (value === 'hybrid') {
    return 'Infra hybride';
  }

  return 'Infra AgentHub';
}

const precheckRiskLabels = {
  blocked: 'Bloqué',
  high: 'Risque haut',
  low: 'Risque bas',
  medium: 'Risque moyen',
};

const precheckRecommendationLabels = {
  block_publication: 'Bloquer publication',
  request_changes: 'Demander modifications',
  review_standard: 'Review standard',
  security_review_required: 'Security review requise',
};

const precheckNextActions = {
  block_publication: 'Ne pas publier. Traiter les blocages déterministes avant toute décision.',
  request_changes: 'Demander au créateur de clarifier la promesse, les limites ou la décision LLM.',
  review_standard: 'Procéder à la review standard puis approuver si la fiche est cohérente.',
  security_review_required: 'Créer ou finaliser la security review avant publication.',
};

const precheckRiskTone = {
  blocked: 'failed',
  high: 'rejected',
  low: 'approved',
  medium: 'in_review',
};

const precheckStatusTone = {
  error: 'failed',
  failed: 'failed',
  not_started: 'in_review',
  passed: 'approved',
  pending: 'in_review',
  running: 'in_review',
  stale: 'rejected',
  warning: 'in_review',
};

const precheckRiskOrder = {
  blocked: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function getPrecheck(agent) {
  return agent.manifest?.securityPrecheck ?? null;
}

function getPrecheckRisk(agent) {
  return getPrecheck(agent)?.riskLevel ?? 'blocked';
}

function getPrecheckPriority(agent) {
  const precheck = getPrecheck(agent);

  if (!precheck) {
    return {
      detail: 'Manifest ou précheck indisponible. Ne pas décider avant régénération.',
      label: 'P0',
      title: 'Précheck manquant',
      tone: 'failed',
    };
  }

  if (precheck.recommendation === 'block_publication' || precheck.riskLevel === 'blocked') {
    return {
      detail: 'Blocage déterministe. Corriger ou demander modifications avant publication.',
      label: 'P0',
      title: 'Blocage publication',
      tone: 'failed',
    };
  }

  if (precheck.recommendation === 'security_review_required') {
    return {
      detail: 'Security review à créer ou finaliser avant toute approbation.',
      label: 'P1',
      title: 'Security review requise',
      tone: 'rejected',
    };
  }

  if (precheck.riskLevel === 'high') {
    return {
      detail: 'Pas de blocage déterministe, mais review approfondie nécessaire.',
      label: 'P1',
      title: 'Review approfondie',
      tone: 'rejected',
    };
  }

  if (precheck.recommendation === 'request_changes' || precheck.riskLevel === 'medium') {
    return {
      detail: 'Clarifier la fiche, les limites ou le runtime avant approbation.',
      label: 'P2',
      title: 'Clarifications creator',
      tone: 'in_review',
    };
  }

  return {
    detail: 'Aucun blocage détecté. Procéder à la review standard.',
    label: 'P3',
    title: 'Review standard',
    tone: 'approved',
  };
}

function sortByPrecheckPriority(queue) {
  return [...queue].sort((left, right) => {
    const leftRisk = getPrecheckRisk(left);
    const rightRisk = getPrecheckRisk(right);
    const riskDelta = (precheckRiskOrder[leftRisk] ?? 0) - (precheckRiskOrder[rightRisk] ?? 0);

    if (riskDelta !== 0) {
      return riskDelta;
    }

    const leftCreatedAt = new Date(left.createdAt).getTime();
    const rightCreatedAt = new Date(right.createdAt).getTime();

    return leftCreatedAt - rightCreatedAt;
  });
}

function buildPrecheckTriage(queue) {
  return queue.reduce(
    (summary, agent) => {
      const precheck = getPrecheck(agent);
      const riskLevel = precheck?.riskLevel ?? 'blocked';

      summary.total += 1;
      summary[riskLevel] = (summary[riskLevel] ?? 0) + 1;

      if (precheck?.recommendation === 'security_review_required') {
        summary.securityReviewRequired += 1;
      }

      if (!precheck) {
        summary.missingManifest += 1;
      }

      return summary;
    },
    {
      blocked: 0,
      high: 0,
      low: 0,
      medium: 0,
      missingManifest: 0,
      securityReviewRequired: 0,
      total: 0,
    },
  );
}

function PrecheckPriorityPanel({ agent }) {
  const priority = getPrecheckPriority(agent);

  return (
    <div className="rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5F3FF_100%)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label text-[10px] text-[#6B3FA0]">Priorité review</p>
          <h3 className="mt-1 text-base font-bold text-[#111827]">{priority.title}</h3>
          <p className="mt-2 text-sm leading-5 text-[#4B5563]">{priority.detail}</p>
        </div>
        <StatusBadge status={priority.tone} label={priority.label} />
      </div>
    </div>
  );
}

function buildPrecheckChangeRequest(agent) {
  const precheck = getPrecheck(agent);

  if (!precheck) {
    return '';
  }

  const actionableFindings = [...(precheck.blockers || []), ...(precheck.warnings || [])].slice(0, 5);

  if (actionableFindings.length === 0) {
    return '';
  }

  const lines = actionableFindings.map((finding) => {
    const action = finding.suggestedAdminAction ? ` Action attendue : ${finding.suggestedAdminAction}` : '';

    return `- ${finding.title} : ${finding.detail}${action}`;
  });

  return [
    'Merci de corriger ou clarifier les points suivants avant une nouvelle review :',
    '',
    ...lines,
  ].join('\n');
}

function TriageStat({ label, tone = 'in_review', value }) {
  return (
    <div className="rounded-2xl border border-[#DDD6FE] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-label text-[10px] text-[#6B3FA0]">{label}</p>
        <StatusBadge status={tone} label={tone === 'failed' ? 'priorité' : 'tri'} />
      </div>
      <p className="mt-3 text-3xl font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function PrecheckNextAction({ agent }) {
  const precheck = getPrecheck(agent);

  if (!precheck) {
    return (
      <CodeAlert tone="error">
        Précheck indisponible : vérifier le manifest serveur avant de décider.
      </CodeAlert>
    );
  }

  const tone = precheck.recommendation === 'block_publication'
    ? 'error'
    : precheck.recommendation === 'request_changes' || precheck.recommendation === 'security_review_required'
      ? 'warning'
      : 'success';

  return (
    <CodeAlert tone={tone}>
      Action recommandée : {precheckNextActions[precheck.recommendation] || 'Continuer la review admin.'}
    </CodeAlert>
  );
}

function GeneratePrecheckForm({ agent }) {
  const status = agent.manifest?.securityProfile?.precheckStatus ?? 'not_started';
  const label = status === 'not_started' ? 'Enregistrer le précheck' : 'Régénérer le précheck';

  return (
    <form action={generateSecurityPrecheckAction}>
      <input type="hidden" name="agent_id" value={agent.id} />
      <Button type="submit" variant="outline" className="h-9 border-[#8B5CF6] bg-white text-[#5B21B6] hover:bg-[#F5F3FF]">
        {label}
      </Button>
    </form>
  );
}

function FindingList({ emptyText, findings }) {
  if (!findings?.length) {
    return <p className="text-sm text-[#6B7280]">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {findings.map((finding) => (
        <li key={finding.code} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#111827]">{finding.title}</p>
            <span className="font-label rounded-full border border-[#DDD6FE] px-2 py-1 text-[10px] text-[#6B3FA0]">
              {finding.code}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#4B5563]">{finding.detail}</p>
          <p className="mt-2 text-xs font-semibold text-[#5B21B6]">{finding.suggestedAdminAction}</p>
        </li>
      ))}
    </ul>
  );
}

function QualityCheckList({ checks = [] }) {
  const failedChecks = checks.filter((check) => check.status === 'fail');

  if (failedChecks.length === 0) {
    return <p className="text-sm text-[#166534]">Aucun point qualité bloquant ou warning détecté.</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {failedChecks.slice(0, 5).map((check) => (
        <li key={check.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#111827]">{check.label}</p>
            <StatusBadge status={check.severity === 'blocker' ? 'failed' : 'in_review'} label={check.severity} />
          </div>
          <p className="mt-1 text-xs leading-5 text-[#4B5563]">{check.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function ReviewActions({ agent }) {
  const suggestedChanges = buildPrecheckChangeRequest(agent);

  if (agent.status === 'submitted') {
    return (
      <form action={reviewAgentAction}>
        <input type="hidden" name="agent_id" value={agent.id} />
        <input type="hidden" name="decision" value="start_review" />
        <input type="hidden" name="locale" value="fr" />
        <Button type="submit" variant="outline" className="h-10 border-[#8B5CF6] bg-white text-[#5B21B6] hover:bg-[#F5F3FF]">
          <Eye className="mr-2 h-4 w-4" />
          Prendre en revue
        </Button>
      </form>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <form action={reviewAgentAction}>
        <input type="hidden" name="agent_id" value={agent.id} />
        <input type="hidden" name="decision" value="approve" />
        <input type="hidden" name="locale" value="fr" />
        <Button type="submit" disabled={!agent.runtimeSetting?.enabled} className="h-10 w-full border-0 bg-[#16A34A] text-white hover:bg-[#15803D] disabled:opacity-50">
          <Check className="mr-2 h-4 w-4" />
          Approuver
        </Button>
      </form>
      <form action={reviewAgentAction} className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-3">
        <input type="hidden" name="agent_id" value={agent.id} />
        <input type="hidden" name="decision" value="changes" />
        <input type="hidden" name="locale" value="fr" />
        <label className="font-label text-[10px] text-[#92400E]">Modifications</label>
        <textarea
          name="notes"
          defaultValue={hasChangesRequest(agent) ? cleanAdminNotes(agent.latestAdminReview.notes) : suggestedChanges}
          rows={suggestedChanges ? 7 : 3}
          className="mt-2 w-full rounded-xl border border-[#FCD34D] bg-white p-3 text-sm text-[#111827] outline-none focus:border-[#8B5CF6]"
        />
        {suggestedChanges && !hasChangesRequest(agent) && (
          <p className="mt-2 text-xs leading-5 text-[#92400E]">
            Prérempli depuis le précheck. Relisez et adaptez avant envoi au créateur.
          </p>
        )}
        <Button type="submit" variant="outline" className="mt-2 h-9 w-full border-[#F59E0B] bg-white text-[#92400E] hover:bg-[#FEF3C7]">
          <Edit className="mr-2 h-4 w-4" />
          Envoyer
        </Button>
      </form>
      <form action={reviewAgentAction} className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-3">
        <input type="hidden" name="agent_id" value={agent.id} />
        <input type="hidden" name="decision" value="reject" />
        <input type="hidden" name="locale" value="fr" />
        <label className="font-label text-[10px] text-[#991B1B]">Raison du refus</label>
        <textarea name="notes" rows={3} className="mt-2 w-full rounded-xl border border-[#FCA5A5] bg-white p-3 text-sm text-[#111827] outline-none focus:border-[#8B5CF6]" />
        <Button type="submit" variant="outline" className="mt-2 h-9 w-full border-[#EF4444] bg-white text-[#991B1B] hover:bg-[#FEE2E2]">
          <X className="mr-2 h-4 w-4" />
          Refuser
        </Button>
      </form>
    </div>
  );
}

export default async function AdminReviewPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/review');
  const params = searchParams ? await searchParams : {};
  const reviewQueue = await getAdminReviewQueue();
  const error = typeof params?.error === 'string' ? params.error : null;
  const reviewed = typeof params?.reviewed === 'string' ? params.reviewed : null;
  const prechecked = typeof params?.prechecked === 'string' ? params.prechecked : null;
  const triage = buildPrecheckTriage(reviewQueue.queue);
  const prioritizedQueue = sortByPrecheckPriority(reviewQueue.queue);

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN REVIEW"
        title="Validation agents"
        description="File complète de validation AgentHub Code : contrat, runtime, assets workflow/endpoint et security gate."
      />

      {reviewed && <CodeAlert tone="success">Décision admin enregistrée.</CodeAlert>}
      {prechecked && <div className="mt-4"><CodeAlert tone="success">Précheck sécurité enregistré.</CodeAlert></div>}
      {error && <div className="mt-4"><CodeAlert tone="error">{reviewErrors[error] || 'Impossible d’enregistrer la décision admin.'}</CodeAlert></div>}

      {!reviewQueue.error && reviewQueue.queue.length > 0 && (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <TriageStat label="À traiter" value={triage.total} />
          <TriageStat label="Bloqués par précheck" value={triage.blocked} tone={triage.blocked > 0 ? 'failed' : 'approved'} />
          <TriageStat label="Risque haut" value={triage.high} tone={triage.high > 0 ? 'rejected' : 'approved'} />
          <TriageStat label="Risque moyen" value={triage.medium} tone={triage.medium > 0 ? 'in_review' : 'approved'} />
          <TriageStat label="Security review requise" value={triage.securityReviewRequired} tone={triage.securityReviewRequired > 0 ? 'in_review' : 'approved'} />
        </section>
      )}

      <section className="mt-6 grid gap-5">
        {reviewQueue.error && <CodeAlert tone="error">Impossible de charger la file de validation.</CodeAlert>}
        {!reviewQueue.error && reviewQueue.queue.length === 0 && (
          <EmptyAdminState title="Aucun agent en attente" text="Les nouvelles soumissions creators apparaîtront ici." />
        )}
        {prioritizedQueue.map((agent) => (
          <CodePanel key={agent.id}>
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold text-[#111827]">{agent.name}</h2>
                  <StatusBadge status={agent.status} label={hasChangesRequest(agent) ? 'Modifs demandées' : agent.status} />
                  <StatusBadge status={agent.riskLevel === 'forbidden_beta' ? 'failed' : 'in_review'} label={agent.riskLevel} />
                  <StatusBadge
                    status={precheckRiskTone[getPrecheckRisk(agent)] || 'failed'}
                    label={`Précheck: ${precheckRiskLabels[getPrecheckRisk(agent)] || 'Indisponible'}`}
                  />
                </div>
                <p className="text-sm text-[#4B5563]">Soumis par {agent.creatorName || 'Créateur inconnu'} · {formatDate(agent.createdAt)}</p>
                <p className="mt-4 leading-7 text-[#374151]">{agent.description}</p>

                <div className="mt-4">
                  <PrecheckNextAction agent={agent} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-3">
                    <p className="font-label text-[10px] text-[#6B3FA0]">Runtime</p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">{AGENT_RUNTIME_TYPE_LABELS[agent.contract.runtimeType] || agent.contract.runtimeType}</p>
                  </div>
                  <div className="rounded-2xl border border-[#DDD6FE] bg-white p-3">
                    <p className="font-label text-[10px] text-[#6B3FA0]">Workspace</p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">{WORKSPACE_MODE_LABELS[agent.contract.workspaceMode] || agent.contract.workspaceMode}</p>
                  </div>
                  <div className="rounded-2xl border border-[#DDD6FE] bg-white p-3">
                    <p className="font-label text-[10px] text-[#6B3FA0]">Setup</p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">{optionLabel(SETUP_REQUIREMENT_OPTIONS, agent.contract.setupRequirements.type)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#DDD6FE] bg-white p-3">
                    <p className="font-label text-[10px] text-[#6B3FA0]">Exécution</p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">{optionLabel(EXECUTION_MODE_OPTIONS, agent.contract.executionMode)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#DDD6FE] bg-white p-4">
                  <p className="font-label mb-2 text-xs text-[#6B3FA0]">Promesse de résultat</p>
                  <p className="text-sm leading-6 text-[#4B5563]">{agent.contract.outputPromise.summary || 'Promesse non renseignée.'}</p>
                </div>

                <div className="mt-5 rounded-2xl border border-[#C4B5FD] bg-[#FAF7FF] p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-label text-xs text-[#6B3FA0]">Agent Manifest V1</p>
                      <p className="mt-1 text-sm text-[#4B5563]">
                        Vue dérivée serveur pour préparer le précheck sécurité et le workspace dynamique.
                      </p>
                    </div>
                    {agent.manifestError && <StatusBadge status="failed" label={agent.manifestError} />}
                  </div>
                  {agent.manifest ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-[#DDD6FE] bg-white p-3">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Publication</p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">{publicationLabel(agent.manifest.publicationType)}</p>
                      </div>
                      <div className="rounded-xl border border-[#DDD6FE] bg-white p-3">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Infrastructure</p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">{infraLabel(agent.manifest.infraMode)}</p>
                      </div>
                      <div className="rounded-xl border border-[#DDD6FE] bg-white p-3">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Blocs workspace</p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">{agent.manifest.workspaceBlocks.length} blocs</p>
                      </div>
                      <div className="rounded-xl border border-[#DDD6FE] bg-white p-3">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Security gate</p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                          {agent.manifest.securityProfile.securityReviewRequired ? agent.manifest.securityProfile.securityReviewStatus : 'Non requis'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#DDD6FE] bg-white p-3">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Score qualité</p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                          {agent.manifest.qualityProfile.score}/100
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#DDD6FE] bg-white p-3 md:col-span-2">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Exigences runtime</p>
                        <p className="mt-1 text-sm text-[#374151]">
                          {[
                            agent.manifest.runtimeRequirements.requiresOpenai ? 'OpenAI' : null,
                            agent.manifest.runtimeRequirements.requiresDocumentExtraction ? 'Extraction document' : null,
                            agent.manifest.runtimeRequirements.requiresWorkflowWorker ? 'Worker workflow' : null,
                            agent.manifest.runtimeRequirements.requiresCreatorEndpoint ? 'Endpoint creator' : null,
                            agent.manifest.runtimeRequirements.requiresRuntimeAllowlist ? 'Allowlist creator' : null,
                            agent.manifest.runtimeRequirements.requiresAssetApproval ? 'Asset approval' : null,
                          ].filter(Boolean).join(' · ') || 'Aucune exigence spéciale'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#DDD6FE] bg-white p-3 md:col-span-2">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Blocages dérivés</p>
                        <p className="mt-1 text-sm text-[#374151]">
                          {agent.manifest.securityProfile.blockingFindings.length > 0
                            ? agent.manifest.securityProfile.blockingFindings.join(' · ')
                          : 'Aucun blocage manifeste détecté'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_100%)] p-4 md:col-span-2 xl:col-span-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-label text-xs text-[#6B3FA0]">Agent Quality Score interne</p>
                            <h3 className="mt-1 text-lg font-bold text-[#111827]">
                              {agent.manifest.qualityProfile.readyForClosedBeta ? 'Prêt beta fermée' : 'Qualité à corriger'}
                            </h3>
                            <p className="mt-2 text-sm text-[#4B5563]">
                              {agent.manifest.qualityProfile.blockerCount} blocage(s), {agent.manifest.qualityProfile.warningCount} warning(s). Score non public, réservé à la review admin.
                            </p>
                          </div>
                          <StatusBadge
                            status={agent.manifest.qualityProfile.readyForClosedBeta ? 'approved' : 'failed'}
                            label={`${agent.manifest.qualityProfile.score}/100`}
                          />
                        </div>
                        <QualityCheckList checks={agent.manifest.qualityProfile.checks} />
                      </div>
                      <div className="rounded-2xl border border-[#C4B5FD] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5F3FF_100%)] p-4 md:col-span-2 xl:col-span-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-label text-xs text-[#6B3FA0]">Security Precheck v0</p>
                            <h3 className="mt-1 text-lg font-bold text-[#111827]">
                              {precheckRecommendationLabels[agent.manifest.securityPrecheck.recommendation] || agent.manifest.securityPrecheck.recommendation}
                            </h3>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
                              {agent.manifest.securityPrecheck.summary}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              status={precheckStatusTone[agent.manifest.securityProfile.precheckStatus] || 'in_review'}
                              label={agent.manifest.securityProfile.precheckStatus}
                            />
                            <StatusBadge
                              status={precheckRiskTone[agent.manifest.securityPrecheck.riskLevel] || 'in_review'}
                              label={precheckRiskLabels[agent.manifest.securityPrecheck.riskLevel] || agent.manifest.securityPrecheck.riskLevel}
                            />
                            <StatusBadge status="in_review" label={agent.manifest.securityPrecheck.recommendation} />
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <GeneratePrecheckForm agent={agent} />
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-3">
                          <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4">
                            <p className="font-label mb-3 text-xs text-[#991B1B]">Bloquants</p>
                            <FindingList
                              findings={agent.manifest.securityPrecheck.blockers}
                              emptyText="Aucun blocage déterministe détecté."
                            />
                          </div>
                          <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                            <p className="font-label mb-3 text-xs text-[#92400E]">À vérifier</p>
                            <FindingList
                              findings={agent.manifest.securityPrecheck.warnings}
                              emptyText="Aucun warning sécurité ou qualité détecté."
                            />
                          </div>
                          <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                            <p className="font-label mb-3 text-xs text-[#166534]">Validé</p>
                            <FindingList
                              findings={agent.manifest.securityPrecheck.passed.slice(0, 4)}
                              emptyText="Aucun check validé automatiquement."
                            />
                          </div>
                        </div>

                        {agent.manifest.securityPrecheck.adminQuestions.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-[#DDD6FE] bg-white p-4">
                            <p className="font-label mb-2 text-xs text-[#6B3FA0]">Questions admin suggérées</p>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                              {agent.manifest.securityPrecheck.adminQuestions.map((question) => (
                                <li key={question}>• {question}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <CodeAlert tone="error">Impossible de dériver le manifest de cette version.</CodeAlert>
                  )}
                </div>

                {agent.workflow && (
                  <div className="mt-5 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-label text-xs text-[#92400E]">Agent workflow beta</p>
                        <p className="text-sm text-[#4B5563]">Statut workflow : {agent.workflow.status}</p>
                      </div>
                      <form action={approveWorkflowAutomationAssetsAction}>
                        <input type="hidden" name="agent_id" value={agent.id} />
                        <input type="hidden" name="locale" value="fr" />
                        <Button type="submit" className="border-0 bg-[#F59E0B] text-[#111827] hover:bg-[#FBBF24]">Approuver assets workflow</Button>
                      </form>
                    </div>
                    <ol className="space-y-2 text-sm">
                      {agent.workflow.steps.map((step, index) => (
                        <li key={`${step.label}-${index}`} className="rounded-xl border border-[#FCD34D] bg-white p-3">
                          {index + 1}. {step.label} · {step.type}
                          {step.endpointId && <span className="ml-2 text-[#92400E]">Endpoint {step.endpointStatus || 'introuvable'}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {agent.creatorEndpoint && (
                  <div className="mt-5 rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-label text-xs text-[#6B3FA0]">Creator endpoint beta</p>
                        <p className="text-sm text-[#4B5563]">Config {agent.creatorEndpoint.status} · Endpoint {agent.creatorEndpoint.endpointStatus || 'introuvable'}</p>
                      </div>
                      <form action={approveCreatorEndpointAssetsAction}>
                        <input type="hidden" name="agent_id" value={agent.id} />
                        <input type="hidden" name="locale" value="fr" />
                        <Button type="submit" className="border-0 bg-[#6B3FA0] text-white hover:bg-[#5B21B6]">Approuver endpoint</Button>
                      </form>
                    </div>
                  </div>
                )}

                {!['llm_prompt', 'static_guided'].includes(agent.contract.runtimeType) && (
                  <div className="mt-5 rounded-2xl border border-[#C4B5FD] bg-[#F5F3FF] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-label text-xs text-[#6B3FA0]">Security Review v0</p>
                        <p className="mt-1 text-sm text-[#4B5563]">
                          {agent.securityReview
                            ? `Review ${agent.securityReview.status}`
                            : 'Review obligatoire avant publication pour ce runtime sensible.'}
                        </p>
                      </div>
                      {agent.securityReview ? (
                        <Link href={`/code/admin/security/reviews/${agent.securityReview.id}`} className="rounded-xl border border-[#8B5CF6] bg-white px-4 py-2 text-sm font-semibold text-[#5B21B6] hover:bg-[#FAF7FF]">
                          Ouvrir review
                        </Link>
                      ) : (
                        <form action={createSecurityReviewAction}>
                          <input type="hidden" name="agent_id" value={agent.id} />
                          <Button type="submit" variant="outline" className="border-[#8B5CF6] bg-white text-[#5B21B6] hover:bg-[#FAF7FF]">
                            Créer review sécurité
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <PrecheckPriorityPanel agent={agent} />
                <div className="rounded-2xl border border-[#DDD6FE] bg-white p-4">
                  <p className="font-label mb-3 text-xs text-[#6B3FA0]">Runtime settings</p>
                  <RuntimeSettingSummary setting={agent.runtimeSetting ? {
                    enabled: agent.runtimeSetting.enabled,
                    creator_visible: agent.runtimeSetting.creatorVisible,
                    run_enabled: agent.runtimeSetting.runEnabled,
                  } : null} />
                </div>
                {hasChangesRequest(agent) && (
                  <CodeAlert>Demande en cours : {cleanAdminNotes(agent.latestAdminReview.notes)}</CodeAlert>
                )}
                <ReviewActions agent={agent} />
              </aside>
            </div>
          </CodePanel>
        ))}
      </section>
    </main>
  );
}

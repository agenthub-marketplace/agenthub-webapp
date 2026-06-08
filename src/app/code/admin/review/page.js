import { Check, Edit, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { requireAdminAccess } from '@/lib/auth/session';
import { AGENT_RUNTIME_TYPE_LABELS, EXECUTION_MODE_OPTIONS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { approveCreatorEndpointAssetsAction, approveWorkflowAutomationAssetsAction, createSecurityReviewAction, reviewAgentAction } from '@/server/admin/actions';
import { getAdminReviewQueue } from '@/server/admin/review-queue';
import { Button } from '@/components/ui/button';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, cleanAdminNotes, formatDate } from '../../_components/code-console-ui';
import { EmptyAdminState, RuntimeSettingSummary } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

const reviewErrors = {
  'security-review-required': 'Une security review passée ou waived est requise pour ce runtime sensible.',
  'runtime-disabled': 'Ce runtime est désactivé.',
  'workflow-not-approved': 'Les assets workflow doivent être approuvés avant publication.',
  'creator-endpoint-not-approved': 'L’endpoint creator doit être approuvé avant publication.',
  'changes-notes-required': 'Ajoutez au moins 10 caractères pour demander des modifications.',
  'security-review-create-failed': 'Impossible de créer la security review.',
  'security-review-not-required': 'Ce runtime ne nécessite pas de security review par défaut.',
};

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function hasChangesRequest(agent) {
  return agent?.latestAdminReview?.decision === 'in_review' && Boolean(agent.latestAdminReview.notes?.trim());
}

function ReviewActions({ agent }) {
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
        <textarea name="notes" defaultValue={hasChangesRequest(agent) ? cleanAdminNotes(agent.latestAdminReview.notes) : ''} rows={3} className="mt-2 w-full rounded-xl border border-[#FCD34D] bg-white p-3 text-sm text-[#111827] outline-none focus:border-[#8B5CF6]" />
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

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN REVIEW"
        title="Validation agents"
        description="File complète de validation AgentHub Code : contrat, runtime, assets workflow/endpoint et security gate."
      />

      {reviewed && <CodeAlert tone="success">Décision admin enregistrée.</CodeAlert>}
      {error && <div className="mt-4"><CodeAlert tone="error">{reviewErrors[error] || 'Impossible d’enregistrer la décision admin.'}</CodeAlert></div>}

      <section className="mt-6 grid gap-5">
        {reviewQueue.error && <CodeAlert tone="error">Impossible de charger la file de validation.</CodeAlert>}
        {!reviewQueue.error && reviewQueue.queue.length === 0 && (
          <EmptyAdminState title="Aucun agent en attente" text="Les nouvelles soumissions creators apparaîtront ici." />
        )}
        {reviewQueue.queue.map((agent) => (
          <CodePanel key={agent.id}>
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold text-[#111827]">{agent.name}</h2>
                  <StatusBadge status={agent.status} label={hasChangesRequest(agent) ? 'Modifs demandées' : agent.status} />
                  <StatusBadge status={agent.riskLevel === 'forbidden_beta' ? 'failed' : 'in_review'} label={agent.riskLevel} />
                </div>
                <p className="text-sm text-[#4B5563]">Soumis par {agent.creatorName || 'Créateur inconnu'} · {formatDate(agent.createdAt)}</p>
                <p className="mt-4 leading-7 text-[#374151]">{agent.description}</p>

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
                    <p className="font-label text-[10px] text-[#6B3FA0]">Execution</p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">{optionLabel(EXECUTION_MODE_OPTIONS, agent.contract.executionMode)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#DDD6FE] bg-white p-4">
                  <p className="font-label mb-2 text-xs text-[#6B3FA0]">Promesse de résultat</p>
                  <p className="text-sm leading-6 text-[#4B5563]">{agent.contract.outputPromise.summary || 'Promesse non renseignée.'}</p>
                </div>

                {agent.workflow && (
                  <div className="mt-5 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-label text-xs text-[#92400E]">Workflow automation beta</p>
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

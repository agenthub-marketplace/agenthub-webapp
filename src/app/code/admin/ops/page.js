import Link from 'next/link';
import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminOpsSnapshot } from '@/server/admin/code-admin';
import { getAdminReviewQueue } from '@/server/admin/review-queue';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate } from '../../_components/code-console-ui';
import { AdminStatCard, EmptyAdminState } from '../_components/admin-shared';
import { buildReviewRoutingSummary, routingActionLabels, routingOwnerLabels, routingToneByPriority } from '../_components/review-routing';

export const dynamic = 'force-dynamic';

export default async function AdminOpsPage() {
  await requireAdminAccess('fr', '/code/admin/ops');
  const [result, reviewQueue] = await Promise.all([
    getAdminOpsSnapshot(),
    getAdminReviewQueue(),
  ]);
  const routingSummary = buildReviewRoutingSummary(reviewQueue.queue, { limit: 6 });
  const blockingRoutes = routingSummary.routed.filter((item) => item.routing.blocksApproval).slice(0, 6);

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN OPS"
        title="Sanity beta"
        description="Checks read-only pour repérer les anomalies. Aucun correctif destructif depuis l’UI."
      />

      {result.error && <CodeAlert tone="error">Impossible de charger les checks ops.</CodeAlert>}
      {reviewQueue.error && <CodeAlert tone="error">Impossible de charger le routage des reviews.</CodeAlert>}

      <Link href="/code/admin/ops/advanced-agents" className="mb-6 block">
        <CodePanel tone="violet" className="transition hover:border-[#8B5CF6]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-label mb-1 text-xs text-[#6B3FA0]">DIAGNOSTIC AVANCÉ</p>
              <h2 className="font-display text-xl font-bold text-[#111827]">Agents workflow/API</h2>
              <p className="mt-1 text-sm text-[#4B5563]">
                Voir runtime settings, allowlist creator, assets, security review et dernier run par agent avancé.
              </p>
            </div>
            <span className="text-sm font-semibold text-[#5B21B6]">Ouvrir le diagnostic →</span>
          </div>
        </CodePanel>
      </Link>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(result.checks ?? []).map((check) => (
          <AdminStatCard key={check.key} label={check.label} value={check.value} tone={check.tone} />
        ))}
      </section>

      <CodePanel className="mb-6 border-[#DDD6FE] bg-[#FAF7FF]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-label mb-1 text-xs text-[#6B3FA0]">SECURITY PRECHECK</p>
            <h2 className="font-display text-xl font-bold text-[#111827]">Tri admin avant publication</h2>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Les compteurs précheck signalent les agents soumis sans artefact final, les préchecks à relancer et les findings qui doivent être lus avant approbation.
            </p>
          </div>
          <Link href="/code/admin/review" className="rounded-xl border border-[#8B5CF6] bg-white px-4 py-2 text-sm font-semibold text-[#5B21B6] hover:bg-[#F5F3FF]">
            Ouvrir la review
          </Link>
        </div>
      </CodePanel>

      <CodePanel className="mb-6 border-[#C4B5FD] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5F3FF_100%)]">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-label mb-1 text-xs text-[#6B3FA0]">ROUTAGE REVIEW</p>
            <h2 className="font-display text-xl font-bold text-[#111827]">File opérationnelle P0/P1/P2/P3</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Signal agrégé depuis le dernier précheck enregistré. À utiliser pour lancer les boucles Codex ciblées sans relire toute la file admin.
            </p>
          </div>
          <Link href="/code/admin/review" className="rounded-xl border border-[#8B5CF6] bg-white px-4 py-2 text-sm font-semibold text-[#5B21B6] hover:bg-[#F5F3FF]">
            Ouvrir review
          </Link>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(routingSummary.counts).map(([priority, value]) => (
              <div key={priority} className="rounded-2xl border border-[#DDD6FE] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-label text-xs text-[#6B3FA0]">{priority}</p>
                  <StatusBadge status={routingToneByPriority[priority]} label={priority === 'P0' ? 'bloquant' : 'tri'} />
                </div>
                <p className="mt-2 font-display text-3xl font-bold text-[#111827]">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#DDD6FE] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-[#111827]">Blocages approval</h3>
              <StatusBadge status={blockingRoutes.length > 0 ? 'failed' : 'approved'} label={`${blockingRoutes.length}`} />
            </div>
            {blockingRoutes.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Aucun blocage d’approbation dans la file courante.</p>
            ) : (
              <div className="grid gap-3">
                {blockingRoutes.map(({ agent, routing }) => (
                  <Link key={agent.id} href="/code/admin/review" className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3 transition hover:border-[#8B5CF6] hover:bg-[#FAF7FF]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-[#111827]">{agent.name}</p>
                          <StatusBadge status={routingToneByPriority[routing.priority]} label={routing.priority} />
                        </div>
                        <p className="mt-1 text-xs text-[#6B7280]">{agent.creatorName || 'Créateur inconnu'} · {formatDate(agent.createdAt)}</p>
                        <p className="mt-2 text-xs leading-5 text-[#4B5563]">{routing.reason}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-semibold text-[#5B21B6]">{routingActionLabels[routing.nextAction] || routing.nextAction}</p>
                        <p className="mt-1 text-[#64748B]">{routingOwnerLabels[routing.owner] || routing.owner}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </CodePanel>

      <section className="grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Runs récents</h2>
          <div className="grid gap-3">
            {result.recentRuns.length === 0 && <EmptyAdminState title="Aucun run récent" text="Les exécutions LLM/document/workflow/endpoints apparaîtront ici." />}
            {result.recentRuns.map((run) => (
              <CodePanel key={run.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-[#111827]">{run.agent?.name ?? 'Agent inconnu'}</h3>
                  <StatusBadge status={run.status} label={run.status} />
                  <StatusBadge status="in_review" label={run.provider} />
                  {run.errorCode && <StatusBadge status="failed" label={run.errorCode} />}
                </div>
                <p className="mt-2 text-sm text-[#6B7280]">{run.userEmail} · {formatDate(run.createdAt)}</p>
              </CodePanel>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Audit logs récents</h2>
          <div className="grid gap-3">
            {result.auditLogs.length === 0 && <EmptyAdminState title="Aucun audit log" text="Les actions admin audit-loggées apparaîtront ici." />}
            {result.auditLogs.map((log) => (
              <CodePanel key={log.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-[#111827]">{log.action}</h3>
                  <StatusBadge status="in_review" label={log.entityType} />
                </div>
                <p className="mt-2 text-sm text-[#6B7280]">{log.actorEmail} · {formatDate(log.createdAt)}</p>
              </CodePanel>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

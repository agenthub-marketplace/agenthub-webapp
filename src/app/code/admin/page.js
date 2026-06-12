import Link from 'next/link';
import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminRevenueAnalytics, normalizeRevenuePeriod } from '@/server/analytics/revenue';
import { getAdminDashboardSnapshot } from '@/server/admin/code-admin';
import { getAdminAgentManagementList, getAdminReviewQueue } from '@/server/admin/review-queue';
import { CodePageHeader, CodePanel, StatusBadge, formatDate } from '../_components/code-console-ui';
import { AdminQuickLink, AdminRevenueOverview, AdminStatCard } from './_components/admin-shared';
import { buildReviewRoutingSummary, routingActionLabels, routingOwnerLabels, routingToneByPriority } from './_components/review-routing';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeAdminPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin');
  const params = searchParams ? await searchParams : {};
  const revenuePeriod = normalizeRevenuePeriod(typeof params?.revenuePeriod === 'string' ? params.revenuePeriod : null);
  const [dashboard, reviewQueue, agentManagement, revenueResult] = await Promise.all([
    getAdminDashboardSnapshot(),
    getAdminReviewQueue(),
    getAdminAgentManagementList(),
    getAdminRevenueAnalytics(revenuePeriod),
  ]);

  const creators = dashboard.creators.creators ?? [];
  const payments = dashboard.payments.payments ?? [];
  const securityReviews = dashboard.security.reviews ?? [];
  const pendingReviews = securityReviews.filter((review) => ['pending', 'in_review'].includes(review.status)).length;
  const routingSummary = buildReviewRoutingSummary(reviewQueue.queue);

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN"
        title="Administration AgentHub Code"
        description="Centre opérationnel beta : validation, runtimes, security review, payments support et sanity checks."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Agents à valider" value={reviewQueue.queue.length} tone={reviewQueue.queue.length > 0 ? 'warning' : 'success'} />
        <AdminStatCard label="Précheck P0" value={routingSummary.counts.P0} tone={routingSummary.counts.P0 > 0 ? 'error' : 'success'} />
        <AdminStatCard label="Précheck P1" value={routingSummary.counts.P1} tone={routingSummary.counts.P1 > 0 ? 'warning' : 'success'} />
        <AdminStatCard label="Agents visibles admin" value={agentManagement.agents.length} />
        <AdminStatCard label="Creators" value={creators.length} />
        <AdminStatCard label="Security reviews ouvertes" value={pendingReviews} tone={pendingReviews > 0 ? 'warning' : 'success'} />
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(dashboard.ops.checks ?? []).map((check) => (
          <AdminStatCard key={check.key} label={check.label} value={check.value} tone={check.tone} />
        ))}
      </section>

      <AdminRevenueOverview result={revenueResult} />

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)] shadow-[0_16px_42px_rgba(109,64,160,0.08)]">
        <div className="border-b border-[#DDD6FE] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">TRIAGE PRÉCHECK</p>
              <h2 className="font-display text-2xl font-bold text-[#111827]">File de décision admin</h2>
              <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                Routage dérivé du manifest et du dernier précheck sécurité enregistré. Il aide à prioriser, sans remplacer la décision admin.
              </p>
            </div>
            <Link href="/code/admin/review" className="rounded-xl border border-[#8B5CF6] bg-white px-4 py-2 text-sm font-semibold text-[#5B21B6] hover:bg-[#F5F3FF]">
              Ouvrir la file review
            </Link>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(routingSummary.counts).map(([priority, value]) => (
              <div key={priority} className="rounded-2xl border border-[#DDD6FE] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-label text-xs text-[#6B3FA0]">{priority}</p>
                  <StatusBadge status={routingToneByPriority[priority]} label={priority === 'P0' ? 'bloquant' : 'tri'} />
                </div>
                <p className="mt-3 font-display text-3xl font-bold text-[#111827]">{value}</p>
              </div>
            ))}
          </div>

          <CodePanel className="bg-white">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-[#111827]">À traiter en premier</h3>
              <StatusBadge status={routingSummary.urgent.length > 0 ? 'in_review' : 'approved'} label={`${routingSummary.urgent.length}`} />
            </div>
            {routingSummary.urgent.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Aucune soumission en attente de tri.</p>
            ) : (
              <div className="grid gap-3">
                {routingSummary.urgent.map(({ agent, routing }) => (
                  <Link key={agent.id} href="/code/admin/review" className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4 transition hover:border-[#8B5CF6] hover:bg-[#FAF7FF]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-base font-bold text-[#111827]">{agent.name}</h4>
                          <StatusBadge status={routingToneByPriority[routing.priority]} label={routing.priority} />
                          {routing.blocksApproval && <StatusBadge status="failed" label="bloque approval" />}
                        </div>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {agent.creatorName || 'Créateur inconnu'} · {formatDate(agent.createdAt)}
                        </p>
                        <p className="mt-2 text-sm leading-5 text-[#4B5563]">{routing.reason}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-[#5B21B6]">
                          {routingActionLabels[routing.nextAction] || routing.nextAction}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {routingOwnerLabels[routing.owner] || routing.owner}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CodePanel>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminQuickLink href="/code/admin/review" title="Validation agents" description="Examiner les soumissions, assets workflow/endpoint, retours admin et publication." />
        <AdminQuickLink href="/code/admin/creators" title="Creators & allowlist" description="Autoriser workflow automation et creator endpoint pour les creators beta." />
        <AdminQuickLink href="/code/admin/security" title="Security Review" description="Préparer et décider les reviews manuelles des runtimes sensibles." />
        <AdminQuickLink href="/code/admin/runtimes" title="Runtimes" description="Piloter les flags runtime globaux avec audit trail." />
        <AdminQuickLink href="/code/admin/payments" title="Payments support" description={`${payments.length} derniers paiements en lecture support.`} />
        <AdminQuickLink href="/code/admin/ops" title="Ops beta" description="Surveiller runs, payments, audit logs et anomalies non destructives." />
      </section>
    </main>
  );
}

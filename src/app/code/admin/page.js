import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminRevenueAnalytics, normalizeRevenuePeriod } from '@/server/analytics/revenue';
import { getAdminDashboardSnapshot } from '@/server/admin/code-admin';
import { getAdminAgentManagementList, getAdminReviewQueue } from '@/server/admin/review-queue';
import { CodePageHeader } from '../_components/code-console-ui';
import { AdminQuickLink, AdminRevenueOverview, AdminStatCard } from './_components/admin-shared';

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

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN"
        title="Administration AgentHub Code"
        description="Centre opérationnel beta : validation, runtimes, security review, payments support et sanity checks."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Agents à valider" value={reviewQueue.queue.length} tone={reviewQueue.queue.length > 0 ? 'warning' : 'success'} />
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

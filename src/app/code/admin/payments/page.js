import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminRevenueAnalytics, normalizeRevenuePeriod } from '@/server/analytics/revenue';
import { getAdminPayments } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader } from '../../_components/code-console-ui';
import { AdminRevenueOverview, EmptyAdminState, PaymentLine } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/payments');
  const params = searchParams ? await searchParams : {};
  const revenuePeriod = normalizeRevenuePeriod(typeof params?.revenuePeriod === 'string' ? params.revenuePeriod : null);
  const [result, revenueResult] = await Promise.all([
    getAdminPayments(),
    getAdminRevenueAnalytics(revenuePeriod),
  ]);

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN PAYMENTS"
        title="Payments support"
        description="Lecture support Stripe sandbox. Aucun remboursement, payout ou action paiement depuis cette page en beta."
      />

      <AdminRevenueOverview result={revenueResult} />

      <section className="mt-6 grid gap-4">
        {result.error && <CodeAlert tone="error">Impossible de charger les paiements.</CodeAlert>}
        {!result.error && result.payments.length === 0 && <EmptyAdminState title="Aucun paiement" text="Les paiements sandbox apparaîtront ici." />}
        {result.payments.map((payment) => (
          <PaymentLine key={payment.id} payment={payment} />
        ))}
      </section>
    </main>
  );
}

import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminPayments } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader } from '../../_components/code-console-ui';
import { EmptyAdminState, PaymentLine } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  await requireAdminAccess('fr', '/code/admin/payments');
  const result = await getAdminPayments();

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN PAYMENTS"
        title="Payments support"
        description="Lecture support Stripe sandbox. Aucun remboursement, payout ou action paiement depuis cette page en beta."
      />

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

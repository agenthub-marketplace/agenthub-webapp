import { requireAuth } from '@/lib/auth/session';
import { getUserPaymentOrders, getUserRentals } from '@/server/rentals/user-rentals';
import DashboardContent from './dashboard-content';

export default async function DashboardPage({ searchParams }) {
  const profile = await requireAuth('fr', '/agenthub/dashboard');
  const { rentals, error } = await getUserRentals(profile.id);
  const { payments, error: paymentsError } = await getUserPaymentOrders(profile.id);
  const params = searchParams ? await searchParams : {};

  return (
    <DashboardContent
      profile={profile}
      betaRentals={rentals}
      betaRentalsError={error}
      paymentOrders={payments}
      paymentOrdersError={paymentsError}
      reviewSubmitted={typeof params?.reviewSubmitted === 'string' ? params.reviewSubmitted : null}
      reviewError={typeof params?.reviewError === 'string' ? params.reviewError : null}
      rentalCreated={typeof params?.rental === 'string' ? params.rental === "created" : false}
      locale="fr"
    />
  );
}

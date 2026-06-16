import { requireAuth } from '@/lib/auth/session';
import { getUserPaymentOrders, getUserRentals } from '@/server/rentals/user-rentals';
import DashboardContent from '../../agenthub/dashboard/dashboard-content';

export default async function DashboardPage({ searchParams }) {
  const profile = await requireAuth('en', '/en/dashboard');
  const [rentalsResult, paymentsResult] = await Promise.all([
    getUserRentals(profile.id),
    getUserPaymentOrders(profile.id),
  ]);
  const { rentals, error } = rentalsResult;
  const { payments, error: paymentsError } = paymentsResult;
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
      codeAccessRequired={params?.codeAccess === "creator-required"}
      locale="en"
    />
  );
}

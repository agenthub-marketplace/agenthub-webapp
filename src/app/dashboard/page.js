import { requireAuth } from '@/lib/auth/session';
import { getUserRentals } from '@/server/rentals/user-rentals';
import DashboardContent from './dashboard-content';

export default async function DashboardPage({ searchParams }) {
  const profile = await requireAuth('fr', '/dashboard');
  const { rentals, error } = await getUserRentals(profile.id);
  const params = searchParams ? await searchParams : {};

  return (
    <DashboardContent
      profile={profile}
      betaRentals={rentals}
      betaRentalsError={error}
      reviewSubmitted={typeof params?.reviewSubmitted === 'string' ? params.reviewSubmitted : null}
      reviewError={typeof params?.reviewError === 'string' ? params.reviewError : null}
      rentalCreated={typeof params?.rental === 'string' ? params.rental === "created" : false}
      locale="fr"
    />
  );
}

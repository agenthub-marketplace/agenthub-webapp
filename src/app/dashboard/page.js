import { requireAuth } from '@/lib/auth/session';
import { getUserRentals } from '@/server/rentals/user-rentals';
import DashboardContent from './dashboard-content';

export default async function DashboardPage() {
  const profile = await requireAuth('fr');
  const { rentals, error } = await getUserRentals(profile.id);

  return <DashboardContent profile={profile} betaRentals={rentals} betaRentalsError={error} />;
}

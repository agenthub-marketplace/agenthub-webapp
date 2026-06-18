import { requireAuth } from '@/lib/auth/session';
import { getUserRentals } from '@/server/rentals/user-rentals';
import ProfileContent from './profile-content';

export default async function ProfilePage() {
  const profile = await requireAuth('fr', '/profile');
  const { rentals, error } = await getUserRentals(profile.id);

  return <ProfileContent profile={profile} rentals={rentals} rentalsError={error} />;
}

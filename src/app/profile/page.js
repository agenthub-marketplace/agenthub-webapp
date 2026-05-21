import { requireAuth } from '@/lib/auth/session';
import ProfileContent from './profile-content';

export default async function ProfilePage() {
  const profile = await requireAuth('fr', '/profile');

  return <ProfileContent profile={profile} />;
}

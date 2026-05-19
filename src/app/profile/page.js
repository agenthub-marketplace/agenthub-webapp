import { requireAuth } from '@/lib/auth/session';
import ProfileContent from './profile-content';

export default async function ProfilePage() {
  const profile = await requireAuth('fr');

  return <ProfileContent profile={profile} />;
}

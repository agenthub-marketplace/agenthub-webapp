import { requireAuth } from '@/lib/auth/session';
import SettingsContent from './settings-content';

export default async function SettingsPage() {
  const profile = await requireAuth('fr');

  return <SettingsContent profile={profile} />;
}

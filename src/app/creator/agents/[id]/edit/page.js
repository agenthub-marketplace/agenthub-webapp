import { requireCreatorAccess } from '@/lib/auth/session';
import EditAgentContent from './edit-agent-content';

export default async function EditAgentPage() {
  const profile = await requireCreatorAccess('fr', '/creator/dashboard');

  return <EditAgentContent profile={profile} />;
}

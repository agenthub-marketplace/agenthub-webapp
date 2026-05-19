import { requireCreatorAccess } from '@/lib/auth/session';
import EditAgentContent from './edit-agent-content';

export default async function EditAgentPage() {
  const profile = await requireCreatorAccess('fr');

  return <EditAgentContent profile={profile} />;
}

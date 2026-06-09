import { getCurrentProfile } from '@/lib/auth/session';
import AgentHubHomeClient from './agenthub-home-client';

export default async function Page() {
  const profile = await getCurrentProfile();

  return <AgentHubHomeClient profile={profile} />;
}

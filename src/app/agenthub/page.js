import { getCurrentProfile } from '@/lib/auth/session';
import { getMarketplaceAgents } from '@/server/marketplace/agents';
import AgentHubHomeClient from './agenthub-home-client';

export default async function Page() {
  const [profile, marketplaceResult] = await Promise.all([
    getCurrentProfile(),
    getMarketplaceAgents({ limit: 6 }),
  ]);

  return (
    <AgentHubHomeClient
      profile={profile}
      featuredAgents={marketplaceResult.agents}
      featuredAgentsError={marketplaceResult.error}
    />
  );
}

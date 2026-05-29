import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentsForUser } from '@/server/agents/creator-agents';
import { getCreatorRentalsForUser } from '@/server/rentals/creator-rentals';
import CodeDashboardContent from '../_components/code-dashboard-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeDashboardPage({ searchParams }) {
  const profile = await requireCreatorAccess('fr', '/code/dashboard');
  const creatorAgentsResult = await getCreatorAgentsForUser();
  const creatorRentalsResult = await getCreatorRentalsForUser();
  const params = searchParams ? await searchParams : {};

  return (
    <CodeDashboardContent
      creatorAgentsResult={creatorAgentsResult}
      creatorRentalsResult={creatorRentalsResult}
      profile={profile}
      submittedSlug={typeof params?.submitted === 'string' ? params.submitted : null}
    />
  );
}

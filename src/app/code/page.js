import { getCreatorAgentsForUser } from '@/server/agents/creator-agents';
import { getCreatorRentalsForUser } from '@/server/rentals/creator-rentals';
import CodeDashboardContent from './_components/code-dashboard-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodePage({ searchParams }) {
  const [creatorAgentsResult, creatorRentalsResult] = await Promise.all([
    getCreatorAgentsForUser(),
    getCreatorRentalsForUser(),
  ]);
  const params = searchParams ? await searchParams : {};

  return (
    <CodeDashboardContent
      creatorAgentsResult={creatorAgentsResult}
      creatorRentalsResult={creatorRentalsResult}
      submittedSlug={typeof params?.submitted === 'string' ? params.submitted : null}
    />
  );
}

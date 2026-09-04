import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentsForUser } from '@/server/agents/creator-agents';
import { getCreatorRevenueAnalyticsForUser, normalizeRevenuePeriod } from '@/server/analytics/revenue';
import { getCreatorRentalsForUser } from '@/server/rentals/creator-rentals';
import CodeDashboardContent from '../_components/code-dashboard-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeDashboardPage({ searchParams }) {
  await requireCreatorAccess('fr', '/code/dashboard');
  const params = searchParams ? await searchParams : {};
  const revenuePeriod = normalizeRevenuePeriod(typeof params?.revenuePeriod === 'string' ? params.revenuePeriod : null);
  const [creatorAgentsResult, creatorRentalsResult, revenueAnalyticsResult] = await Promise.all([
    getCreatorAgentsForUser(),
    getCreatorRentalsForUser(),
    getCreatorRevenueAnalyticsForUser(revenuePeriod),
  ]);

  return (
    <CodeDashboardContent
      creatorAgentsResult={creatorAgentsResult}
      creatorRentalsResult={creatorRentalsResult}
      revenueAnalyticsResult={revenueAnalyticsResult}
      precheckStatus={typeof params?.precheck === 'string' ? params.precheck : null}
      submittedSlug={typeof params?.submitted === 'string' ? params.submitted : null}
    />
  );
}

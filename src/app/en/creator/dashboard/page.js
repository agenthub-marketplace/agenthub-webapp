import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentsForUser } from '@/server/agents/creator-agents';
import CreatorDashboardContent from '../../../creator/dashboard/creator-dashboard-content';

export const dynamic = 'force-dynamic';

export default async function CreatorDashboardPage({ searchParams }) {
  const profile = await requireCreatorAccess('en');
  const creatorAgentsResult = await getCreatorAgentsForUser(profile.id);
  const params = searchParams ? await searchParams : {};

  return (
    <CreatorDashboardContent
      creatorAgentsResult={creatorAgentsResult}
      locale="en"
      profile={profile}
      submittedSlug={typeof params?.submitted === 'string' ? params.submitted : null}
    />
  );
}

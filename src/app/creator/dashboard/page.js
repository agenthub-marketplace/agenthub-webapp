import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentsForUser } from '@/server/agents/creator-agents';
import { getCreatorRentalsForUser } from '@/server/rentals/creator-rentals';
import CreatorDashboardContent from './creator-dashboard-content';

export const dynamic = 'force-dynamic';

export default async function CreatorDashboardPage({ searchParams }) {
  const profile = await requireCreatorAccess('fr', '/creator/dashboard');
  const creatorAgentsResult = await getCreatorAgentsForUser();
  const creatorRentalsResult = await getCreatorRentalsForUser();
  const params = searchParams ? await searchParams : {};

  return (
    <CreatorDashboardContent
      creatorAgentsResult={creatorAgentsResult}
      creatorRentalsResult={creatorRentalsResult}
      locale="fr"
      profile={profile}
      submittedSlug={typeof params?.submitted === 'string' ? params.submitted : null}
    />
  );
}

import { requireCreatorAccess } from '@/lib/auth/session';
import { getAgentCategoryOptions, getCreatorProfileForUser } from '@/server/agents/creator-agents';
import NewAgentContent from './new-agent-content';

export const dynamic = 'force-dynamic';

export default async function NewAgentPage({ searchParams }) {
  const profile = await requireCreatorAccess('fr');
  const creatorProfile = await getCreatorProfileForUser();
  const categories = await getAgentCategoryOptions();
  const params = searchParams ? await searchParams : {};

  return (
    <NewAgentContent
      categories={categories}
      creatorProfileMissing={creatorProfile.creatorProfileMissing}
      error={typeof params?.error === 'string' ? params.error : null}
      locale="fr"
      profile={profile}
      profileError={creatorProfile.error}
    />
  );
}

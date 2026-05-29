import { requireCreatorAccess } from '@/lib/auth/session';
import { getAgentCategoryOptions, getCreatorProfileForUser } from '@/server/agents/creator-agents';
import CodeNewAgentContent from '../../_components/code-new-agent-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeNewAgentPage({ searchParams }) {
  const profile = await requireCreatorAccess('fr', '/code/agents/new');
  const creatorProfile = await getCreatorProfileForUser();
  const categories = await getAgentCategoryOptions();
  const params = searchParams ? await searchParams : {};

  return (
    <CodeNewAgentContent
      categories={categories}
      creatorProfileMissing={creatorProfile.creatorProfileMissing}
      error={typeof params?.error === 'string' ? params.error : null}
      profile={profile}
      profileError={creatorProfile.error}
    />
  );
}

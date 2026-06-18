import { requireCreatorAccess } from '@/lib/auth/session';
import { getAgentCategoryOptions, getCreatorProfileForUser } from '@/server/agents/creator-agents';
import { isCreatorEndpointRuntimeEnabled } from '@/server/endpoints/runtime';
import { isCreatorWorkflowRuntimeEnabled } from '@/server/workflows/runtime';
import CodeNewAgentContent from '../../_components/code-new-agent-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeNewAgentPage({ searchParams }) {
  await requireCreatorAccess('fr', '/code/agents/new');
  const creatorProfile = await getCreatorProfileForUser();
  const categories = await getAgentCategoryOptions();
  const params = searchParams ? await searchParams : {};
  const [canUseWorkflowAutomation, canUseCreatorEndpoint] = creatorProfile.id
    ? await Promise.all([
        isCreatorWorkflowRuntimeEnabled(creatorProfile.id),
        isCreatorEndpointRuntimeEnabled(creatorProfile.id),
      ])
    : [false, false];

  return (
    <CodeNewAgentContent
      canUseCreatorEndpoint={canUseCreatorEndpoint}
      canUseWorkflowAutomation={canUseWorkflowAutomation}
      categories={categories}
      creatorProfileMissing={creatorProfile.creatorProfileMissing}
      draftScopeKey={creatorProfile.id}
      error={typeof params?.error === 'string' ? params.error : null}
      profileError={creatorProfile.error}
    />
  );
}

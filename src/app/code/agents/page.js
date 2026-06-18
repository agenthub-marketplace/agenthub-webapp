import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentsForUser, getCreatorProfileForUser } from '@/server/agents/creator-agents';
import CodeAgentsContent from '../_components/code-agents-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeAgentsPage({ searchParams }) {
  await requireCreatorAccess('fr', '/code/agents');
  const params = searchParams ? await searchParams : {};
  const [creatorAgentsResult, creatorProfile] = await Promise.all([
    getCreatorAgentsForUser(),
    getCreatorProfileForUser(),
  ]);

  return (
    <CodeAgentsContent
      creatorAgentsResult={creatorAgentsResult}
      draftScopeKey={creatorProfile.id}
      precheckStatus={typeof params?.precheck === 'string' ? params.precheck : null}
      submittedSlug={typeof params?.submitted === 'string' ? params.submitted : null}
    />
  );
}

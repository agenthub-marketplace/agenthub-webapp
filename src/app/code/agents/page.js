import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentsForUser } from '@/server/agents/creator-agents';
import CodeAgentsContent from '../_components/code-agents-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeAgentsPage({ searchParams }) {
  await requireCreatorAccess('fr', '/code/agents');
  const params = searchParams ? await searchParams : {};
  const creatorAgentsResult = await getCreatorAgentsForUser();

  return (
    <CodeAgentsContent
      creatorAgentsResult={creatorAgentsResult}
      precheckStatus={typeof params?.precheck === 'string' ? params.precheck : null}
      submittedSlug={typeof params?.submitted === 'string' ? params.submitted : null}
    />
  );
}

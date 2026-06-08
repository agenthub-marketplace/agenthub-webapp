import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentsForUser } from '@/server/agents/creator-agents';
import CodeAgentsContent from '../_components/code-agents-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeAgentsPage() {
  await requireCreatorAccess('fr', '/code/agents');
  const creatorAgentsResult = await getCreatorAgentsForUser();

  return (
    <CodeAgentsContent
      creatorAgentsResult={creatorAgentsResult}
    />
  );
}

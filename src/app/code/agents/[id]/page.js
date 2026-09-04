import { requireCreatorAccess } from '@/lib/auth/session';
import { getCreatorAgentForCodeDetail } from '@/server/agents/creator-agents';
import CodeAgentDetailContent from '../../_components/code-agent-detail-content';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeAgentDetailPage({ params }) {
  const { id } = await params;
  await requireCreatorAccess('fr', `/code/agents/${id}`);
  const agentResult = await getCreatorAgentForCodeDetail(id);

  return <CodeAgentDetailContent agentResult={agentResult} />;
}

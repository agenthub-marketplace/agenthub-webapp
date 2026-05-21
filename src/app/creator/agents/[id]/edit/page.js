import { requireCreatorAccess } from '@/lib/auth/session';
import { getAgentCategoryOptions, getCreatorAgentForEdit } from '@/server/agents/creator-agents';
import EditAgentContent from './edit-agent-content';

export default async function EditAgentPage({ params, searchParams }) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const profile = await requireCreatorAccess('fr', '/creator/dashboard');
  const [agentResult, categories] = await Promise.all([
    getCreatorAgentForEdit(id),
    getAgentCategoryOptions(),
  ]);

  return (
    <EditAgentContent
      agentResult={agentResult}
      categories={categories}
      error={typeof query?.error === 'string' ? query.error : null}
      profile={profile}
    />
  );
}

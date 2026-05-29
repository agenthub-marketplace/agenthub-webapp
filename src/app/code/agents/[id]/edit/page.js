import { requireCreatorAccess } from '@/lib/auth/session';
import { getAgentCategoryOptions, getCreatorAgentForEdit } from '@/server/agents/creator-agents';
import CodeEditAgentContent from '../../../_components/code-edit-agent-content';

export default async function EditAgentPage({ params, searchParams }) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const profile = await requireCreatorAccess('fr', `/code/agents/${id}/edit`);
  const error = typeof query?.error === 'string' ? query.error : null;
  const [agentResult, categories] = await Promise.all([
    getCreatorAgentForEdit(id),
    getAgentCategoryOptions(),
  ]);

  return (
    <CodeEditAgentContent
      agentResult={agentResult}
      categories={categories}
      error={error}
      profile={profile}
    />
  );
}

import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { canAccessCreatorArea } from '@/lib/auth/roles';
import CodeShell from './_components/code-shell';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeLayout({ children }) {
  const profile = await requireAuth('fr', '/code');

  if (!canAccessCreatorArea(profile.role)) {
    redirect('/agenthub/dashboard?codeAccess=creator-required');
  }

  return <CodeShell profile={profile}>{children}</CodeShell>;
}

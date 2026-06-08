import { requireCreatorAccess } from '@/lib/auth/session';
import CodeShell from './_components/code-shell';

export const dynamic = 'force-dynamic';

export default async function AgentHubCodeLayout({ children }) {
  const profile = await requireCreatorAccess('fr', '/code');

  return <CodeShell profile={profile}>{children}</CodeShell>;
}

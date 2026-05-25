import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminAgentManagementList, getAdminReviewQueue } from '@/server/admin/review-queue';
import AdminContent from './admin-content';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }) {
  const profile = await requireAdminAccess('fr', '/admin');
  const reviewQueue = await getAdminReviewQueue();
  const agentManagement = await getAdminAgentManagementList();
  const params = searchParams ? await searchParams : {};

  return (
    <AdminContent
      error={typeof params?.error === 'string' ? params.error : null}
      agentManagement={agentManagement}
      locale="fr"
      moderated={typeof params?.moderated === 'string' ? params.moderated : null}
      profile={profile}
      reviewed={typeof params?.reviewed === 'string' ? params.reviewed : null}
      reviewQueue={reviewQueue}
    />
  );
}

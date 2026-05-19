import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminReviewQueue } from '@/server/admin/review-queue';
import AdminContent from '../../admin/admin-content';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }) {
  const profile = await requireAdminAccess('en');
  const reviewQueue = await getAdminReviewQueue();
  const params = searchParams ? await searchParams : {};

  return (
    <AdminContent
      error={typeof params?.error === 'string' ? params.error : null}
      locale="en"
      profile={profile}
      reviewed={typeof params?.reviewed === 'string' ? params.reviewed : null}
      reviewQueue={reviewQueue}
    />
  );
}

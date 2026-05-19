import { requireAuth } from '@/lib/auth/session';
import DashboardContent from '../../dashboard/dashboard-content';

export default async function DashboardPage() {
  const profile = await requireAuth('en');

  return <DashboardContent profile={profile} />;
}

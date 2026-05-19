import { redirect } from 'next/navigation';

import { requireCreatorAccess } from '@/lib/auth/session';

export default async function CreatorPage() {
  await requireCreatorAccess('fr');

  redirect('/creator/dashboard');
}

import { redirect } from 'next/navigation';

import { requireCreatorAccess } from '@/lib/auth/session';

export default async function CreatorPage() {
  await requireCreatorAccess('en');

  redirect('/en/creator/dashboard');
}

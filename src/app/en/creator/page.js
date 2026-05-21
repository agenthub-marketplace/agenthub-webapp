import { redirect } from 'next/navigation';

import { requireCreatorAccess } from '@/lib/auth/session';

export default async function CreatorPage() {
  await requireCreatorAccess('en', '/en/creator');

  redirect('/en/creator/dashboard');
}

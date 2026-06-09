import { Suspense } from 'react';
import SearchClient from '../../search/search-client';
import { getCurrentProfile } from '@/lib/auth/session';
import { getMarketplaceAgents } from '@/server/marketplace/agents';

export default async function EnglishSearchPage() {
  const profile = await getCurrentProfile();
  const { agents, categories, error } = await getMarketplaceAgents();

  return (
    <Suspense fallback={null}>
      <SearchClient initialAgents={agents} initialCategories={categories} loadError={error} locale="en" profile={profile} />
    </Suspense>
  );
}

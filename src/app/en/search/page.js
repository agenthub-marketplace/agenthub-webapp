import { Suspense } from 'react';
import SearchClient from '../../search/search-client';
import { getCurrentProfile } from '@/lib/auth/session';
import { getMarketplaceAgents } from '@/server/marketplace/agents';

export default async function EnglishSearchPage() {
  const [profile, marketplace] = await Promise.all([
    getCurrentProfile(),
    getMarketplaceAgents(),
  ]);
  const { agents, categories, error } = marketplace;

  return (
    <Suspense fallback={null}>
      <SearchClient initialAgents={agents} initialCategories={categories} loadError={error} locale="en" profile={profile} />
    </Suspense>
  );
}

import { Suspense } from 'react';
import SearchClient from '../../search/search-client';
import { getMarketplaceAgents } from '@/server/marketplace/agents';

export default async function EnglishSearchPage() {
  const { agents, categories, error } = await getMarketplaceAgents();

  return (
    <Suspense fallback={null}>
      <SearchClient initialAgents={agents} initialCategories={categories} loadError={error} locale="en" />
    </Suspense>
  );
}

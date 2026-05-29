import { Suspense } from 'react';
import SearchClient from '../../search/search-client';
import { getMarketplaceAgents } from '@/server/marketplace/agents';

export default async function AgentHubSearchPage() {
  const { agents, categories, error } = await getMarketplaceAgents();

  return (
    <Suspense fallback={null}>
      <SearchClient initialAgents={agents} initialCategories={categories} loadError={error} locale="fr" />
    </Suspense>
  );
}

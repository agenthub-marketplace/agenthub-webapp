import SearchClient from './search-client';
import { getMarketplaceAgents } from '@/server/marketplace/agents';

export default async function Page() {
  const { agents, categories, error } = await getMarketplaceAgents();

  return <SearchClient initialAgents={agents} initialCategories={categories} loadError={error} locale="fr" />;
}

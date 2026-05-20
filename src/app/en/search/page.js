import SearchClient from '../../search/search-client';
import { getMarketplaceAgents } from '@/server/marketplace/agents';

export default async function EnglishSearchPage() {
  const { agents, categories, error } = await getMarketplaceAgents();

  return <SearchClient initialAgents={agents} initialCategories={categories} loadError={error} locale="en" />;
}

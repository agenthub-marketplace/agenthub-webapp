import { Suspense } from 'react';
import SearchClient from '../../search/search-client';
import { getCurrentProfile } from '@/lib/auth/session';
import { getMarketplaceAgents } from '@/server/marketplace/agents';
import { getUserRentals } from '@/server/rentals/user-rentals';

function SearchFallback() {
  return (
    <main className="min-h-screen bg-[#080612] px-4 py-10 text-[#F5F1FA]">
      <div className="container">
        <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
          <p className="font-label text-xs text-[#B794F4]">Marketplace</p>
          <h1 className="font-display mt-3 text-3xl font-bold">Chargement des agents</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#C8B1E4]">
            AgentHub prépare les filtres, les agents live et les recommandations beta.
          </p>
        </div>
      </div>
    </main>
  );
}

async function getUserSearchResume(profile) {
  if (!profile?.id) {
    return null;
  }

  const { rentals } = await getUserRentals(profile.id);
  const activeRentals = rentals.filter((rental) => rental.accessOpen && rental.agent?.slug);

  if (activeRentals.length === 0) {
    return null;
  }

  const runCandidate = activeRentals.find((rental) => !rental.hasSuccessfulRun);
  const reviewCandidate = activeRentals.find((rental) => rental.hasSuccessfulRun && !rental.review);
  const candidate = runCandidate ?? reviewCandidate ?? activeRentals[0];

  return {
    activeCount: activeRentals.length,
    agentName: candidate.agent?.name ?? 'Agent AgentHub',
    href: `/agenthub/workspace/${candidate.id}`,
    kind: runCandidate ? 'first_run' : reviewCandidate ? 'review' : 'continue',
    runCount: candidate.runSummary?.total ?? 0,
  };
}

export default async function AgentHubSearchPage() {
  const [profile, marketplace] = await Promise.all([
    getCurrentProfile(),
    getMarketplaceAgents(),
  ]);
  const userResume = await getUserSearchResume(profile);
  const { agents, categories, error } = marketplace;

  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchClient
        initialAgents={agents}
        initialCategories={categories}
        loadError={error}
        locale="fr"
        profile={profile}
        userResume={userResume}
      />
    </Suspense>
  );
}

import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { getCurrentProfile } from '@/lib/auth/session';
import { getLeaderboardAgents } from '@/server/marketplace/leaderboard';
import { ArrowRight, BarChart3, Grid2X2, List, RotateCcw, ShieldCheck, Star, Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';

const periodOptions = [
  { value: 'week', label: '7 jours' },
  { value: 'month', label: '30 jours' },
  { value: 'all', label: 'Depuis le lancement' },
];

const sortOptions = [
  { value: 'score', label: 'Score AgentHub' },
  { value: 'access', label: 'Accès activés' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'reviews', label: 'Avis vérifiés' },
  { value: 'newest', label: 'Plus récents' },
];

function readParam(searchParams, key, fallback) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return typeof value === 'string' && value ? value : fallback;
}

function leaderboardHref(current, updates) {
  const params = new URLSearchParams();
  const next = { ...current, ...updates };

  for (const [key, value] of Object.entries(next)) {
    if (!value || (key === 'cat' && value === 'all') || (key === 'period' && value === 'month') || (key === 'sort' && value === 'score') || (key === 'view' && value === 'table')) {
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return query ? `/leaderboard?${query}` : '/leaderboard';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatRating(agent) {
  return agent.reviews > 0 ? Number(agent.rating).toFixed(1) : 'Nouveau';
}

function formatScore(score) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(score);
}

function StatBlock({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-[#251A40] bg-[#0F0A1E] p-4">
      <p className="font-label text-[10px] text-[#9B72CF]">{label}</p>
      <p className="font-stat mt-2 text-2xl text-[#F5F1FA]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#A78BCF]">{sub}</p>}
    </div>
  );
}

function PodiumCard({ agent }) {
  const isFirst = agent.rank === 1;

  return (
    <Link
      href={`/agenthub/agents/${agent.slug}`}
      className={`card-hover rounded-2xl border p-5 text-center ${isFirst ? 'border-[#532B88] bg-[#1A1130] shadow-[0_0_32px_rgba(139,92,246,0.22)]' : 'border-[#2F184B] bg-[#0F0B22]'}`}
    >
      <p className={`font-display font-bold ${isFirst ? 'text-5xl text-[#F4EFFA]' : 'text-4xl text-[#C8B1E4]'}`}>{agent.rank}</p>
      <div className="my-4 flex justify-center">
        <AgentAvatar index={agent.gradient} size={isFirst ? 'lg' : 'md'} shape="circle" />
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <h2 className="font-display text-lg font-bold text-[#F5F1FA]">{agent.name}</h2>
        {agent.certified && <ShieldCheck className="h-4 w-4 text-[#10B981]" />}
      </div>
      <p className="mt-1 text-xs text-[#A78BCF]">par {agent.creator.name}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <span className="rounded-xl bg-[#15112A] px-2 py-2 text-[#D6C5E8]">
          <strong className="font-stat block text-[#F5F1FA]">{agent.periodAccesses}</strong>
          accès
        </span>
        <span className="rounded-xl bg-[#15112A] px-2 py-2 text-[#D6C5E8]">
          <strong className="font-stat block text-[#F5F1FA]">{formatRating(agent)}</strong>
          note
        </span>
        <span className="rounded-xl bg-[#15112A] px-2 py-2 text-[#D6C5E8]">
          <strong className="font-stat block text-[#F5F1FA]">{formatScore(agent.score)}</strong>
          score
        </span>
      </div>
    </Link>
  );
}

export default async function LeaderboardPage({ searchParams }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const current = {
    cat: readParam(resolvedSearchParams, 'cat', 'all'),
    period: readParam(resolvedSearchParams, 'period', 'month'),
    sort: readParam(resolvedSearchParams, 'sort', 'score'),
    view: readParam(resolvedSearchParams, 'view', 'table'),
  };
  const [profile, leaderboard] = await Promise.all([
    getCurrentProfile(),
    getLeaderboardAgents({
      category: current.cat,
      period: current.period,
      sort: current.sort,
    }),
  ]);
  const { agents, categories, error, period, sort, updatedAt } = leaderboard;
  const view = current.view === 'cards' ? 'cards' : 'table';
  const totalPeriodAccesses = agents.reduce((sum, agent) => sum + agent.periodAccesses, 0);
  const reviewedAgents = agents.filter((agent) => agent.reviews > 0);
  const averageRating = reviewedAgents.length
    ? reviewedAgents.reduce((sum, agent) => sum + agent.rating, 0) / reviewedAgents.length
    : 0;
  const topAgents = agents.slice(0, 3);

  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      <main className="container px-4 py-10">
        <section className="mb-8 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#532B88]/40 bg-[#1A152F] px-3 py-1">
            <Trophy className="h-3.5 w-3.5 text-[#8B5CF6]" />
            <span className="font-label text-xs text-[#8B5CF6]">Mis à jour le {formatDate(updatedAt)}</span>
          </div>
          <h1 className="font-display mb-3 text-4xl font-bold text-[#F5F1FA] md:text-6xl">Classement des agents</h1>
          <p className="mx-auto max-w-2xl text-lg text-[#D6C5E8]">
            Agents approuvés de la marketplace, classés par accès backend, avis vérifiés et qualité de publication.
          </p>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#F59E0B]/40 bg-[#1A1130] px-4 py-3 text-sm text-[#F6C177]">
            Certaines métriques backend sont temporairement indisponibles. Le classement reste limité aux données marketplace disponibles.
          </div>
        )}

        <section className="mb-6 grid gap-3 md:grid-cols-3">
          <StatBlock label="Agents marketplace" value={agents.length} sub="agents approuvés dans ce classement" />
          <StatBlock label="Accès sur la période" value={totalPeriodAccesses} sub={period === 'all' ? 'tous les accès comptabilisés' : 'issus de rental_requests'} />
          <StatBlock label="Note moyenne" value={averageRating ? averageRating.toFixed(1) : 'Nouveau'} sub="basée sur les avis vérifiés" />
        </section>

        <section className="mb-8 rounded-2xl border border-[#251A40] bg-[#110D24] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <Link
                  key={option.value}
                  href={leaderboardHref(current, { period: option.value })}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${period === option.value ? 'bg-[#532B88] text-white' : 'border border-[#251A40] text-[#A78BCF] hover:border-[#8B5CF6] hover:text-white'}`}
                >
                  {option.label}
                </Link>
              ))}
            </div>

            <form action="/leaderboard" className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input type="hidden" name="period" value={period} />
              <input type="hidden" name="view" value={view} />
              <select name="cat" defaultValue={current.cat} className="h-10 rounded-xl border border-[#251A40] bg-[#0F0A1E] px-3 text-sm text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none">
                <option value="all">Toutes catégories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <select name="sort" defaultValue={sort} className="h-10 rounded-xl border border-[#251A40] bg-[#0F0A1E] px-3 text-sm text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Button className="h-10 rounded-xl border-0 bg-[#532B88] px-4 text-white hover:bg-[#7C3AED]">
                Appliquer
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Link
                href={leaderboardHref(current, { view: 'table' })}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${view === 'table' ? 'border-[#532B88] bg-[#251A40] text-white' : 'border-[#251A40] text-[#A78BCF] hover:text-white'}`}
                aria-label="Vue tableau"
              >
                <List className="h-4 w-4" />
              </Link>
              <Link
                href={leaderboardHref(current, { view: 'cards' })}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${view === 'cards' ? 'border-[#532B88] bg-[#251A40] text-white' : 'border-[#251A40] text-[#A78BCF] hover:text-white'}`}
                aria-label="Vue cartes"
              >
                <Grid2X2 className="h-4 w-4" />
              </Link>
              <Link href="/leaderboard" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#251A40] text-[#A78BCF] transition-colors hover:text-white" aria-label="Réinitialiser">
                <RotateCcw className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {topAgents.length > 0 && (
          <section className="mb-10 overflow-hidden rounded-2xl border border-[#251A40] bg-gradient-to-br from-[#1A152F] via-[#15112A] to-[#0F0B22] p-5 md:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-label text-xs text-[#9B72CF]">Top de la période</p>
                <h2 className="font-display text-2xl font-bold text-[#F5F1FA]">Agents les plus solides</h2>
              </div>
              <BarChart3 className="h-6 w-6 text-[#8B5CF6]" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {topAgents.map((agent) => <PodiumCard key={agent.id} agent={agent} />)}
            </div>
          </section>
        )}

        {agents.length === 0 ? (
          <section className="rounded-2xl border border-[#251A40] bg-[#0F0A1E] px-6 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-[#F5F1FA]">Aucun agent à classer</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#A78BCF]">
              Les agents approuvés de la marketplace apparaîtront ici dès qu’ils seront disponibles pour cette catégorie.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild className="rounded-xl border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                <Link href="/agenthub/search">Voir la marketplace</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-[#2F184B] bg-transparent text-[#D6C5E8] hover:bg-[#15112A] hover:text-white">
                <Link href="/leaderboard">Réinitialiser</Link>
              </Button>
            </div>
          </section>
        ) : view === 'table' ? (
          <section className="overflow-x-auto rounded-2xl border border-[#251A40] bg-[#110D24]">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[#251A40] text-[10px] text-[#A78BCF]">
                  <th className="p-4 text-left font-label">Rang</th>
                  <th className="text-left font-label">Agent</th>
                  <th className="text-left font-label">Créateur</th>
                  <th className="text-left font-label">Catégorie</th>
                  <th className="text-right font-label">Accès</th>
                  <th className="text-right font-label">Avis</th>
                  <th className="text-right font-label">Score</th>
                  <th className="p-4 text-right font-label">Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className={`border-b border-[#251A40] hover:bg-[#1A152F] ${agent.rank === 1 ? 'bg-[#1A1130]' : ''}`}>
                    <td className="p-4 font-stat text-[#F5F1FA]">{agent.rank}</td>
                    <td>
                      <Link href={`/agenthub/agents/${agent.slug}`} className="flex items-center gap-3">
                        <AgentAvatar index={agent.gradient} size="xs" />
                        <span className="font-display font-semibold text-[#F5F1FA]">{agent.name}</span>
                        {agent.certified && <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />}
                      </Link>
                    </td>
                    <td className="text-[#A78BCF]">{agent.creator.name}</td>
                    <td>
                      <span className="rounded-full bg-[#1A152F] px-2 py-1 text-[10px] text-[#D6C5E8]">{agent.category}</span>
                    </td>
                    <td className="text-right font-stat text-[#F5F1FA]">{agent.periodAccesses}</td>
                    <td className="text-right text-[#F5F1FA]">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        {formatRating(agent)}
                        <span className="text-[#A78BCF]">({agent.reviews})</span>
                      </span>
                    </td>
                    <td className="text-right font-stat text-[#F5F1FA]">{formatScore(agent.score)}</td>
                    <td className="p-4 text-right">
                      <Button asChild size="sm" className="rounded-xl border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                        <Link href={`/agenthub/agents/${agent.slug}`}>
                          Activer
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {agents.map((agent) => (
              <div key={agent.id} className="relative">
                <div className={`absolute -left-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border font-stat text-base font-bold ${agent.rank === 1 ? 'border-[#532B88] bg-[#1A1130] text-[#F4EFFA]' : 'border-[#2F184B] bg-[#0F0B22] text-[#C8B1E4]'}`}>
                  {agent.rank}
                </div>
                <AgentCard agent={agent} />
              </div>
            ))}
          </section>
        )}

        <section className="mt-12 rounded-2xl border border-[#251A40] bg-gradient-to-br from-[#1A152F] to-[#110D24] p-8 text-center">
          <h2 className="font-display mb-2 text-2xl font-bold text-[#F5F1FA] md:text-3xl">Rejoindre le classement</h2>
          <p className="mb-5 text-[#A78BCF]">Publiez un agent, passez la revue admin, puis accumulez des activations et des avis vérifiés.</p>
          <Button asChild className="h-11 rounded-xl border-0 bg-[#532B88] px-6 text-white hover:bg-[#7C3AED]">
            <Link href="/onboarding/creator">
              Créer mon agent
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}

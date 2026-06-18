'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, Box, Code2, History, Search, Sparkles } from 'lucide-react';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import UserOnboardingModal from '@/components/onboarding/UserOnboardingModal';
import {
  formatRecentAgentViewedAt,
  getLegacyRecentAgentStorageKey,
  getRecentAgentStorageKey,
  parseRecentAgentsFromStorage,
} from '@/lib/recent-agents';

export default function AgentHubHomeClient({ featuredAgents = [], featuredAgentsError = null, profile = null }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentAgents, setRecentAgents] = useState([]);
  const recentAgentStorageKey = getRecentAgentStorageKey(profile);
  const legacyRecentAgentStorageKey = getLegacyRecentAgentStorageKey(profile);
  const liveFeaturedAgents = Array.isArray(featuredAgents) ? featuredAgents : [];
  const isSignedIn = Boolean(profile);
  const canAccessCode = profile?.role === 'creator' || profile?.role === 'admin';
  const displayName = profile?.displayName || profile?.email?.replace(/@.*$/, '') || null;
  const firstName = displayName?.split(/[.\s_-]+/).filter(Boolean)[0] || null;
  const heroStatus = isSignedIn
    ? canAccessCode
      ? {
          eyebrow: `Session ${profile.role === 'admin' ? 'admin' : 'créateur'}`,
          headline: firstName ? `Bon retour, ${firstName}.` : 'Bon retour dans AgentHub.',
          detail: 'Passez de la découverte à l’action: piloter vos agents, reprendre un workspace ou ouvrir AgentHub Code.',
        }
      : {
          eyebrow: 'Session utilisateur',
          headline: firstName ? `Bon retour, ${firstName}.` : 'Bon retour sur AgentHub.',
          detail: 'Reprenez vos agents actifs, relouez depuis l’historique ou trouvez le prochain agent à tester.',
        }
    : {
        eyebrow: 'Marketplace beta',
        headline: 'Trouvez l’agent IA adapté.',
        detail: 'Explorez les agents publiés, activez un accès sandbox et testez le résultat dans votre workspace.',
      };
  const quickSearches = [
    {
      label: 'Trier un ticket support',
      query: 'support triage priorité catégorie',
    },
    {
      label: 'Qualifier un lead',
      query: 'lead qualification score next action',
    },
    {
      label: 'Réécrire un texte',
      query: 'rewrite texte assistant',
    },
    {
      label: 'Résumer des notes',
      query: 'meeting notes résumé checklist',
    },
  ];
  const loopCards = isSignedIn
    ? [
        {
          detail: 'Accès actifs, historique, avis et prochaines actions.',
          href: '/agenthub/dashboard',
          icon: Box,
          label: 'Reprendre mes agents',
        },
        {
          detail: 'Ouvrir rapidement un workspace actif ou relouer depuis l’historique.',
          href: '/agenthub/workspace',
          icon: Bot,
          label: 'Continuer un workspace',
        },
        ...(canAccessCode
          ? [
              {
                detail: 'Créer, publier et piloter vos agents beta.',
                href: '/code',
                icon: Code2,
                label: 'Passer à AgentHub Code',
              },
            ]
          : [
              {
                detail: 'Trouver un nouvel agent adapté à votre prochaine tâche.',
                href: '/agenthub/search',
                icon: Sparkles,
                label: 'Explorer le catalogue',
              },
            ]),
      ]
    : [
        {
          detail: 'Comparez les agents live par besoin, type d’exécution et preuve beta.',
          href: '/agenthub/search',
          icon: Search,
          label: 'Explorer',
        },
        {
          detail: 'Activez un accès sandbox, puis lancez l’agent dans le workspace.',
          href: '/auth/signup',
          icon: Bot,
          label: 'Tester un agent',
        },
        {
          detail: 'Créateurs: préparez vos agents depuis AgentHub Code.',
          href: '/onboarding/creator',
          icon: Code2,
          label: 'Devenir créateur',
        },
      ];

  const goToSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/agenthub/search?q=${encodeURIComponent(value)}` : '/agenthub/search');
  };

  const goToQuickSearch = (value) => {
    router.push(`/agenthub/search?q=${encodeURIComponent(value)}`);
  };

  useEffect(() => {
    const loadRecentAgents = () => {
      try {
        setRecentAgents(
          parseRecentAgentsFromStorage(
            window.localStorage,
            recentAgentStorageKey,
            legacyRecentAgentStorageKey,
          ),
        );
      } catch {
        setRecentAgents([]);
      }
    };

    loadRecentAgents();
    const refreshTimer = window.setInterval(loadRecentAgents, 60000);
    window.addEventListener('agenthub:recent-agents-updated', loadRecentAgents);
    window.addEventListener('storage', loadRecentAgents);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('agenthub:recent-agents-updated', loadRecentAgents);
      window.removeEventListener('storage', loadRecentAgents);
    };
  }, [legacyRecentAgentStorageKey, recentAgentStorageKey]);

  return (
    <div className="min-h-screen bg-[#080612]">
      <UserOnboardingModal />
      <AgentHubNavbar profile={profile} />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-gradient" />
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
        <div className="pointer-events-none absolute left-[-8rem] top-24 h-80 w-80 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-[-6rem] top-12 h-96 w-96 rounded-full bg-[#F2E9D8]/7 blur-3xl" />

        <div className="container relative px-4 pb-14 pt-24 sm:pb-16 sm:pt-20 lg:pb-20">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#33214F] bg-[#0F0A1E]/78 px-4 py-2 text-xs font-semibold text-[#D8B4FE] shadow-[0_12px_38px_rgba(0,0,0,0.18)]">
              <Sparkles className="h-3.5 w-3.5" />
              {heroStatus.eyebrow}
            </div>
            <h1 className="font-display mx-auto max-w-4xl text-[2.65rem] font-bold leading-[1.04] tracking-tight text-[#F5F1FA] sm:text-5xl lg:text-6xl">
              {heroStatus.headline}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#BCA8D8] sm:text-base">
              {heroStatus.detail}
            </p>

            <form onSubmit={goToSearch} className="mx-auto mt-8 max-w-3xl">
              <div className="flex flex-col gap-3 rounded-3xl border border-[#33214F] bg-[#0F0A1E]/80 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A78BCF]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher un agent, un besoin, une tâche..."
                    className="h-14 w-full rounded-2xl border border-transparent bg-[#110D24] pl-12 pr-4 text-sm text-[#F5F1FA] outline-none transition-all placeholder:text-[#A78BCF]/65 focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 sm:text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-semibold text-[#110D24] transition-all hover:bg-[#F2E9D8] sm:min-w-48"
                >
                  Découvrir les agents
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
              {quickSearches.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goToQuickSearch(item.query)}
                  className="rounded-full border border-[#33214F] bg-[#0F0A1E]/70 px-3 py-1.5 text-xs font-semibold text-[#D8B4FE] transition-colors hover:border-[#8B5CF6] hover:bg-[#17102D] hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mx-auto mt-6 grid max-w-5xl gap-3 text-left md:grid-cols-3">
              {loopCards.map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    key={card.label}
                    href={card.href}
                    className="group rounded-2xl border border-[#33214F] bg-[#0F0A1E]/72 p-4 text-[#D6C5E8] transition-all hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:bg-[#17102D]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#33214F] bg-[#110D24] text-[#B794F4] transition-colors group-hover:border-[#8B5CF6] group-hover:text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#A78BCF] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                    <p className="font-display text-base font-bold text-[#F5F1FA]">{card.label}</p>
                    <p className="mt-2 text-xs leading-5 text-[#A78BCF]">{card.detail}</p>
                  </Link>
                );
              })}
            </div>

            {recentAgents.length > 0 && (
              <div className="mx-auto mt-5 max-w-5xl rounded-3xl border border-[#33214F] bg-[#0F0A1E]/76 p-4 text-left shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-label flex items-center gap-1.5 text-xs text-[#B794F4]">
                      <History className="h-3.5 w-3.5" />
                      Vus récemment
                    </p>
                    <p className="mt-1 text-sm text-[#A78BCF]">
                      Reprenez une fiche consultée sans repasser par toute la marketplace.
                    </p>
                  </div>
                  <Link href="/agenthub/search" className="text-xs font-semibold text-[#D8B4FE] hover:text-white">
                    Explorer plus
                  </Link>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {recentAgents.slice(0, 3).map((agent) => (
                    <Link
                      key={agent.slug}
                      href={`/agenthub/agents/${agent.slug}`}
                      className="group rounded-2xl border border-[#2F184B] bg-[#080612] p-3 transition-colors hover:border-[#8B5CF6] hover:bg-[#17102D]"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <p className="line-clamp-1 font-display text-sm font-bold text-[#F5F1FA]">{agent.name}</p>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#A78BCF] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                      </div>
                      <p className="line-clamp-2 text-xs leading-5 text-[#A78BCF]">{agent.pitch || 'Fiche agent consultée récemment.'}</p>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7F6B9C]">
                        {formatRecentAgentViewedAt(agent.viewedAt, 'fr')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {agent.runtimeLabel && (
                          <span className="rounded-full border border-[#2F184B] px-2 py-0.5 text-[10px] font-semibold text-[#D8B4FE]">
                            {agent.runtimeLabel}
                          </span>
                        )}
                        {agent.category && (
                          <span className="rounded-full border border-[#2F184B] px-2 py-0.5 text-[10px] font-semibold text-[#A78BCF]">
                            {agent.category}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-light">
        <div className="container px-4 py-16">
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-label mb-3 text-xs text-[#A78BCF]">Agents recommandés</p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#F5F1FA] sm:text-4xl">À explorer</h2>
            </div>
            <Link
              href="/agenthub/search"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1A152F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2D1F50]"
            >
              Voir tous les agents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {liveFeaturedAgents.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {liveFeaturedAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#251A40] bg-[#110D24] p-8 text-[#C8B1E4]">
              <p className="font-display text-2xl font-bold text-[#F5F1FA]">
                {featuredAgentsError ? 'Les agents live ne chargent pas pour le moment.' : 'Les premiers agents arrivent.'}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A78BCF]">
                {featuredAgentsError
                  ? 'La marketplace reste accessible, mais cette sélection ne peut pas être affichée maintenant.'
                  : 'Dès qu’un agent est approuvé, il apparaîtra ici. En attendant, explorez la marketplace ou revenez après validation admin.'}
              </p>
              <Link
                href="/agenthub/search"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
              >
                Ouvrir la marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

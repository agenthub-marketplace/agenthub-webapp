'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Search,
} from 'lucide-react';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import UserOnboardingModal from '@/components/onboarding/UserOnboardingModal';
import { agentsList } from '@/lib/mock-data';

function Page() {
  const [query, setQuery] = useState('');
  const featuredAgents = agentsList.slice(0, 6);

  const goToSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    window.location.href = value ? `/agenthub/search?q=${encodeURIComponent(value)}` : '/agenthub/search';
  };

  return (
    <div className="min-h-screen bg-[#080612]">
      <UserOnboardingModal />
      <AgentHubNavbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-gradient" />
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
        <div className="pointer-events-none absolute left-[-8rem] top-24 h-80 w-80 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-[-6rem] top-12 h-96 w-96 rounded-full bg-[#F2E9D8]/7 blur-3xl" />

        <div className="container relative px-4 pb-14 pt-24 sm:pb-16 sm:pt-20 lg:pb-20">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="font-display mx-auto max-w-4xl text-[2.65rem] font-bold leading-[1.04] tracking-tight text-[#F5F1FA] sm:text-5xl lg:text-6xl">
              Trouvez l’agent IA adapté.
            </h1>

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

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {featuredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Page;

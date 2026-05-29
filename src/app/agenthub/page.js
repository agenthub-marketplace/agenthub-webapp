'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import { agentsList, testimonials } from '@/lib/mock-data';

const useCases = [
  {
    title: 'Documents juridiques',
    description: 'Contrats, NDA, clauses et documents prêts à adapter.',
    icon: FileText,
    accent: 'from-[#8B5CF6]/25 to-[#F2E9D8]/10',
  },
  {
    title: 'Business & admin',
    description: 'Emails, synthèses, comptes rendus et tâches opérationnelles.',
    icon: BriefcaseBusiness,
    accent: 'from-[#A78BCF]/25 to-[#8B5CF6]/10',
  },
  {
    title: 'Recrutement',
    description: 'Fiches de poste, scoring CV et messages candidats.',
    icon: Users,
    accent: 'from-[#F2E9D8]/18 to-[#8B5CF6]/10',
  },
  {
    title: 'Automatisation',
    description: 'Agents conçus pour accélérer les actions répétitives.',
    icon: Zap,
    accent: 'from-[#8B5CF6]/20 to-[#A78BCF]/12',
  },
];

const trustStats = [
  { value: '24+', label: 'agents disponibles' },
  { value: '4.8/5', label: 'note moyenne' },
  { value: '12k+', label: 'utilisations lancées' },
];

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
      <AgentHubNavbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-gradient" />
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
        <div className="pointer-events-none absolute left-[-8rem] top-24 h-80 w-80 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-[-6rem] top-12 h-96 w-96 rounded-full bg-[#F2E9D8]/7 blur-3xl" />

        <div className="container relative px-4 pb-16 pt-24 sm:pb-20 sm:pt-20 lg:pb-24">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="font-display mx-auto max-w-6xl text-[2.45rem] font-bold leading-[1.04] tracking-tight text-[#F5F1FA] sm:text-5xl lg:text-6xl">
              <span className="block">La marketplace des agents IA</span>
              <span className="block">qui répond vraiment à vos besoins,</span>
              <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-[#A78BCF] via-[#8B5CF6] to-[#F2E9D8]">
                selon votre usage
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#D6C5E8] sm:text-lg">
              Explorez des agents spécialisés, louez ceux qui correspondent à votre besoin et lancez vos missions en quelques secondes.
            </p>

            <form onSubmit={goToSearch} className="mx-auto mt-9 max-w-3xl">
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

          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-3">
            {trustStats.map((stat) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-3xl border border-[#33214F] bg-[#110D24]/80 px-6 py-6 text-center shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent" />
                <p className="font-stat text-4xl leading-none text-[#F5F1FA] sm:text-5xl">{stat.value}</p>
                <p className="font-label mt-3 text-[11px] text-[#A78BCF]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container px-4 py-14 sm:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label mb-3 text-xs text-[#A78BCF]">Usages populaires</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#F5F1FA] sm:text-4xl">Commencez par votre besoin</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {useCases.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href="/agenthub/search"
                className="card-hover group relative min-h-52 overflow-hidden rounded-2xl border border-[#251A40] bg-[#110D24] p-6"
              >
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${item.accent}`} />
                <div className="relative">
                  <span className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#33214F] bg-[#1A152F] text-[#D6C5E8]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#F5F1FA]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#A78BCF]">{item.description}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#D6C5E8] transition-colors group-hover:text-white">
                    Explorer
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-light">
        <div className="container px-4 py-16">
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-label mb-3 text-xs text-[#A78BCF]">Agents recommandés</p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#F5F1FA] sm:text-4xl">Sélectionnés pour démarrer vite</h2>
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

      <section className="container px-4 py-16">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="rounded-3xl border border-[#251A40] bg-[#110D24] p-7 sm:p-8">
            <p className="font-label mb-3 text-xs text-[#A78BCF]">Communauté AgentHub</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#F5F1FA] sm:text-4xl">
              Des agents validés par des créateurs sérieux.
            </h2>
            <p className="mt-5 leading-7 text-[#D6C5E8]">
              Découvrez des agents publiés par des créateurs, testés pour des usages concrets et suivis par la communauté AgentHub.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Agents vérifiés', icon: ShieldCheck },
                { label: 'Créateurs identifiés', icon: Users },
                { label: 'Tendances visibles', icon: BarChart3 },
                { label: 'Nouveaux agents chaque semaine', icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#251A40] bg-[#0F0A1E] px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#251A40] text-[#A78BCF]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-[#F5F1FA]">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-[#251A40] bg-[#110D24] p-7 sm:p-8">
            <p className="font-label mb-3 text-xs text-[#A78BCF]">Avis utilisateurs</p>
            <div className="grid gap-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-2xl border border-[#251A40] bg-[#0F0A1E] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-3 flex gap-1">
                      {Array.from({ length: testimonial.stars }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                      ))}
                    </div>
                    <p className="text-sm leading-6 text-[#F5F1FA]">« {testimonial.quote} »</p>
                  </div>
                  <div className="flex min-w-36 items-center gap-3 sm:justify-end">
                    <div className="font-stat flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] text-sm text-white">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-[#F5F1FA]">{testimonial.name}</p>
                      <p className="text-xs text-[#A78BCF]">{testimonial.job}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Page;

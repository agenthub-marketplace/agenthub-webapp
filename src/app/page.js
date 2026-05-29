'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Box, CheckCircle2, Code2, GitBranch, Layers3, MessagesSquare, Rocket, Search, TerminalSquare, Users } from 'lucide-react';

const choices = {
  agenthub: {
    href: '/agenthub',
    eyebrow: 'Utiliser',
    title: 'AgentHub',
    prompt: 'Choisis ton espace',
    description: 'Trouve, loue et utilise des agents IA vérifiés.',
    icon: Box,
    action: 'Explorer AgentHub',
    features: ['Agents vérifiés', 'Accès immédiat', 'Communautés'],
    cards: [
      { label: 'des agents IA uniques', value: 'Découvrir', icon: Search },
      { label: 'à des modèles conçus selon vos besoins', value: 'Accéder', icon: MessagesSquare },
    ],
    panel: 'bg-[#080612] text-[#F5F1FA]',
    overlay: {
      background:
        'radial-gradient(circle at 25% 20%, rgba(139,92,246,0.26), transparent 34%), linear-gradient(145deg, #17102C 0%, #080612 68%)',
    },
    chip: 'border-[#33214F] bg-[#110D24]/80 text-[#D6C5E8]',
    button: 'bg-white text-[#120C22]',
    ghost: 'text-[#A78BCF]',
  },
  code: {
    href: '/code',
    eyebrow: 'Créer',
    title: 'AgentHub',
    titleSuffix: 'Code',
    description: 'Crée, publie et pilote tes agents sur AgentHub Code.',
    icon: Code2,
    action: 'Ouvrir AgentHub Code',
    features: ['Console créateur', 'Templates', 'Dashboard'],
    cards: [
      { label: 'vos agents IA', value: 'Publier', icon: Rocket },
      { label: 'avec votre communauté', value: 'Interagir', icon: Users },
    ],
    panel: 'bg-[#F7F8FC] text-[#111827]',
    overlay: {
      background:
        'radial-gradient(circle at 74% 20%, rgba(124,58,237,0.12), transparent 34%), linear-gradient(145deg, #FFFFFF 0%, #EEF1F8 100%)',
    },
    chip: 'border-[#D8DDEE] bg-white/80 text-[#5B6175]',
    button: 'bg-[#111827] text-white',
    ghost: 'text-[#6B7280]',
  },
};

export default function PortalPage() {
  const router = useRouter();

  const enterSpace = (key) => {
    router.push(choices[key].href);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#080612]">
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_18px_rgba(139,92,246,0.28)]">
              <Image src="/logo.png" alt="AgentHub" width={36} height={36} className="object-contain p-1" priority />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white drop-shadow-sm">AgentHub</span>
          </Link>
        </div>
      </header>

      <section className="flex min-h-screen flex-col md:flex-row">
        {Object.entries(choices).map(([key, choice]) => {
          const Icon = choice.icon;

          return (
            <button
              key={key}
              type="button"
              onClick={() => enterSpace(key)}
              className={`group relative flex min-h-[50vh] flex-1 overflow-hidden px-6 pb-10 pt-28 text-left md:min-h-screen md:px-10 lg:px-16 ${
                choice.panel
              }`}
              aria-label={`Entrer dans ${choice.title}`}
            >
              <div className="absolute inset-0" style={choice.overlay} />
              <div className="relative z-10 flex w-full flex-col justify-end md:justify-center">
                <div
                  className={`mb-9 flex items-center gap-4 ${
                    key === 'agenthub' ? 'md:ml-auto md:mr-24 lg:mr-32' : 'md:ml-24 lg:ml-32'
                  }`}
                >
                  <span className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border backdrop-blur ${choice.chip}`}>
                    <span className="absolute inset-2 rotate-45 rounded-md border border-current opacity-20" />
                    <Icon className="relative h-4 w-4" />
                  </span>
                  <span className={`h-px w-12 ${key === 'code' ? 'bg-[#CBD2E3]' : 'bg-[#3B245C]'}`} />
                  <span className={`font-label text-xs ${choice.ghost}`}>{choice.eyebrow}</span>
                </div>

                <div className="max-w-xl lg:max-w-2xl">
                  {choice.prompt && <p className={`font-label mb-3 text-xs ${choice.ghost}`}>{choice.prompt}</p>}
                  <h1 className="font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl lg:text-7xl">
                    {choice.title}
                    {choice.titleSuffix && (
                      <span className="mt-1 block translate-x-32 text-4xl font-medium italic leading-none tracking-tight text-[#6B3FA0] sm:translate-x-44 sm:text-5xl lg:translate-x-56 lg:text-6xl">
                        {choice.titleSuffix}
                      </span>
                    )}
                  </h1>
                  <p className={`mt-5 max-w-md text-lg leading-8 ${key === 'code' ? 'text-[#4B5563]' : 'text-[#D6C5E8]'}`}>
                    {choice.description}
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  {choice.features.map((feature) => (
                    <span
                      key={feature}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        key === 'code'
                          ? 'border-[#D8DDEE] bg-white/70 text-[#4B5563]'
                          : 'border-[#33214F] bg-[#110D24]/70 text-[#D6C5E8]'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-7 grid max-w-md grid-cols-2 gap-3">
                  {choice.cards.map((card) => {
                    const CardIcon = card.icon;

                    return (
                    <span
                      key={`${card.value}-${card.label}`}
                      className={`min-h-[118px] rounded-2xl border p-4 transition-colors ${
                        key === 'code'
                          ? 'border-[#D8DDEE] bg-white/45 text-[#111827] shadow-none group-hover:border-[#8B5CF6]/45'
                          : 'border-[#33214F] bg-[#110D24]/70 text-[#F5F1FA] group-hover:border-[#6B3FA0]/70'
                      }`}
                    >
                      <span className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${key === 'code' ? 'bg-[#F1F3F8] text-[#6B3FA0]' : 'bg-[#251A40] text-[#D6C5E8]'}`}>
                        <CardIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="block font-display text-lg font-bold leading-snug">{card.value}</span>
                      {card.label && (
                        <span className={`mt-1 block leading-5 ${key === 'code' ? 'text-sm text-[#6B7280]' : 'text-sm text-[#A78BCF]'}`}>
                          {card.label}
                        </span>
                      )}
                    </span>
                    );
                  })}
                </div>

                <div
                  className={`mt-8 inline-flex w-fit items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition-transform group-hover:translate-x-1 ${choice.button}`}
                >
                  {choice.action}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div
                className={`absolute top-28 hidden rounded-[2rem] border p-4 opacity-80 backdrop-blur md:block ${
                  key === 'code'
                    ? 'right-12 border-[#D8DDEE] bg-white/60 text-[#111827]'
                    : 'left-12 border-[#33214F] bg-[#110D24]/55 text-[#F5F1FA]'
                }`}
              >
                <div className="grid grid-cols-2 gap-2">
                  {(key === 'code' ? [GitBranch, Rocket, TerminalSquare, Users] : [Layers3, Search, MessagesSquare, ArrowRight]).map((DecorIcon, index) => (
                    <span key={index} className={`flex h-10 w-10 items-center justify-center rounded-xl ${key === 'code' ? 'bg-[#F1F3F8] text-[#6B3FA0]' : 'bg-[#1A152F] text-[#A78BCF]'}`}>
                      <DecorIcon className="h-4 w-4" />
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
}

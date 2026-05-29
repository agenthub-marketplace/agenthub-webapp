import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import AgentHubCodeShell from '@/components/AgentHubCodeShell';
import { Button } from '@/components/ui/button';

const creatorStats = [
  { value: '01', label: 'Préparer', text: 'Structurez votre fiche agent, ses inputs et ses livrables.' },
  { value: '02', label: 'Publier', text: 'Soumettez votre agent IA pour revue avant mise en ligne.' },
  { value: '03', label: 'Piloter', text: 'Suivez vos agents, vos retours et votre communauté.' },
];

const benefits = [
  {
    icon: Rocket,
    title: 'Publier vos agents IA',
    text: 'Transformez une expertise, un prompt avancé ou un workflow en offre claire pour les utilisateurs AgentHub.',
  },
  {
    icon: ShieldCheck,
    title: 'Passer une validation lisible',
    text: 'Chaque fiche est cadrée autour de la promesse, des limites, des inputs et des livrables attendus.',
  },
  {
    icon: Users,
    title: 'Interagir avec votre communauté',
    text: 'Centralisez les retours, les accès et les prochaines améliorations depuis votre espace créateur.',
  },
];

const consolePreview = [
  { icon: Gauge, label: 'Dashboard', value: 'Vue globale', tone: 'bg-[#EEF1F8] text-[#6B3FA0]' },
  { icon: ClipboardCheck, label: 'Validation', value: '2 agents à corriger', tone: 'bg-[#FFF7ED] text-[#B45309]' },
  { icon: MessageSquare, label: 'Communauté', value: 'Retours récents', tone: 'bg-[#ECFDF5] text-[#047857]' },
];

const workflow = [
  'Choisissez un template ou partez d’une fiche vide.',
  'Décrivez précisément ce que l’agent promet de livrer.',
  'Ajoutez les inputs nécessaires, les limites et le mode d’accès.',
  'Soumettez la fiche, puis suivez les retours depuis votre dashboard.',
];

const qualityChecklist = [
  'Une promesse claire',
  'Des inputs utiles',
  'Des livrables précis',
  'Des limites visibles',
];

export default function AgentHubCodePage() {
  return (
    <AgentHubCodeShell>
      <main className="bg-[#F7F8FC]">
        <section className="relative overflow-hidden border-b border-[#E3E7F2] bg-white">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/50 to-transparent" />
          <div className="container grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <p className="font-label mb-4 text-xs text-[#6B3FA0]">AGENTHUB CODE</p>
              <h1 className="font-display max-w-4xl text-4xl font-bold leading-tight text-[#111827] md:text-6xl">
                Le studio pour publier et piloter vos agents IA.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4B5563]">
                Créez une offre claire, passez la validation AgentHub et suivez vos agents depuis une console pensée pour les créateurs.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/code/dashboard">
                  <Button className="h-12 border-0 bg-[#111827] px-6 text-white shadow-sm hover:bg-[#2B1A44]">
                    Ouvrir la console
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/code/agents/new">
                  <Button variant="outline" className="h-12 border-[#D8DDEE] bg-white px-6 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                    Créer un agent
                  </Button>
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-[#D8DDEE] bg-[#FBFCFF] p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-bold text-[#111827]">Console créateur</p>
                  <p className="text-sm text-[#6B7280]">Pilotage, validation, communauté</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-white">
                  <BarChart3 className="h-5 w-5" />
                </span>
              </div>
              <div className="grid gap-3">
                {consolePreview.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#E3E7F2] bg-white p-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                      <p className="text-sm text-[#6B7280]">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="container grid gap-4 py-10 md:grid-cols-3">
          {creatorStats.map((stat) => (
            <article key={stat.label} className="rounded-2xl border border-[#D8DDEE] bg-white p-5 shadow-sm">
              <p className="font-stat text-sm text-[#6B3FA0]">{stat.value}</p>
              <h2 className="mt-3 font-display text-xl font-bold text-[#111827]">{stat.label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#4B5563]">{stat.text}</p>
            </article>
          ))}
        </section>

        <section className="bg-[#F1F3F8]">
          <div className="container py-14 md:py-16">
            <div className="mb-8 max-w-2xl">
              <p className="font-label mb-3 text-xs text-[#6B3FA0]">POUR LES CRÉATEURS</p>
              <h2 className="font-display text-3xl font-bold text-[#111827] md:text-4xl">Une console claire pour transformer vos agents en produits.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-2xl border border-[#D8DDEE] bg-white p-6 shadow-sm">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                    <benefit.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#111827]">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#4B5563]">{benefit.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container grid gap-8 py-14 md:py-16 lg:grid-cols-[360px_1fr]">
          <div>
            <p className="font-label mb-3 text-xs text-[#6B3FA0]">GUIDE EXPRESS</p>
            <h2 className="font-display text-3xl font-bold text-[#111827]">Une fiche agent prête à être validée.</h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Gardez uniquement ce qui aide un utilisateur à comprendre votre agent avant de l’activer.
            </p>
            <div className="mt-5 grid gap-2">
              {qualityChecklist.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-full border border-[#D8DDEE] bg-white px-3 py-2 text-sm font-medium text-[#4B5563]">
                  <CheckCircle2 className="h-4 w-4 text-[#6B3FA0]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-[#D8DDEE] bg-white p-6 shadow-sm">
            <p className="font-label mb-4 text-xs text-[#6B3FA0]">DE L’IDÉE À LA PUBLICATION</p>
            <ol className="grid gap-4 md:grid-cols-2">
              {workflow.map((step, index) => (
                <li key={step} className="rounded-2xl border border-[#E3E7F2] bg-[#FBFCFF] p-4">
                  <span className="font-stat text-sm text-[#6B3FA0]">0{index + 1}</span>
                  <p className="mt-3 text-sm leading-6 text-[#4B5563]">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="container pb-16">
          <div className="rounded-3xl border border-[#D8DDEE] bg-[#111827] p-6 text-white shadow-sm md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#C4B5FD]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl font-bold">Prêt à créer votre premier agent ?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D1D5DB]">
                  Lancez une fiche, choisissez un template et préparez une soumission claire pour la marketplace.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/code/agents/new">
                  <Button className="h-11 border-0 bg-white px-5 text-[#111827] hover:bg-[#F1F3F8]">
                    Créer un agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AgentHubCodeShell>
  );
}

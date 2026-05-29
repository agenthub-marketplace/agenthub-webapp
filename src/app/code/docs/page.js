import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  ListChecks,
  MessageSquareText,
  PenLine,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import AgentHubCodeShell from '@/components/AgentHubCodeShell';
import { Button } from '@/components/ui/button';

const guideSections = [
  {
    icon: PenLine,
    title: 'Préparer sa fiche agent',
    text: 'Commencez par une promesse simple: pour qui l’agent existe, quel problème il résout et quel livrable il produit.',
  },
  {
    icon: Layers3,
    title: 'Choisir un template',
    text: 'Utilisez un modèle pour accélérer la structure, puis adaptez les champs à votre agent et à son cas d’usage réel.',
  },
  {
    icon: ClipboardList,
    title: 'Décrire les inputs',
    text: 'Listez uniquement les informations nécessaires: contexte, fichiers, préférences, ton, contraintes ou exemples.',
  },
  {
    icon: FileText,
    title: 'Définir les livrables',
    text: 'Expliquez ce que l’utilisateur reçoit: document, synthèse, message, analyse, plan d’action ou automatisation.',
  },
  {
    icon: ShieldCheck,
    title: 'Passer la validation',
    text: 'AgentHub vérifie la clarté de la fiche, la cohérence de la promesse, les limites et la qualité de l’expérience.',
  },
  {
    icon: MessageSquareText,
    title: 'Après publication',
    text: 'Suivez l’activité, les retours et les améliorations à apporter depuis votre dashboard créateur.',
  },
];

const checklist = [
  'Le titre explique clairement le rôle de l’agent.',
  'La promesse est concrète et vérifiable.',
  'Les inputs demandés sont utiles et compréhensibles.',
  'Le livrable final est décrit avec précision.',
  'Les limites de l’agent sont visibles avant activation.',
  'La fiche ne promet pas un résultat impossible à garantir.',
];

const templates = [
  {
    title: 'Agent de rédaction',
    tag: 'Contenu',
    text: 'Pour transformer un brief, une note ou une idée en livrable éditorial structuré.',
  },
  {
    title: 'Agent d’analyse',
    tag: 'Décision',
    text: 'Pour synthétiser des données, comparer des options ou produire une recommandation.',
  },
  {
    title: 'Agent d’automatisation',
    tag: 'Workflow',
    text: 'Pour cadrer une suite d’actions répétables avec inputs, étapes et résultat attendu.',
  },
];

const validationSteps = [
  { label: 'Lisibilité', text: 'Un utilisateur comprend la valeur en moins de quelques secondes.' },
  { label: 'Fiabilité', text: 'Les limites, prérequis et livrables évitent les attentes floues.' },
  { label: 'Exploitation', text: 'La fiche donne assez de contexte pour lancer un workspace propre.' },
];

export default function AgentHubCodeDocsPage() {
  return (
    <AgentHubCodeShell>
      <main className="bg-[#F7F8FC]">
        <section className="border-b border-[#E3E7F2] bg-white">
          <div className="container grid gap-8 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="font-label mb-4 text-xs text-[#6B3FA0]">GUIDE CRÉATEUR</p>
              <h1 className="font-display max-w-4xl text-4xl font-bold leading-tight text-[#111827] md:text-6xl">
                Construire une fiche agent claire avant publication.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4B5563]">
                Une bonne fiche AgentHub Code explique la promesse, les inputs, les livrables et les limites sans forcer l’utilisateur à deviner.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/code/agents/new">
                  <Button className="h-12 border-0 bg-[#111827] px-6 text-white shadow-sm hover:bg-[#2B1A44]">
                    Créer un agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/code/dashboard">
                  <Button variant="outline" className="h-12 border-[#D8DDEE] bg-white px-6 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                    Ouvrir le dashboard
                  </Button>
                </Link>
              </div>
            </div>
            <aside className="rounded-3xl border border-[#D8DDEE] bg-[#FBFCFF] p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6B3FA0]">
                  <ListChecks className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-[#111827]">Avant soumission</p>
                  <p className="text-sm text-[#6B7280]">6 points à verrouiller</p>
                </div>
              </div>
              <div className="space-y-3">
                {checklist.slice(0, 4).map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-[#E3E7F2] bg-white p-3 text-sm leading-6 text-[#4B5563]">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#6B3FA0]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="container py-14 md:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="font-label mb-3 text-xs text-[#6B3FA0]">STRUCTURE</p>
            <h2 className="font-display text-3xl font-bold text-[#111827] md:text-4xl">Les blocs essentiels d’un agent publiable.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {guideSections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-[#D8DDEE] bg-white p-6 shadow-sm">
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                  <section.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-xl font-bold text-[#111827]">{section.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4B5563]">{section.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#F1F3F8]">
          <div className="container grid gap-8 py-14 md:py-16 lg:grid-cols-[360px_1fr]">
            <div>
              <p className="font-label mb-3 text-xs text-[#6B3FA0]">TEMPLATES</p>
              <h2 className="font-display text-3xl font-bold text-[#111827]">Partir d’un modèle, puis préciser.</h2>
              <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                Les templates servent de cadre. Le niveau de détail de votre fiche reste ce qui donne confiance aux utilisateurs.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <article key={template.title} className="rounded-2xl border border-[#D8DDEE] bg-white p-5 shadow-sm">
                  <span className="inline-flex rounded-full border border-[#D8DDEE] bg-[#FBFCFF] px-3 py-1 text-xs font-semibold text-[#6B3FA0]">
                    {template.tag}
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-[#111827]">{template.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{template.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container grid gap-8 py-14 md:py-16 lg:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-[#D8DDEE] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="font-display text-3xl font-bold text-[#111827]">Ce que la validation regarde.</h2>
            <div className="mt-6 grid gap-4">
              {validationSteps.map((step) => (
                <div key={step.label} className="rounded-2xl border border-[#E3E7F2] bg-[#FBFCFF] p-4">
                  <p className="font-display text-lg font-bold text-[#111827]">{step.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#4B5563]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-[#D8DDEE] bg-[#111827] p-6 text-white shadow-sm md:p-8">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#C4B5FD]">
              <TerminalSquare className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold">Checklist complète</h2>
            <ul className="mt-6 space-y-4">
              {checklist.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-[#D1D5DB]">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#A78BFA]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="container pb-16">
          <div className="rounded-3xl border border-[#D8DDEE] bg-white p-6 shadow-sm md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl font-bold text-[#111827]">Après publication, suivez vos agents.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5563]">
                  Le dashboard rassemble vos agents, leurs statuts, les retours et l’activité utile pour améliorer votre offre.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/code/dashboard">
                  <Button className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44]">
                    Ouvrir le dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/code/agents/new">
                  <Button variant="outline" className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                    Créer un agent
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

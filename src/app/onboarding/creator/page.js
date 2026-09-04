import Link from 'next/link';
import { ArrowRight, CheckCircle2, Code2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { getCurrentProfile } from '@/lib/auth/session';
import { canAccessAdminArea, canAccessCreatorArea } from '@/lib/auth/roles';

const creatorSteps = [
  {
    detail: 'Partez d’un template ou d’une création libre dans AgentHub Code.',
    label: 'Construire une fiche agent',
  },
  {
    detail: 'Définissez les inputs, les livrables, les limites et le type d’exécution.',
    label: 'Compléter le contrat agent',
  },
  {
    detail: 'L’équipe admin valide la qualité, le runtime et les garde-fous sécurité.',
    label: 'Passer la review AgentHub',
  },
  {
    detail: 'Une fois approuvé, l’agent apparaît dans la marketplace et peut être testé.',
    label: 'Publier en beta',
  },
];

const creatorBenefits = [
  'Templates assistant, workflow et API creator selon vos droits beta.',
  'Review admin structurée avant publication.',
  'Historique des runs, avis vérifiés et GMV sandbox dans AgentHub Code.',
  'Aucun payout réel en beta : les revenus affichés sont des montants sandbox.',
];

function creatorAccessState(profile) {
  if (!profile) {
    return {
      ctaHref: '/auth/signup?next=/onboarding/creator',
      ctaLabel: 'Créer un compte',
      detail: 'Créez un compte, puis demandez ou activez le rôle créateur pour accéder à AgentHub Code.',
      label: 'Compte requis',
      score: 25,
      steps: [
        { done: false, label: 'Compte AgentHub' },
        { done: false, label: 'Rôle créateur' },
        { done: false, label: 'Premier agent' },
      ],
    };
  }

  if (canAccessAdminArea(profile.role)) {
    return {
      ctaHref: '/code/admin',
      ctaLabel: 'Ouvrir l’admin Code',
      detail: 'Vous pouvez gérer les creators, les runtimes, les reviews sécurité et la publication des agents.',
      label: 'Admin prêt',
      score: 100,
      steps: [
        { done: true, label: 'Compte actif' },
        { done: true, label: 'Accès Code' },
        { done: true, label: 'Administration' },
      ],
    };
  }

  if (canAccessCreatorArea(profile.role)) {
    return {
      ctaHref: '/code/agents/new',
      ctaLabel: 'Créer un agent',
      detail: 'Votre accès créateur est actif. La prochaine victoire est une fiche agent testable envoyée en review.',
      label: 'Créateur prêt',
      score: 75,
      steps: [
        { done: true, label: 'Compte actif' },
        { done: true, label: 'Rôle créateur' },
        { done: false, label: 'Premier agent' },
      ],
    };
  }

  return {
    ctaHref: '/agenthub/dashboard',
    ctaLabel: 'Retour dashboard',
    detail: 'Votre compte est utilisateur. AgentHub Code restera fermé tant que le rôle créateur n’est pas activé.',
    label: 'Rôle créateur requis',
    score: 40,
    steps: [
      { done: true, label: 'Compte actif' },
      { done: false, label: 'Rôle créateur' },
      { done: false, label: 'Accès Code' },
    ],
  };
}

function CreatorAccessStatus({ profile }) {
  const state = creatorAccessState(profile);

  return (
    <div className="rounded-3xl border border-[#8B5CF6]/35 bg-[#0F0A1E] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-label text-xs text-[#B794F4]">Statut d’accès</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#F5F1FA]">{state.label}</h2>
        </div>
        <span className="font-stat rounded-full border border-[#8B5CF6]/40 bg-[#251A40] px-3 py-1.5 text-lg text-[#D8B4FE]">
          {state.score}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#251A40]">
        <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${state.score}%` }} />
      </div>
      <p className="mt-4 text-sm leading-6 text-[#D6C5E8]">{state.detail}</p>
      <div className="mt-4 grid gap-2">
        {state.steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
              step.done
                ? 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]'
                : 'border-[#2F184B] bg-[#080612] text-[#A78BCF]'
            }`}
          >
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${step.done ? 'text-[#10B981]' : 'text-[#4A3D6B]'}`} />
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <Link
        href={state.ctaHref}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
      >
        {state.ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CreatorCta({ profile }) {
  if (!profile) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/auth/signup?next=/onboarding/creator">
          <Button className="h-12 border-0 bg-white px-6 text-[#110D24] hover:bg-[#F2E9D8]">
            Créer un compte
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/auth/login?next=/onboarding/creator">
          <Button variant="outline" className="h-12 border-[#6B3FA0] bg-transparent px-6 text-[#D6C5E8] hover:bg-[#1A152F] hover:text-white">
            Me connecter
          </Button>
        </Link>
      </div>
    );
  }

  if (canAccessAdminArea(profile.role)) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/code/admin">
          <Button className="h-12 border-0 bg-white px-6 text-[#110D24] hover:bg-[#F2E9D8]">
            Ouvrir l’administration Code
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/code/agents/new">
          <Button variant="outline" className="h-12 border-[#6B3FA0] bg-transparent px-6 text-[#D6C5E8] hover:bg-[#1A152F] hover:text-white">
            Créer un agent
          </Button>
        </Link>
      </div>
    );
  }

  if (canAccessCreatorArea(profile.role)) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/code/agents/new">
          <Button className="h-12 border-0 bg-white px-6 text-[#110D24] hover:bg-[#F2E9D8]">
            Créer mon premier agent
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/code">
          <Button variant="outline" className="h-12 border-[#6B3FA0] bg-transparent px-6 text-[#D6C5E8] hover:bg-[#1A152F] hover:text-white">
            Ouvrir AgentHub Code
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4">
      <p className="font-display text-lg font-bold text-[#F6C177]">Accès créateur requis</p>
      <p className="mt-2 text-sm leading-6 text-[#D6C5E8]">
        Votre compte est actuellement un compte utilisateur. Demandez l’activation du rôle créateur à l’équipe AgentHub, puis revenez ici pour ouvrir AgentHub Code.
      </p>
      <Link href="/agenthub/dashboard" className="mt-4 inline-flex text-sm font-semibold text-[#F5F1FA] hover:text-white">
        Retour à mon dashboard
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function CreatorOnboardingPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-[#080612] text-[#F5F1FA]">
      <AgentHubNavbar profile={profile} />
      <main className="container px-4 py-10">
        <section className="overflow-hidden rounded-3xl border border-[#2F184B] bg-[radial-gradient(circle_at_top_left,#35215B_0%,#110D24_48%,#080612_100%)] p-6 shadow-[0_24px_80px_rgba(8,6,18,0.45)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/45 bg-[#1A152F] px-3 py-1.5 text-xs font-semibold text-[#D8B4FE]">
                <Sparkles className="h-3.5 w-3.5" />
                AgentHub Code
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-[#F5F1FA] md:text-6xl">
                Publier un agent IA testable, pas une promesse vide.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#D6C5E8]">
                AgentHub Code est la console créateur : templates, contrat agent, runtimes beta, review admin, workspace, runs stockés et avis vérifiés.
              </p>
              <div className="mt-7">
                <CreatorCta profile={profile} />
              </div>
            </div>
            <div className="rounded-3xl border border-[#8B5CF6]/35 bg-[#0F0A1E] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-label text-xs text-[#B794F4]">Beta creator</p>
                <Trophy className="h-5 w-5 text-[#D8B4FE]" />
              </div>
              <div className="space-y-3">
                {creatorBenefits.map((benefit) => (
                  <div key={benefit} className="flex gap-3 rounded-2xl border border-[#2F184B] bg-[#080612] p-3 text-sm leading-6 text-[#D6C5E8]">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#10B981]" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
            <p className="font-label mb-2 text-xs text-[#B794F4]">Parcours publication</p>
            <h2 className="font-display text-2xl font-bold text-[#F5F1FA]">La boucle créateur en beta</h2>
            <div className="mt-5 space-y-3">
              {creatorSteps.map((step, index) => (
                <div key={step.label} className="flex gap-4 rounded-2xl border border-[#251A40] bg-[#080612] p-4">
                  <span className="font-stat text-2xl text-[#8B5CF6]">0{index + 1}</span>
                  <div>
                    <p className="font-display font-bold text-[#F5F1FA]">{step.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#A78BCF]">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <CreatorAccessStatus profile={profile} />

            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <div className="mb-4 flex items-center gap-3">
                <Code2 className="h-5 w-5 text-[#D8B4FE]" />
                <h2 className="font-display text-2xl font-bold text-[#F5F1FA]">Ce que vous pouvez créer maintenant</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Assistant IA guidé', 'Disponible par défaut pour créer vite une expérience workspace utile.'],
                  ['Agent workflow', 'Disponible aux creators allowlistés pour des étapes LLM et décisions structurées.'],
                  ['Agent API creator', 'Disponible aux creators allowlistés avec endpoint HTTPS approuvé.'],
                  ['Code package', 'Prévu plus tard avec sandbox et security review avancée.'],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-2xl border border-[#251A40] bg-[#080612] p-4">
                    <p className="font-display font-bold text-[#F5F1FA]">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#A78BCF]">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#F59E0B]/35 bg-[#1A1208] p-6">
              <div className="mb-3 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#F6C177]" />
                <h2 className="font-display text-xl font-bold text-[#F6C177]">Important beta</h2>
              </div>
              <p className="text-sm leading-6 text-[#FDE68A]">
                Les paiements restent en Stripe sandbox. Aucun payout creator réel n’est actif tant que Stripe Connect n’est pas lancé. Cette étape valide la valeur produit, pas le revenu réel.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer compact />
    </div>
  );
}

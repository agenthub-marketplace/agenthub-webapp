'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bot, CheckCircle2, Clock, Plus, ShieldAlert } from 'lucide-react';

const copy = {
  fr: {
    eyebrow: 'Mode créateur',
    title: 'Tableau de bord créateur',
    subtitle: 'Gérez vos agents soumis à validation et suivez leur statut beta.',
    create: 'Soumettre un agent',
    realAgents: 'Agents soumis',
    emptyTitle: 'Aucun agent soumis',
    emptyText: 'Créez votre premier agent pour démarrer la validation manuelle AgentHub.',
    missingTitle: 'Profil créateur requis',
    missingText:
      'Ce compte a accès à l’espace créateur, mais aucun creator_profile ne lui est lié. Un admin peut accéder à cette page, mais il ne peut lister ou créer que ses propres agents.',
    loadError: 'Impossible de charger vos agents pour le moment.',
    submitted: 'Agent soumis pour validation. Il apparaît maintenant dans votre espace créateur.',
    stripeTitle: 'Stripe Connect prévu',
    stripeText: 'La monétisation créateur sera activée plus tard. Aucun paiement réel n’est traité dans cette beta.',
    statuses: {
      draft: 'Brouillon',
      submitted: 'Soumis',
      in_review: 'En revue',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      suspended: 'Suspendu',
    },
  },
  en: {
    eyebrow: 'Creator mode',
    title: 'Creator dashboard',
    subtitle: 'Manage submitted agents and track their beta review status.',
    create: 'Submit an agent',
    realAgents: 'Submitted agents',
    emptyTitle: 'No submitted agents',
    emptyText: 'Create your first agent to start AgentHub manual validation.',
    missingTitle: 'Creator profile required',
    missingText:
      'This account can access the creator area, but no creator_profile is linked to it. An admin can access this page, but can only list or create their own agents.',
    loadError: 'Could not load your agents right now.',
    submitted: 'Agent submitted for review. It now appears in your creator workspace.',
    stripeTitle: 'Stripe Connect planned',
    stripeText: 'Creator monetization will be enabled later. No real payments are processed in this beta.',
    statuses: {
      draft: 'Draft',
      submitted: 'Submitted',
      in_review: 'In review',
      approved: 'Approved',
      rejected: 'Rejected',
      suspended: 'Suspended',
    },
  },
};

const statusTone = {
  draft: 'border-[#6F5B8F]/40 bg-[#6F5B8F]/10 text-[#C8B1E4]',
  submitted: 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F6C177]',
  in_review: 'border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#C4B5FD]',
  approved: 'border-[#10B981]/40 bg-[#10B981]/10 text-[#6EE7B7]',
  rejected: 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]',
  suspended: 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]',
};

function StatusBadge({ label, status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-label ${statusTone[status] || statusTone.draft}`}>
      {label}
    </span>
  );
}

function Panel({ children, className = '' }) {
  return <div className={`rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5 ${className}`}>{children}</div>;
}

export default function CreatorDashboardContent({
  creatorAgentsResult,
  locale = 'fr',
  profile,
  submittedSlug,
}) {
  const t = copy[locale] || copy.fr;
  const agents = creatorAgentsResult?.agents ?? [];
  const hasProfile = !creatorAgentsResult?.creatorProfileMissing;
  const newAgentPath = locale === 'en' ? '/en/creator/agents/new' : '/creator/agents/new';

  const stats = [
    { label: t.statuses.submitted, value: agents.filter((agent) => agent.status === 'submitted').length },
    { label: t.statuses.in_review, value: agents.filter((agent) => agent.status === 'in_review').length },
    { label: t.statuses.approved, value: agents.filter((agent) => agent.status === 'approved').length },
    { label: t.statuses.rejected, value: agents.filter((agent) => agent.status === 'rejected').length },
  ];

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-label mb-2 text-xs text-[#9B72CF]">{t.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold text-[#F4EFFA] md:text-5xl">{t.title}</h1>
            <p className="mt-2 text-[#C8B1E4]">{t.subtitle}</p>
          </div>
          {hasProfile ? (
            <Link href={newAgentPath}>
              <Button className="h-11 border-0 bg-[#532B88] px-5 text-white glow-primary hover:bg-[#7C3AED]">
                <Plus className="mr-2 h-4 w-4" />
                {t.create}
              </Button>
            </Link>
          ) : (
            <Button disabled className="h-11 border-0 bg-[#532B88] px-5 text-white glow-primary hover:bg-[#7C3AED] disabled:opacity-50">
              <Plus className="mr-2 h-4 w-4" />
              {t.create}
            </Button>
          )}
        </div>

        {submittedSlug && (
          <div className="mb-6 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t.submitted}
            </div>
          </div>
        )}

        {creatorAgentsResult?.creatorProfileMissing && (
          <Panel className="mb-6 border-[#F59E0B]/35 bg-[#F59E0B]/10">
            <div className="flex gap-3 text-[#F6C177]">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="font-display text-lg font-bold text-[#F4EFFA]">{t.missingTitle}</h2>
                <p className="mt-1 text-sm leading-relaxed">{t.missingText}</p>
              </div>
            </div>
          </Panel>
        )}

        {creatorAgentsResult?.error && (
          <Panel className="mb-6 border-[#EF4444]/35 bg-[#EF4444]/10">
            <div className="flex items-center gap-2 text-sm text-[#FCA5A5]">
              <AlertTriangle className="h-4 w-4" />
              {t.loadError}
            </div>
          </Panel>
        )}

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Panel key={stat.label}>
              <p className="font-label mb-2 text-xs text-[#9B72CF]">{stat.label}</p>
              <p className="font-stat text-3xl text-[#F4EFFA] glow-text">{stat.value}</p>
            </Panel>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E]">
            <div className="flex items-center justify-between border-b border-[#2F184B] p-5">
              <h2 className="font-display text-xl font-bold text-[#F4EFFA]">{t.realAgents}</h2>
              <span className="font-stat text-sm text-[#9B72CF]">{agents.length}</span>
            </div>

            {agents.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#F4EFFA]">{t.emptyTitle}</h3>
                <p className="mt-2 max-w-md text-sm text-[#C8B1E4]">{t.emptyText}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2F184B]">
                {agents.map((agent) => (
                  <article key={agent.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-[#F4EFFA]">{agent.name}</h3>
                        <StatusBadge status={agent.status} label={t.statuses[agent.status] || agent.status} />
                      </div>
                      <p className="text-sm text-[#C8B1E4]">{agent.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#9B72CF]">
                        {agent.categoryName && <span>{agent.categoryName}</span>}
                        <span>{agent.pricingType}</span>
                        <span>{agent.riskLevel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#9B72CF]">
                      <Clock className="h-4 w-4" />
                      {new Date(agent.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <Panel>
            <p className="font-label mb-2 text-xs text-[#9B72CF]">{t.stripeTitle}</p>
            <p className="text-sm leading-relaxed text-[#C8B1E4]">{t.stripeText}</p>
          </Panel>
        </div>
      </main>
      <Footer />
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AgentHubCodeNavbar from '@/components/AgentHubCodeNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bot, CheckCircle2, Clock, Euro, Plus, ShieldAlert, Sparkles, Users } from 'lucide-react';

const copy = {
  fr: {
    eyebrow: 'Mode créateur',
    title: 'Console AgentHub Code',
    subtitle: 'Publiez, suivez la validation et pilotez l’activité de vos agents.',
    create: 'Créer un agent',
    realAgents: 'Agents soumis',
    emptyTitle: 'Aucun agent soumis',
    emptyText: 'Créez votre premier agent pour démarrer la validation manuelle AgentHub.',
    missingTitle: 'Profil créateur requis',
    missingText:
      'Ce compte a accès à l’espace créateur, mais aucun creator_profile ne lui est lié. Un admin peut accéder à cette page, mais il ne peut lister ou créer que ses propres agents.',
    loadError: 'Impossible de charger vos agents pour le moment.',
    rentalsTitle: 'Accès à mes agents',
    rentalsEmptyTitle: 'Aucun accès actif',
    rentalsEmptyText: 'Les accès apparaîtront ici dès qu’un utilisateur activera un de vos agents approuvés.',
    rentalsLoadError: 'Impossible de charger les accès à vos agents.',
    submitted: 'Agent soumis pour validation. Il apparaît maintenant dans votre espace créateur.',
    adminFeedbackTitle: 'Retour admin',
    adminFeedbackEmpty: 'Aucun commentaire ajouté.',
    adminReviewLabels: {
      changes_requested: 'Modifications demandées',
      in_review: 'En revue',
      approved: 'Agent approuvé',
      rejected: 'Agent refusé',
      draft: 'Brouillon',
      submitted: 'Soumis',
      suspended: 'Suspendu',
    },
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
    rentalStatuses: {
      pending: 'À traiter',
      accepted: 'Actif',
      in_progress: 'Legacy',
      delivered: 'Livrée',
      rejected: 'Refusée',
      cancelled: 'Annulée',
      active: 'Actif',
      expired: 'Expiré',
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
    rentalsTitle: 'Access to my agents',
    rentalsEmptyTitle: 'No active access yet',
    rentalsEmptyText: 'Accesses will appear here as soon as a user activates one of your approved agents.',
    rentalsLoadError: 'Could not load access analytics for your agents.',
    submitted: 'Agent submitted for review. It now appears in your creator workspace.',
    adminFeedbackTitle: 'Admin feedback',
    adminFeedbackEmpty: 'No comment added.',
    adminReviewLabels: {
      changes_requested: 'Changes requested',
      in_review: 'In review',
      approved: 'Agent approved',
      rejected: 'Agent rejected',
      draft: 'Draft',
      submitted: 'Submitted',
      suspended: 'Suspended',
    },
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
    rentalStatuses: {
      pending: 'To process',
      accepted: 'Active',
      in_progress: 'Legacy',
      delivered: 'Delivered',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      active: 'Active',
      expired: 'Expired',
    },
  },
};

const statusTone = {
  draft: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
  submitted: 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]',
  in_review: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
  approved: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
  rejected: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]',
  suspended: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]',
  archived: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
  pending: 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]',
  accepted: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
  in_progress: 'border-[#7DD3FC] bg-[#F0F9FF] text-[#075985]',
  delivered: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
  active: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
  expired: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
  cancelled: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
};

const accessAnalyticsStatuses = ['active', 'accepted', 'in_progress', 'delivered'];

function StatusBadge({ label, status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-label ${statusTone[status] || statusTone.draft}`}>
      {label}
    </span>
  );
}

function isChangesRequest(review) {
  return review?.isChangesRequest || (review?.decision === 'in_review' && Boolean(review?.notes?.trim()));
}

function cleanAdminNotes(notes) {
  return (notes || '')
    .replace(/^\s*Modifications demandées\s*:\s*/i, '')
    .trim();
}

function getAdminReviewLabel(review, t) {
  if (!review) {
    return '';
  }

  if (isChangesRequest(review)) {
    return t.adminReviewLabels.changes_requested;
  }

  return t.adminReviewLabels[review.decision] || review.decision;
}

function getAgentStatusLabel(agent, t) {
  if (agent.status === 'in_review' && isChangesRequest(agent.latestAdminReview)) {
    return t.adminReviewLabels.changes_requested;
  }

  return t.statuses[agent.status] || agent.status;
}

function Panel({ children, className = '' }) {
  return <div className={`rounded-2xl border border-[#E3E7F2] bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export default function CreatorDashboardContent({
  creatorAgentsResult,
  creatorRentalsResult,
  locale = 'fr',
  profile,
  submittedSlug,
}) {
  const t = copy[locale] || copy.fr;
  const router = useRouter();
  const agents = creatorAgentsResult?.agents ?? [];
  const rentals = creatorRentalsResult?.rentals ?? [];
  const hasProfile = !creatorAgentsResult?.creatorProfileMissing;
  const newAgentPath = locale === 'en' ? '/en/creator/agents/new' : '/code/agents/new';
  const editAgentPath = (agentId) => `/code/agents/${agentId}/edit`;

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    const interval = window.setInterval(refresh, 15000);

    return () => window.clearInterval(interval);
  }, [router]);

  const visibleRentals = rentals.filter((rental) => rental.agent && rental.agent.status !== 'archived');
  const activeAccessRentals = visibleRentals.filter((rental) => accessAnalyticsStatuses.includes(rental.status));
  const estimatedRevenueCents = activeAccessRentals.reduce((sum, rental) => sum + (rental.priceCents ?? 0), 0);
  const stats = [
    { label: t.realAgents, value: agents.length, icon: Bot },
    { label: t.statuses.in_review, value: agents.filter((agent) => agent.status === 'in_review').length, icon: ShieldAlert },
    { label: t.statuses.approved, value: agents.filter((agent) => agent.status === 'approved').length, icon: CheckCircle2 },
    { label: locale === 'en' ? 'Active access' : 'Accès actifs', value: activeAccessRentals.length, icon: Users },
  ];

  return (
    <div className="code-theme min-h-screen bg-[#F7F8FC] text-[#111827]">
      <AgentHubCodeNavbar profile={profile} />
      <main className="container py-10">
        <div className="mb-8 overflow-hidden rounded-3xl border border-[#E3E7F2] bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">{t.eyebrow}</p>
              <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">{t.title}</h1>
              <p className="mt-3 max-w-2xl text-[#4B5563]">{t.subtitle}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link href="/code/docs">
                <Button variant="outline" className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                  Docs
                </Button>
              </Link>
              {hasProfile ? (
                <Link href={newAgentPath}>
                  <Button className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44]">
                    <Plus className="mr-2 h-4 w-4" />
                    {t.create}
                  </Button>
                </Link>
              ) : (
                <Button disabled className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm disabled:opacity-50">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.create}
                </Button>
              )}
            </div>
          </div>
        </div>

        {submittedSlug && (
          <div className="mb-6 rounded-2xl border border-[#86EFAC] bg-[#F0FDF4] p-4 text-sm text-[#166534]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t.submitted}
            </div>
          </div>
        )}

        {creatorAgentsResult?.creatorProfileMissing && (
          <Panel className="mb-6 border-[#FCD34D] bg-[#FFFBEB]">
            <div className="flex gap-3 text-[#92400E]">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="font-display text-lg font-bold text-[#111827]">{t.missingTitle}</h2>
                <p className="mt-1 text-sm leading-relaxed">{t.missingText}</p>
              </div>
            </div>
          </Panel>
        )}

        {creatorAgentsResult?.error && (
          <Panel className="mb-6 border-[#FCA5A5] bg-[#FEF2F2]">
            <div className="flex items-center gap-2 text-sm text-[#991B1B]">
              <AlertTriangle className="h-4 w-4" />
              {t.loadError}
            </div>
          </Panel>
        )}

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Panel key={stat.label}>
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="font-label mb-2 text-xs text-[#6B7280]">{stat.label}</p>
              <p className="font-stat text-3xl text-[#111827]">{stat.value}</p>
            </Panel>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-[#E3E7F2] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E3E7F2] p-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#111827]">{t.rentalsTitle}</h2>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {locale === 'en'
                      ? 'Beta accesses are activated automatically. Stripe is not connected yet.'
                      : 'Les accès beta sont activés automatiquement. Stripe n’est pas encore connecté.'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block font-stat text-sm text-[#6B3FA0]">{activeAccessRentals.length}</span>
                  <span className="text-xs text-[#6B7280]">€{Math.round(estimatedRevenueCents / 100)}</span>
                </div>
              </div>

              {creatorRentalsResult?.error && (
                <div className="p-5 text-sm text-[#991B1B]">{t.rentalsLoadError}</div>
              )}

              {!creatorRentalsResult?.error && visibleRentals.length === 0 ? (
                <div className="p-8 text-center">
                  <h3 className="font-display text-lg font-bold text-[#111827]">{t.rentalsEmptyTitle}</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[#6B7280]">{t.rentalsEmptyText}</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E3E7F2]">
                  {visibleRentals.map((rental) => (
                    <article key={rental.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-[#111827]">{rental.agent?.name ?? 'AgentHub agent'}</h3>
                          <StatusBadge status={rental.status} label={t.rentalStatuses[rental.status] || rental.status} />
                        </div>
                        <p className="text-sm text-[#4B5563]">
                          {rental.agent?.summary ?? (locale === 'en' ? 'Direct access activated.' : 'Accès direct activé.')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6B7280]">
                          <span>{rental.pricingType}</span>
                          <span>€{Math.round((rental.priceCents ?? 0) / 100)}</span>
                          <span>{new Date(rental.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                        <div className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] px-3 py-2 text-right">
                          <p className="font-label text-[10px] text-[#6B3FA0]">
                            {locale === 'en' ? 'Direct access' : 'Accès direct'}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            {locale === 'en' ? 'No creator action required' : 'Aucune action créateur requise'}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E3E7F2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E3E7F2] p-5">
              <h2 className="font-display text-xl font-bold text-[#111827]">{t.realAgents}</h2>
              <span className="font-stat text-sm text-[#6B3FA0]">{agents.length}</span>
            </div>

            {agents.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6B3FA0]">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#111827]">{t.emptyTitle}</h3>
                <p className="mt-2 max-w-md text-sm text-[#6B7280]">{t.emptyText}</p>
                {hasProfile && (
                  <Link href={newAgentPath} className="mt-5">
                    <Button className="border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
                      <Plus className="mr-2 h-4 w-4" />
                      {t.create}
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#E3E7F2]">
                {agents.map((agent) => (
                  <article key={agent.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-[#111827]">{agent.name}</h3>
                        <StatusBadge status={agent.status} label={getAgentStatusLabel(agent, t)} />
                      </div>
                      <p className="text-sm text-[#4B5563]">{agent.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B7280]">
                        {agent.categoryName && <span>{agent.categoryName}</span>}
                        <span>{agent.pricingType}</span>
                        <span>{agent.riskLevel}</span>
                      </div>
                      {agent.latestAdminReview && (
                        <div className="mt-4 rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                          <p className="font-label mb-1 text-[10px] text-[#6B3FA0]">{t.adminFeedbackTitle}</p>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <StatusBadge
                              status={agent.latestAdminReview.decision}
                              label={getAdminReviewLabel(agent.latestAdminReview, t)}
                            />
                            <span className="text-xs text-[#6B7280]">
                              {new Date(agent.latestAdminReview.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-[#4B5563]">
                            {cleanAdminNotes(agent.latestAdminReview.notes) || t.adminFeedbackEmpty}
                          </p>
                          {agent.status === 'in_review' && isChangesRequest(agent.latestAdminReview) && (
                            <Link href={editAgentPath(agent.id)} className="mt-3 inline-flex">
                              <Button size="sm" variant="outline" className="border-[#F59E0B] bg-white text-[#92400E] hover:bg-[#FFFBEB]">
                                Modifier l’agent
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <Clock className="h-4 w-4" />
                      {new Date(agent.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}
                    </div>
                  </article>
                ))}
              </div>
            )}
            </div>
          </section>

          <Panel>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
              <Euro className="h-4 w-4" />
            </div>
            <p className="font-label mb-2 text-xs text-[#6B3FA0]">{t.stripeTitle}</p>
            <p className="text-sm leading-relaxed text-[#4B5563]">{t.stripeText}</p>
            <div className="mt-5 rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4">
              <Sparkles className="mb-3 h-4 w-4 text-[#6B3FA0]" />
              <p className="font-display text-sm font-bold text-[#111827]">
                {locale === 'en' ? 'Publication checklist' : 'Checklist publication'}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                {locale === 'en'
                  ? 'A clear promise, bounded inputs and visible limits help validation move faster.'
                  : 'Une promesse claire, des inputs cadrés et des limites visibles accélèrent la validation.'}
              </p>
            </div>
          </Panel>
        </div>
      </main>
      <Footer variant="code" />
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AgentHubCodeNavbar from '@/components/AgentHubCodeNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock3,
  Euro,
  FileText,
  Gauge,
  Plus,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  CodeAlert,
  CodePanel,
  EmptyCodeState,
  StatusBadge,
  accessAnalyticsStatuses,
  cleanAdminNotes,
  formatDate,
  formatMoney,
  getAgentStatusLabel,
  getAdminReviewLabel,
  isChangesRequest,
  pricingLabels,
  rentalStatusLabels,
  statusLabels,
} from './code-console-ui';

function MetricCard({ detail, icon: Icon, label, value }) {
  return (
    <CodePanel>
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-label mb-2 text-xs text-[#6B7280]">{label}</p>
      <p className="font-stat text-3xl text-[#111827]">{value}</p>
      {detail && <p className="mt-2 text-xs text-[#6B7280]">{detail}</p>}
    </CodePanel>
  );
}

export default function CodeDashboardContent({
  creatorAgentsResult,
  creatorRentalsResult,
  profile,
  submittedSlug,
}) {
  const router = useRouter();
  const agents = creatorAgentsResult?.agents ?? [];
  const rentals = creatorRentalsResult?.rentals ?? [];
  const hasProfile = !creatorAgentsResult?.creatorProfileMissing;
  const activeAccessRentals = rentals.filter((rental) => accessAnalyticsStatuses.includes(rental.status));
  const estimatedRevenueCents = activeAccessRentals.reduce((sum, rental) => sum + (rental.priceCents ?? 0), 0);
  const inReviewAgents = agents.filter((agent) => agent.status === 'submitted' || agent.status === 'in_review');
  const changesRequested = agents.filter((agent) => agent.status === 'in_review' && isChangesRequest(agent.latestAdminReview));
  const recentAgents = agents.slice(0, 4);
  const recentRentals = rentals.slice(0, 5);
  const validationStats = [
    { label: statusLabels.submitted, value: agents.filter((agent) => agent.status === 'submitted').length, status: 'submitted' },
    { label: statusLabels.in_review, value: agents.filter((agent) => agent.status === 'in_review').length, status: 'in_review' },
    { label: statusLabels.approved, value: agents.filter((agent) => agent.status === 'approved').length, status: 'approved' },
    { label: 'À corriger', value: changesRequested.length, status: 'rejected' },
  ];

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    const interval = window.setInterval(refresh, 15000);

    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div className="code-theme min-h-screen bg-[#F7F8FC] text-[#111827]">
      <AgentHubCodeNavbar profile={profile} />
      <main className="container py-8 md:py-10">
        <section className="mb-8 overflow-hidden rounded-3xl border border-[#E3E7F2] bg-white shadow-sm">
          <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">DASHBOARD</p>
              <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">Suivi AgentHub Code</h1>
              <p className="mt-3 max-w-2xl text-[#4B5563]">
                Pilotez la validation, les accès clients et l’activité de vos agents depuis une console pensée pour les créateurs.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link href="/code/agents">
                <Button variant="outline" className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                  Mes agents
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {hasProfile ? (
                <Link href="/code/agents/new">
                  <Button className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44]">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un agent
                  </Button>
                </Link>
              ) : (
                <Button disabled className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm disabled:opacity-50">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un agent
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="mb-6 space-y-4">
          {submittedSlug && (
            <CodeAlert tone="success">
              Agent soumis pour validation. Il apparaît maintenant dans votre console AgentHub Code.
            </CodeAlert>
          )}
          {creatorAgentsResult?.creatorProfileMissing && (
            <CodeAlert title="Profil créateur requis">
              Ce compte a accès à l’espace créateur, mais aucun profil créateur ne lui est lié. Un admin peut accéder à cette page, mais il ne peut lister ou créer que ses propres agents.
            </CodeAlert>
          )}
          {creatorAgentsResult?.error && (
            <CodeAlert tone="error">Impossible de charger vos agents pour le moment.</CodeAlert>
          )}
          {creatorRentalsResult?.error && (
            <CodeAlert tone="error">Impossible de charger les accès à vos agents.</CodeAlert>
          )}
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard icon={Box} label="Agents soumis" value={agents.length} detail={`${inReviewAgents.length} en validation`} />
          <MetricCard icon={ShieldAlert} label="À surveiller" value={changesRequested.length} detail="retours admin ouverts" />
          <MetricCard icon={Users} label="Accès actifs" value={activeAccessRentals.length} detail="utilisateurs en cours" />
          <MetricCard icon={Euro} label="Volume beta" value={formatMoney(estimatedRevenueCents)} detail="Stripe Connect prévu" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-[#E3E7F2] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E3E7F2] p-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#111827]">Activité clients</h2>
                  <p className="mt-1 text-xs text-[#6B7280]">Accès, locations et activations de vos agents.</p>
                </div>
                <Activity className="h-5 w-5 text-[#6B3FA0]" />
              </div>

              {recentRentals.length === 0 ? (
                <div className="p-5">
                  <EmptyCodeState
                    icon={Users}
                    title="Aucune activité client"
                    text="Les accès apparaîtront ici dès qu’un utilisateur activera un de vos agents approuvés."
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#E3E7F2]">
                  {recentRentals.map((rental) => (
                    <article key={rental.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-[#111827]">{rental.agent?.name ?? 'AgentHub agent'}</h3>
                          <StatusBadge status={rental.status} label={rentalStatusLabels[rental.status] || rental.status} />
                        </div>
                        <p className="text-sm text-[#4B5563]">
                          {rental.agent?.summary ?? 'Accès direct activé.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6B7280]">
                          <span>{pricingLabels[rental.pricingType] || rental.pricingType}</span>
                          <span>{formatMoney(rental.priceCents, rental.currency)}</span>
                          <span>{formatDate(rental.createdAt)}</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] px-3 py-2 text-right">
                        <p className="font-label text-[10px] text-[#6B3FA0]">Accès direct</p>
                        <p className="text-xs text-[#6B7280]">Aucune action créateur requise</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E3E7F2] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E3E7F2] p-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#111827]">Agents récents</h2>
                  <p className="mt-1 text-xs text-[#6B7280]">Dernières fiches soumises ou mises à jour.</p>
                </div>
                <Link href="/code/agents" className="text-sm font-medium text-[#6B3FA0] hover:text-[#111827]">
                  Voir tout
                </Link>
              </div>

              {recentAgents.length === 0 ? (
                <div className="p-5">
                  <EmptyCodeState
                    action={
                      hasProfile && (
                        <Link href="/code/agents/new">
                          <Button className="border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
                            <Plus className="mr-2 h-4 w-4" />
                            Créer un agent
                          </Button>
                        </Link>
                      )
                    }
                    icon={Box}
                    title="Aucun agent soumis"
                    text="Créez votre premier agent pour démarrer la validation manuelle AgentHub."
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#E3E7F2]">
                  {recentAgents.map((agent) => (
                    <article key={agent.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-[#111827]">{agent.name}</h3>
                          <StatusBadge status={agent.status} label={getAgentStatusLabel(agent)} />
                        </div>
                        <p className="text-sm leading-6 text-[#4B5563]">{agent.summary}</p>
                        {agent.latestAdminReview && (
                          <div className="mt-3 rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                            <p className="font-label mb-1 text-[10px] text-[#6B3FA0]">Retour admin</p>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <StatusBadge status={agent.latestAdminReview.decision} label={getAdminReviewLabel(agent.latestAdminReview)} />
                              <span className="text-xs text-[#6B7280]">{formatDate(agent.latestAdminReview.createdAt)}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-[#4B5563]">
                              {cleanAdminNotes(agent.latestAdminReview.notes) || 'Aucun commentaire ajouté.'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(agent.createdAt)}
                        </span>
                        {isChangesRequest(agent.latestAdminReview) && (
                          <Link href={`/code/agents/${agent.id}/edit`}>
                            <Button size="sm" variant="outline" className="border-[#F59E0B] bg-white text-[#92400E] hover:bg-[#FFFBEB]">
                              Corriger
                            </Button>
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <CodePanel>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-label text-xs text-[#6B3FA0]">VALIDATION</p>
                  <h2 className="font-display mt-1 text-xl font-bold text-[#111827]">Pipeline qualité</h2>
                </div>
                <Gauge className="h-5 w-5 text-[#6B3FA0]" />
              </div>
              <div className="space-y-3">
                {validationStats.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} label={item.label} />
                    </div>
                    <span className="font-stat text-lg text-[#111827]">{item.value}</span>
                  </div>
                ))}
              </div>
            </CodePanel>

            <CodePanel>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                <FileText className="h-4 w-4" />
              </div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">CHECKLIST</p>
              <h2 className="font-display text-xl font-bold text-[#111827]">Publier sans friction</h2>
              <ul className="mt-4 space-y-3 text-sm text-[#4B5563]">
                {['Promesse claire', 'Inputs cadrés', 'Limites visibles', 'Exemple de sortie vérifiable'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#6B3FA0]" />
                    {item}
                  </li>
                ))}
              </ul>
            </CodePanel>
          </aside>
        </div>
      </main>
      <Footer variant="code" />
    </div>
  );
}

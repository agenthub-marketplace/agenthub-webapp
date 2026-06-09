'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Plus,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  CodeAlert,
  CodePageHeader,
  CodePanel,
  EmptyCodeState,
  StatusBadge,
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

function MetricCard({ detail, icon: Icon, label, tone = 'default', value }) {
  return (
    <CodePanel tone={tone}>
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
  submittedSlug,
}) {
  const router = useRouter();
  const agents = creatorAgentsResult?.agents ?? [];
  const recentRuns = creatorAgentsResult?.recentRuns ?? [];
  const rentals = creatorRentalsResult?.rentals ?? [];
  const usageAnalyticsLimited = Boolean(creatorAgentsResult?.usageAnalyticsLimited || creatorRentalsResult?.analyticsLimited);
  const hasProfile = !creatorAgentsResult?.creatorProfileMissing;
  const publishedAgents = agents.filter((agent) => agent.status === 'approved');
  const inReviewAgents = agents.filter((agent) => agent.status === 'in_review');
  const submittedAgents = agents.filter((agent) => agent.status === 'submitted');
  const draftAgents = agents.filter((agent) => agent.status === 'draft');
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
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ESPACE CRÉATEUR"
        title="Créer, publier et suivre vos agents."
        description="Gardez une vue claire sur vos brouillons, les agents en validation, les corrections demandées et l’activité après publication."
        action={
          <>
              <Link href="/code/agents">
                <Button variant="outline" className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                  Voir mes agents
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {hasProfile ? (
                <Link href="/code/agents/new">
                  <Button className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44]">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvel agent
                  </Button>
                </Link>
              ) : (
                <Button disabled className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm disabled:opacity-50">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel agent
                </Button>
              )}
          </>
        }
      />

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
          {usageAnalyticsLimited && (
            <CodeAlert title="Analytics limités">
              Les usages et accès des utilisateurs sont masqués côté créateur pendant la beta pour éviter toute exposition cross-user.
            </CodeAlert>
          )}
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-5">
          <MetricCard icon={Box} tone="green" label="Publiés" value={publishedAgents.length} detail="visibles sur la marketplace" />
          <MetricCard icon={Clock3} tone="violet" label="En validation" value={inReviewAgents.length + submittedAgents.length} detail={`${submittedAgents.length} en attente`} />
          <MetricCard icon={ShieldAlert} tone="amber" label="À corriger" value={changesRequested.length} detail="action créateur requise" />
          <MetricCard icon={FileText} tone="blue" label="Brouillons" value={draftAgents.length} detail="à compléter" />
          <MetricCard
            icon={Activity}
            tone="slate"
            label="Activations"
            value={rentals.length}
            detail={usageAnalyticsLimited ? "masquées en beta" : "accès utilisateurs"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-[#E3E7F2] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E3E7F2] p-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#111827]">Utilisations récentes</h2>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {usageAnalyticsLimited
                      ? "Les runs utilisateur restent masqués côté créateur pendant la beta."
                      : "Suivi technique limité, sans contenus privés des utilisateurs."}
                  </p>
                </div>
                <Activity className="h-5 w-5 text-[#6B3FA0]" />
              </div>

              {recentRuns.length === 0 ? (
                <div className="p-5 text-sm leading-6 text-[#6B7280]">
                  {usageAnalyticsLimited
                    ? "Les créateurs ne voient pas les runs des utilisateurs dans cette beta."
                    : "Aucune utilisation visible pour ce compte. Les créateurs ne voient pas les contenus privés des utilisateurs."}
                </div>
              ) : (
                <div className="divide-y divide-[#E3E7F2]">
                  {recentRuns.map((run) => (
                    <article key={run.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[#111827]">{run.agentName}</h3>
                          <StatusBadge status={run.status} label={run.status === 'succeeded' ? 'Réussi' : run.status === 'failed' ? 'Échec' : 'En cours'} />
                        </div>
                        <p className="text-sm text-[#4B5563]">{run.actionLabel}</p>
                        <p className="mt-2 text-xs text-[#6B7280]">
                          {formatDate(run.createdAt)}
                        </p>
                      </div>
                      {run.errorCode && <span className="text-xs text-[#991B1B]">{run.errorCode}</span>}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E3E7F2] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E3E7F2] p-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#111827]">Accès utilisateurs</h2>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {usageAnalyticsLimited
                      ? "Les accès utilisateurs ne sont pas exposés côté créateur dans cette beta."
                      : "Activations et accès ouverts sur vos agents publiés."}
                  </p>
                </div>
                <Activity className="h-5 w-5 text-[#6B3FA0]" />
              </div>

              {recentRentals.length === 0 ? (
                <div className="p-5">
                  <EmptyCodeState
                    icon={Users}
                    title="Aucune activité client"
                    text={
                      usageAnalyticsLimited
                        ? "Les accès utilisateurs sont masqués côté créateur pendant la beta."
                        : "Les accès apparaîtront ici dès qu’un utilisateur activera un de vos agents publiés."
                    }
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
            <CodePanel tone="violet">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-label text-xs text-[#6B3FA0]">PUBLICATION</p>
                  <h2 className="font-display mt-1 text-xl font-bold text-[#111827]">États de vos agents</h2>
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

            <CodePanel tone="amber">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                <ArrowRight className="h-4 w-4" />
              </div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">À FAIRE</p>
              <h2 className="font-display text-xl font-bold text-[#111827]">Prochaines actions</h2>
              <div className="mt-4 space-y-3 text-sm text-[#4B5563]">
                {changesRequested.length > 0 && <p>Corriger {changesRequested.length} agent{changesRequested.length > 1 ? 's' : ''} avec retours admin.</p>}
                {submittedAgents.length > 0 && <p>Suivre {submittedAgents.length} agent{submittedAgents.length > 1 ? 's' : ''} soumis en attente de validation.</p>}
                {publishedAgents.length === 0 && <p>Publier au moins un agent validé pour tester le parcours complet.</p>}
                {changesRequested.length === 0 && submittedAgents.length === 0 && publishedAgents.length > 0 && <p>Surveiller les runs, les accès actifs et les avis vérifiés.</p>}
              </div>
            </CodePanel>

            <CodePanel tone="blue">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                <FileText className="h-4 w-4" />
              </div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">CHECKLIST</p>
              <h2 className="font-display text-xl font-bold text-[#111827]">Avant validation</h2>
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
  );
}

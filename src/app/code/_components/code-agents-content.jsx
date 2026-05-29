import Link from 'next/link';
import AgentHubCodeNavbar from '@/components/AgentHubCodeNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Box, CalendarDays, CheckCircle2, Plus, ShieldAlert } from 'lucide-react';
import {
  CodeAlert,
  CodePanel,
  EmptyCodeState,
  StatusBadge,
  canEditAgent,
  cleanAdminNotes,
  formatDate,
  getAgentStatusLabel,
  getAdminReviewLabel,
  pricingLabels,
  riskLabels,
  statusLabels,
} from './code-console-ui';

function CountPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#E3E7F2] bg-white p-4 shadow-sm">
      <p className="font-label mb-2 text-xs text-[#6B7280]">{label}</p>
      <p className="font-stat text-2xl text-[#111827]">{value}</p>
    </div>
  );
}

export default function CodeAgentsContent({ creatorAgentsResult, profile }) {
  const agents = creatorAgentsResult?.agents ?? [];
  const hasProfile = !creatorAgentsResult?.creatorProfileMissing;
  const counts = {
    all: agents.length,
    review: agents.filter((agent) => agent.status === 'submitted' || agent.status === 'in_review').length,
    approved: agents.filter((agent) => agent.status === 'approved').length,
    rejected: agents.filter((agent) => agent.status === 'rejected').length,
  };

  return (
    <div className="code-theme min-h-screen bg-[#F7F8FC] text-[#111827]">
      <AgentHubCodeNavbar profile={profile} />
      <main className="container py-8 md:py-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-label mb-2 text-xs text-[#6B3FA0]">MES AGENTS</p>
            <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">Catalogue créateur</h1>
            <p className="mt-3 max-w-2xl text-[#4B5563]">
              Retrouvez vos agents soumis, leurs statuts de validation et les retours admin à corriger.
            </p>
          </div>
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
        </section>

        <div className="mb-6 space-y-4">
          {creatorAgentsResult?.creatorProfileMissing && (
            <CodeAlert title="Profil créateur requis">
              Ce compte a accès à l’espace créateur, mais aucun profil créateur ne lui est lié.
            </CodeAlert>
          )}
          {creatorAgentsResult?.error && (
            <CodeAlert tone="error">Impossible de charger vos agents pour le moment.</CodeAlert>
          )}
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CountPill label="Total" value={counts.all} />
          <CountPill label="En validation" value={counts.review} />
          <CountPill label={statusLabels.approved} value={counts.approved} />
          <CountPill label={statusLabels.rejected} value={counts.rejected} />
        </div>

        {agents.length === 0 ? (
          <EmptyCodeState
            action={
              hasProfile && (
                <Link href="/code/agents/new">
                  <Button className="border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer mon premier agent
                  </Button>
                </Link>
              )
            }
            icon={Box}
            title="Aucun agent soumis"
            text="Créez une fiche claire avec les inputs, les livrables, les limites et la promesse de résultat. Elle partira ensuite en validation AgentHub."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E3E7F2] bg-white shadow-sm">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_160px_160px_120px] gap-4 border-b border-[#E3E7F2] bg-[#F8FAFC] px-5 py-3 text-xs font-label text-[#6B7280] lg:grid">
              <span>Agent</span>
              <span>Statut</span>
              <span>Accès</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-[#E3E7F2]">
              {agents.map((agent) => {
                const editable = canEditAgent(agent);
                const adminNotes = cleanAdminNotes(agent.latestAdminReview?.notes);

                return (
                  <article key={agent.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_160px_160px_120px] lg:items-start">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-bold text-[#111827]">{agent.name}</h2>
                        {agent.categoryName && (
                          <span className="rounded-full border border-[#E3E7F2] bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-label text-[#6B7280]">
                            {agent.categoryName}
                          </span>
                        )}
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-[#4B5563]">{agent.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6B7280]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(agent.createdAt)}
                        </span>
                        <span>{riskLabels[agent.riskLevel] || agent.riskLevel}</span>
                      </div>
                      {agent.latestAdminReview && (
                        <CodePanel className="mt-4 bg-[#F8FAFC] p-3">
                          <p className="font-label mb-1 text-[10px] text-[#6B3FA0]">Retour admin</p>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <StatusBadge status={agent.latestAdminReview.decision} label={getAdminReviewLabel(agent.latestAdminReview)} />
                            <span className="text-xs text-[#6B7280]">{formatDate(agent.latestAdminReview.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-[#4B5563]">
                            {adminNotes || 'Aucun commentaire ajouté.'}
                          </p>
                        </CodePanel>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:block">
                      <StatusBadge status={agent.status} label={getAgentStatusLabel(agent)} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#4B5563] lg:block">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-[#6B3FA0]" />
                        {pricingLabels[agent.pricingType] || agent.pricingType}
                      </span>
                    </div>

                    <div className="flex justify-start lg:justify-end">
                      {editable ? (
                        <Link href={`/code/agents/${agent.id}/edit`}>
                          <Button size="sm" variant="outline" className="border-[#D8DDEE] bg-white text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                            Modifier
                          </Button>
                        </Link>
                      ) : (
                        <span className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] px-3 py-2 text-xs text-[#6B7280]">
                          Lecture seule
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/code/dashboard" className="rounded-2xl border border-[#E3E7F2] bg-white p-5 shadow-sm transition-colors hover:border-[#8B5CF6]">
            <ShieldAlert className="mb-4 h-5 w-5 text-[#6B3FA0]" />
            <h2 className="font-display text-lg font-bold text-[#111827]">Suivre le dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Analysez la validation, les accès clients et les signaux d’activité.</p>
            <span className="mt-4 inline-flex text-sm font-medium text-[#6B3FA0]">
              Ouvrir le suivi
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </span>
          </Link>
          <Link href="/code/docs" className="rounded-2xl border border-[#E3E7F2] bg-white p-5 shadow-sm transition-colors hover:border-[#8B5CF6]">
            <Box className="mb-4 h-5 w-5 text-[#6B3FA0]" />
            <h2 className="font-display text-lg font-bold text-[#111827]">Préparer une meilleure fiche</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Consultez les standards de promesse, inputs, limites et exemples.</p>
            <span className="mt-4 inline-flex text-sm font-medium text-[#6B3FA0]">
              Ouvrir les docs
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </span>
          </Link>
        </div>
      </main>
      <Footer variant="code" />
    </div>
  );
}

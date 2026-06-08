import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Box, CalendarDays, Plus, ShieldAlert } from 'lucide-react';
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
  pricingLabels,
  riskLabels,
} from './code-console-ui';

function CountPill({ label, tone = 'violet', value }) {
  const toneClasses = {
    violet: 'border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7F2FF_100%)]',
    green: 'border-[#BBF7D0] bg-[linear-gradient(135deg,#FFFFFF_0%,#F0FDF4_100%)]',
    amber: 'border-[#FDE68A] bg-[linear-gradient(135deg,#FFFFFF_0%,#FFFBEB_100%)]',
    blue: 'border-[#BFDBFE] bg-[linear-gradient(135deg,#FFFFFF_0%,#EFF6FF_100%)]',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-[0_10px_28px_rgba(109,64,160,0.06)] transition duration-200 hover:brightness-[0.97] hover:shadow-[0_14px_34px_rgba(109,64,160,0.08)] ${toneClasses[tone] || toneClasses.violet}`}>
      <p className="font-label mb-2 text-xs text-[#6B3FA0]">{label}</p>
      <p className="font-stat text-2xl text-[#111827]">{value}</p>
    </div>
  );
}

export default function CodeAgentsContent({ creatorAgentsResult }) {
  const agents = creatorAgentsResult?.agents ?? [];
  const hasProfile = !creatorAgentsResult?.creatorProfileMissing;
  const counts = {
    all: agents.length,
    published: agents.filter((agent) => agent.status === 'approved').length,
    review: agents.filter((agent) => agent.status === 'in_review').length,
    changes: agents.filter((agent) => agent.status === 'in_review' && (agent.latestAdminReview?.isChangesRequest || Boolean(agent.latestAdminReview?.notes?.trim()))).length,
  };

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="MES AGENTS"
        title="Vos agents, leurs statuts et les actions à faire."
        description="Suivez ce qui est publié, en validation, à corriger ou encore en brouillon."
        action={
          hasProfile ? (
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
          )
        }
      />

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
          <CountPill label="Total" tone="blue" value={counts.all} />
          <CountPill label="Publiés" tone="green" value={counts.published} />
          <CountPill label="En validation" tone="violet" value={counts.review} />
          <CountPill label="À corriger" tone="amber" value={counts.changes} />
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
          <div className="overflow-x-auto rounded-2xl border border-[#DDD6FE] bg-white shadow-[0_14px_40px_rgba(109,64,160,0.06)]">
            <div className="hidden min-w-[880px] grid-cols-[minmax(320px,1fr)_150px_150px_150px_120px] gap-4 border-b border-[#DDD6FE] bg-[#F5F3FF] px-5 py-3 text-xs font-label text-[#6B3FA0] lg:grid">
              <span>Agent</span>
              <span>Statut</span>
              <span>Prix</span>
              <span>Mis à jour</span>
              <span className="text-right">Action</span>
            </div>
            <div className="min-w-0 divide-y divide-[#E3E7F2] lg:min-w-[880px]">
              {agents.map((agent) => {
                const adminNotes = cleanAdminNotes(agent.latestAdminReview?.notes);

                return (
                  <article key={agent.id} className="grid gap-4 p-5 transition-colors hover:bg-[#FCFAFF] lg:grid-cols-[minmax(320px,1fr)_150px_150px_150px_120px] lg:items-start">
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
                          <CodePanel tone="violet" className="mt-4 p-3">
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

                    <div className="text-sm text-[#4B5563]">
                      <p className="font-semibold text-[#111827]">{formatMoney(agent.startingPriceCents, agent.currency)}</p>
                      <p className="text-xs text-[#6B7280]">{pricingLabels[agent.pricingType] || agent.pricingType}</p>
                    </div>

                    <div className="text-sm text-[#4B5563]">
                      {formatDate(agent.updatedAt)}
                    </div>

                    <div className="flex justify-start lg:justify-end">
                      <Link href={`/code/agents/${agent.id}`}>
                        <Button size="sm" variant="outline" className="border-[#D8DDEE] bg-white text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/code/dashboard" className="rounded-2xl border border-[#BFDBFE] bg-[linear-gradient(135deg,#FFFFFF_0%,#EFF6FF_100%)] p-5 shadow-sm transition duration-200 hover:border-[#8B5CF6] hover:brightness-[0.97] hover:shadow-[0_14px_34px_rgba(109,64,160,0.08)]">
            <ShieldAlert className="mb-4 h-5 w-5 text-[#6B3FA0]" />
            <h2 className="font-display text-lg font-bold text-[#111827]">Suivre l’activité</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Retrouvez les agents en validation, les corrections demandées et les activations utilisateurs.</p>
            <span className="mt-4 inline-flex text-sm font-medium text-[#6B3FA0]">
              Ouvrir le tableau de bord
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </span>
          </Link>
          <Link href="/code/docs" className="rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)] p-5 shadow-sm transition duration-200 hover:border-[#8B5CF6] hover:brightness-[0.97] hover:shadow-[0_14px_34px_rgba(109,64,160,0.08)]">
            <Box className="mb-4 h-5 w-5 text-[#6B3FA0]" />
            <h2 className="font-display text-lg font-bold text-[#111827]">Améliorer une fiche</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Consultez les standards de promesse, entrées demandées, limites et exemples.</p>
            <span className="mt-4 inline-flex text-sm font-medium text-[#6B3FA0]">
              Ouvrir les docs
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </span>
          </Link>
        </div>
      </main>
  );
}

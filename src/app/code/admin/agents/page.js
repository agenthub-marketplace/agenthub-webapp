import { Archive, Check, Ban } from 'lucide-react';
import { requireAdminAccess } from '@/lib/auth/session';
import { moderateAgentPublicationAction } from '@/server/admin/actions';
import { getAdminAgentManagementList } from '@/server/admin/review-queue';
import { Button } from '@/components/ui/button';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate } from '../../_components/code-console-ui';
import { EmptyAdminState } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

const statusLabels = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  in_review: 'En revue',
  approved: 'Publié',
  rejected: 'Rejeté',
  suspended: 'Suspendu',
  archived: 'Archivé',
};

export default async function AdminAgentsPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/agents');
  const params = searchParams ? await searchParams : {};
  const moderated = typeof params?.moderated === 'string' ? params.moderated : null;
  const error = typeof params?.error === 'string' ? params.error : null;
  const result = await getAdminAgentManagementList();

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN AGENTS"
        title="Tous les agents"
        description="Modération publication : suspendre, restaurer ou archiver sans supprimer l’historique."
      />

      {moderated && <CodeAlert tone="success">Publication agent mise à jour.</CodeAlert>}
      {error && <div className="mt-4"><CodeAlert tone="error">Impossible de modifier la publication de cet agent.</CodeAlert></div>}

      <section className="mt-6 grid gap-4">
        {result.error && <CodeAlert tone="error">Impossible de charger les agents.</CodeAlert>}
        {!result.error && result.agents.length === 0 && <EmptyAdminState title="Aucun agent" text="Les agents soumis et publiés apparaîtront ici." />}
        {result.agents.map((agent) => (
          <CodePanel key={agent.id}>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-[#111827]">{agent.name}</h2>
                  <StatusBadge status={agent.status} label={statusLabels[agent.status] || agent.status} />
                  {agent.categoryName && <StatusBadge status="in_review" label={agent.categoryName} />}
                </div>
                <p className="max-w-3xl text-sm leading-6 text-[#4B5563]">{agent.summary}</p>
                <p className="mt-2 text-xs text-[#6B7280]">
                  Créateur : {agent.creatorName || 'Créateur inconnu'} · {agent.pricingType} · {agent.riskLevel} · {formatDate(agent.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {agent.status === 'approved' && (
                  <form action={moderateAgentPublicationAction}>
                    <input type="hidden" name="agent_id" value={agent.id} />
                    <input type="hidden" name="moderation_action" value="suspend" />
                    <input type="hidden" name="locale" value="fr" />
                    <input type="hidden" name="reason" value="Temporary admin safety suspension" />
                    <Button type="submit" variant="outline" className="border-[#F59E0B] bg-white text-[#92400E] hover:bg-[#FFFBEB]">
                      <Ban className="mr-2 h-4 w-4" />
                      Retirer temporairement
                    </Button>
                  </form>
                )}
                {agent.status === 'suspended' && (
                  <>
                    <form action={moderateAgentPublicationAction}>
                      <input type="hidden" name="agent_id" value={agent.id} />
                      <input type="hidden" name="moderation_action" value="restore" />
                      <input type="hidden" name="locale" value="fr" />
                      <input type="hidden" name="reason" value="Admin restored publication after safety review" />
                      <Button type="submit" className="border-0 bg-[#16A34A] text-white hover:bg-[#15803D]">
                        <Check className="mr-2 h-4 w-4" />
                        Remettre en ligne
                      </Button>
                    </form>
                    <form action={moderateAgentPublicationAction}>
                      <input type="hidden" name="agent_id" value={agent.id} />
                      <input type="hidden" name="moderation_action" value="archive" />
                      <input type="hidden" name="locale" value="fr" />
                      <input type="hidden" name="reason" value="Admin archived suspended agent after safety removal" />
                      <Button type="submit" variant="outline" className="border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]">
                        <Archive className="mr-2 h-4 w-4" />
                        Archiver
                      </Button>
                    </form>
                  </>
                )}
                {!['approved', 'suspended'].includes(agent.status) && (
                  <span className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#64748B]">Aucune action publication</span>
                )}
              </div>
            </div>
          </CodePanel>
        ))}
      </section>
    </main>
  );
}

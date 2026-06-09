import { requireAdminAccess } from '@/lib/auth/session';
import { toggleCreatorRuntimeAccessAction } from '@/server/admin/actions';
import { getAdminCreators } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate } from '../../_components/code-console-ui';
import { BooleanPill, Button, EmptyAdminState } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

function RuntimeAccessForm({ access, creator, runtimeType }) {
  const enabled = Boolean(access?.enabled);
  const label = runtimeType === 'workflow_automation' ? 'Agent workflow' : 'Agent API';

  return (
    <form action={toggleCreatorRuntimeAccessAction} className="rounded-2xl border border-[#DDD6FE] bg-[#FAF7FF] p-3">
      <input type="hidden" name="creator_id" value={creator.id} />
      <input type="hidden" name="runtime_type" value={runtimeType} />
      <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-label text-[10px] text-[#6B3FA0]">{label}</p>
          <div className="mt-1"><BooleanPill active={enabled} trueLabel="Allowlisted" falseLabel="Closed" /></div>
        </div>
        <Button type="submit" variant={enabled ? 'outline' : 'default'} className={enabled ? 'h-9 border-[#CBD5E1] bg-white text-[#475569]' : 'h-9 border-0 bg-[#6B3FA0] text-white hover:bg-[#5B21B6]'}>
          {enabled ? 'Désactiver' : 'Activer'}
        </Button>
      </div>
      <input
        name="notes"
        defaultValue={access?.notes || 'Beta admin allowlist'}
        className="h-9 w-full rounded-xl border border-[#DDD6FE] bg-white px-3 text-xs text-[#111827] outline-none focus:border-[#8B5CF6]"
        placeholder="Notes internes"
      />
    </form>
  );
}

export default async function AdminCreatorsPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/creators');
  const params = searchParams ? await searchParams : {};
  const updated = typeof params?.updated === 'string' ? params.updated : null;
  const error = typeof params?.error === 'string' ? params.error : null;
  const result = await getAdminCreators();

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN CREATORS"
        title="Creators & allowlist"
        description="Autorisez les runtimes beta sensibles creator par creator, sans SQL manuel."
      />

      {updated && <CodeAlert tone="success">Allowlist creator mise à jour.</CodeAlert>}
      {error && <div className="mt-4"><CodeAlert tone="error">Impossible de mettre à jour l’allowlist runtime.</CodeAlert></div>}

      <section className="mt-6 grid gap-4">
        {result.error && <CodeAlert tone="error">Impossible de charger les creators.</CodeAlert>}
        {!result.error && result.creators.length === 0 && <EmptyAdminState title="Aucun creator" text="Les comptes creators apparaîtront ici après inscription." />}
        {result.creators.map((creator) => (
          <CodePanel key={creator.id}>
            <div className="grid gap-5 xl:grid-cols-[1fr_520px] xl:items-start">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-[#111827]">{creator.publicName}</h2>
                  <StatusBadge status={creator.verifiedAt ? 'approved' : 'pending'} label={creator.verifiedAt ? 'Vérifié' : 'Non vérifié'} />
                  {creator.role && <StatusBadge status="in_review" label={creator.role} />}
                </div>
                <p className="text-sm text-[#4B5563]">{creator.email}</p>
                <p className="mt-2 text-xs text-[#6B7280]">
                  Créé le {formatDate(creator.createdAt)} · {creator.agentCount} agents · {creator.approvedAgentCount} publiés
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <RuntimeAccessForm creator={creator} runtimeType="workflow_automation" access={creator.runtimeAccess.workflow_automation} />
                <RuntimeAccessForm creator={creator} runtimeType="creator_endpoint" access={creator.runtimeAccess.creator_endpoint} />
              </div>
            </div>
          </CodePanel>
        ))}
      </section>
    </main>
  );
}

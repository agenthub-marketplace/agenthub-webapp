import { requireAdminAccess } from '@/lib/auth/session';
import { moderateEndpointAction } from '@/server/admin/actions';
import { getAdminEndpoints } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate } from '../../_components/code-console-ui';
import { Button, EmptyAdminState } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

function EndpointCard({ endpoint, family, title }) {
  return (
    <CodePanel>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-start">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-[#111827]">{endpoint.name}</h2>
            <StatusBadge status={endpoint.status === 'approved' ? 'approved' : endpoint.status === 'rejected' ? 'rejected' : 'pending'} label={endpoint.status} />
            <StatusBadge status="in_review" label={title} />
          </div>
          <p className="break-all rounded-xl border border-[#DDD6FE] bg-[#F8FAFC] p-3 text-sm text-[#374151]">{endpoint.endpointUrl}</p>
          <p className="mt-2 text-xs text-[#6B7280]">
            {endpoint.creatorName} · Créé le {formatDate(endpoint.createdAt)}
            {endpoint.approvedAt ? ` · Approuvé le ${formatDate(endpoint.approvedAt)}` : ''}
          </p>
          {endpoint.verificationNotes && <p className="mt-2 text-sm text-[#4B5563]">{endpoint.verificationNotes}</p>}
        </div>
        <form action={moderateEndpointAction} className="rounded-2xl border border-[#DDD6FE] bg-[#FAF7FF] p-3">
          <input type="hidden" name="endpoint_id" value={endpoint.id} />
          <input type="hidden" name="endpoint_family" value={family} />
          <label className="font-label text-xs text-[#6B3FA0]">Décision endpoint</label>
          <select name="endpoint_action" defaultValue="approve" className="mt-2 h-10 w-full rounded-xl border border-[#DDD6FE] bg-white px-3 text-sm">
            <option value="approve">Approuver</option>
            <option value="reject">Rejeter</option>
            <option value="suspend">Suspendre</option>
          </select>
          <textarea name="notes" rows={3} className="mt-2 w-full rounded-xl border border-[#DDD6FE] bg-white p-3 text-sm outline-none focus:border-[#8B5CF6]" placeholder="Notes de vérification" />
          <Button type="submit" className="mt-2 h-10 w-full border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
            Enregistrer
          </Button>
        </form>
      </div>
    </CodePanel>
  );
}

export default async function AdminEndpointsPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/endpoints');
  const params = searchParams ? await searchParams : {};
  const updated = typeof params?.updated === 'string' ? params.updated : null;
  const error = typeof params?.error === 'string' ? params.error : null;
  const result = await getAdminEndpoints();
  const total = result.workflowEndpoints.length + result.creatorApiEndpoints.length;

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN ENDPOINTS"
        title="Endpoints creator"
        description="Validation manuelle des endpoints appelés côté serveur par AgentHub."
      />

      {updated && <CodeAlert tone="success">Endpoint mis à jour.</CodeAlert>}
      {error && <div className="mt-4"><CodeAlert tone="error">Impossible de mettre à jour cet endpoint.</CodeAlert></div>}

      <section className="mt-6 space-y-8">
        {result.error && <CodeAlert tone="error">Impossible de charger les endpoints.</CodeAlert>}
        {!result.error && total === 0 && <EmptyAdminState title="Aucun endpoint soumis" text="Les endpoints workflow et API creator soumis apparaîtront ici." />}
        {result.workflowEndpoints.length > 0 && (
          <div>
            <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Workflow webhooks</h2>
            <div className="grid gap-4">
              {result.workflowEndpoints.map((endpoint) => (
                <EndpointCard key={endpoint.id} endpoint={endpoint} family="workflow_webhook" title="Workflow" />
              ))}
            </div>
          </div>
        )}
        {result.creatorApiEndpoints.length > 0 && (
          <div>
            <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Creator API endpoints</h2>
            <div className="grid gap-4">
              {result.creatorApiEndpoints.map((endpoint) => (
                <EndpointCard key={endpoint.id} endpoint={endpoint} family="creator_api" title="Creator endpoint" />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

import { requireAdminAccess } from '@/lib/auth/session';
import { moderateEndpointAction, testEndpointHealthAction } from '@/server/admin/actions';
import { getAdminEndpoints } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate } from '../../_components/code-console-ui';
import { Button, EmptyAdminState } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

function endpointHost(endpointUrl) {
  try {
    return new URL(endpointUrl).host;
  } catch {
    return 'URL invalide';
  }
}

function healthCopy(code) {
  const labels = {
    empty_response: 'Réponse vide',
    http_400: 'HTTP 400',
    http_401: 'HTTP 401',
    http_403: 'HTTP 403',
    http_404: 'HTTP 404',
    invalid_json: 'JSON invalide',
    missing_output_text: 'output_text manquant',
    ok: 'Endpoint OK',
    redirect_blocked: 'Redirection bloquée',
    response_too_large: 'Réponse trop volumineuse',
    signing_secret_missing: 'Secret de signature manquant',
    timeout_or_network: 'Timeout ou réseau',
    url_not_safe: 'URL non sûre',
  };

  return labels[code] ?? code ?? 'Test indisponible';
}

function EndpointCard({ endpoint, family, healthCode, healthStatus, title }) {
  const checklist =
    family === 'creator_api'
      ? ['HTTPS public', 'Pas de localhost/IP privée', 'Réponse JSON output_text', 'HMAC côté creator recommandé']
      : ['HTTPS public', 'Pas de localhost/IP privée', 'Webhook approuvé', 'Payload sans secrets'];
  const effectiveHealthCode = healthCode ?? endpoint.healthCheck?.code ?? null;
  const effectiveHealthStatus = healthStatus ?? endpoint.healthCheck?.status ?? null;
  const hasHealthResult = Boolean(effectiveHealthStatus && effectiveHealthCode && effectiveHealthStatus !== 'not_checked');
  const healthLabel = testedEndpointLabel(healthStatus);

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
            {endpoint.creatorName}
            {endpoint.creatorEmail ? ` · ${endpoint.creatorEmail}` : ''}
            {' · '}
            Host {endpointHost(endpoint.endpointUrl)} · Créé le {formatDate(endpoint.createdAt)}
            {endpoint.approvedAt ? ` · Approuvé le ${formatDate(endpoint.approvedAt)}` : ''}
          </p>
          {endpoint.verificationNotes && <p className="mt-2 text-sm text-[#4B5563]">{endpoint.verificationNotes}</p>}
          {hasHealthResult && (
            <div className={`mt-3 rounded-xl border p-3 text-sm ${effectiveHealthStatus === 'ok' ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]' : 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]'}`}>
              {healthLabel} : {healthCopy(effectiveHealthCode)}
              {endpoint.healthCheck?.testedAt && !healthStatus ? ` · ${formatDate(endpoint.healthCheck.testedAt)}` : ''}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {checklist.map((item) => (
              <span key={item} className="rounded-full border border-[#DDD6FE] bg-[#FAF7FF] px-2.5 py-1 text-[11px] font-semibold text-[#6B3FA0]">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <form action={testEndpointHealthAction} className="rounded-2xl border border-[#DDD6FE] bg-white p-3">
            <input type="hidden" name="endpoint_id" value={endpoint.id} />
            <input type="hidden" name="endpoint_family" value={family} />
            <p className="font-label text-xs text-[#6B3FA0]">Health check manuel</p>
            <p className="mt-2 text-xs leading-5 text-[#4B5563]">
              Envoie un POST signé et borné. La réponse brute n’est pas stockée.
            </p>
            <Button type="submit" variant="outline" className="mt-2 h-10 w-full border-[#DDD6FE] bg-white text-[#111827] hover:border-[#8B5CF6]">
              Tester endpoint
            </Button>
          </form>

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
      </div>
    </CodePanel>
  );
}

function testedEndpointLabel(healthStatus) {
  return healthStatus ? 'Test manuel' : 'Dernier test enregistré';
}

export default async function AdminEndpointsPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/endpoints');
  const params = searchParams ? await searchParams : {};
  const updated = typeof params?.updated === 'string' ? params.updated : null;
  const error = typeof params?.error === 'string' ? params.error : null;
  const tested = typeof params?.tested === 'string' ? params.tested : null;
  const testCode = typeof params?.testCode === 'string' ? params.testCode : null;
  const testedEndpoint = typeof params?.endpoint === 'string' ? params.endpoint : null;
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
      {tested && (
        <div className="mt-4">
          <CodeAlert tone={tested === 'ok' ? 'success' : 'warning'}>
            Test endpoint : {healthCopy(testCode)}.
          </CodeAlert>
        </div>
      )}

      <section className="mt-6 space-y-8">
        {result.error && <CodeAlert tone="error">Impossible de charger les endpoints.</CodeAlert>}
        {!result.error && total === 0 && <EmptyAdminState title="Aucun endpoint soumis" text="Les endpoints workflow et API creator soumis apparaîtront ici." />}
        {result.workflowEndpoints.length > 0 && (
          <div>
            <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Workflow webhooks</h2>
            <div className="grid gap-4">
              {result.workflowEndpoints.map((endpoint) => (
                <EndpointCard
                  key={endpoint.id}
                  endpoint={endpoint}
                  family="workflow_webhook"
                  healthCode={testedEndpoint === endpoint.id ? testCode : null}
                  healthStatus={testedEndpoint === endpoint.id ? tested : null}
                  title="Workflow"
                />
              ))}
            </div>
          </div>
        )}
        {result.creatorApiEndpoints.length > 0 && (
          <div>
            <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Creator API endpoints</h2>
            <div className="grid gap-4">
              {result.creatorApiEndpoints.map((endpoint) => (
                <EndpointCard
                  key={endpoint.id}
                  endpoint={endpoint}
                  family="creator_api"
                  healthCode={testedEndpoint === endpoint.id ? testCode : null}
                  healthStatus={testedEndpoint === endpoint.id ? tested : null}
                  title="Creator endpoint"
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

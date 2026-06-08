import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminOpsSnapshot } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate } from '../../_components/code-console-ui';
import { AdminStatCard, EmptyAdminState } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

export default async function AdminOpsPage() {
  await requireAdminAccess('fr', '/code/admin/ops');
  const result = await getAdminOpsSnapshot();

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN OPS"
        title="Sanity beta"
        description="Checks read-only pour repérer les anomalies. Aucun correctif destructif depuis l’UI."
      />

      {result.error && <CodeAlert tone="error">Impossible de charger les checks ops.</CodeAlert>}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {(result.checks ?? []).map((check) => (
          <AdminStatCard key={check.key} label={check.label} value={check.value} tone={check.tone} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Runs récents</h2>
          <div className="grid gap-3">
            {result.recentRuns.length === 0 && <EmptyAdminState title="Aucun run récent" text="Les exécutions LLM/document/workflow/endpoints apparaîtront ici." />}
            {result.recentRuns.map((run) => (
              <CodePanel key={run.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-[#111827]">{run.agent?.name ?? 'Agent inconnu'}</h3>
                  <StatusBadge status={run.status} label={run.status} />
                  <StatusBadge status="in_review" label={run.provider} />
                  {run.errorCode && <StatusBadge status="failed" label={run.errorCode} />}
                </div>
                <p className="mt-2 text-sm text-[#6B7280]">{run.userEmail} · {formatDate(run.createdAt)}</p>
              </CodePanel>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display mb-3 text-2xl font-bold text-[#111827]">Audit logs récents</h2>
          <div className="grid gap-3">
            {result.auditLogs.length === 0 && <EmptyAdminState title="Aucun audit log" text="Les actions admin audit-loggées apparaîtront ici." />}
            {result.auditLogs.map((log) => (
              <CodePanel key={log.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-[#111827]">{log.action}</h3>
                  <StatusBadge status="in_review" label={log.entityType} />
                </div>
                <p className="mt-2 text-sm text-[#6B7280]">{log.actorEmail} · {formatDate(log.createdAt)}</p>
              </CodePanel>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

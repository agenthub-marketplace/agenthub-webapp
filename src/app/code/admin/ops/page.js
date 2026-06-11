import Link from 'next/link';
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

      <Link href="/code/admin/ops/advanced-agents" className="mb-6 block">
        <CodePanel tone="violet" className="transition hover:border-[#8B5CF6]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-label mb-1 text-xs text-[#6B3FA0]">DIAGNOSTIC AVANCÉ</p>
              <h2 className="font-display text-xl font-bold text-[#111827]">Agents workflow/API</h2>
              <p className="mt-1 text-sm text-[#4B5563]">
                Voir runtime settings, allowlist creator, assets, security review et dernier run par agent avancé.
              </p>
            </div>
            <span className="text-sm font-semibold text-[#5B21B6]">Ouvrir le diagnostic →</span>
          </div>
        </CodePanel>
      </Link>

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

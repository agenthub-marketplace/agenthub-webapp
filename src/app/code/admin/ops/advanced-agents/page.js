import Link from 'next/link';
import { requireAdminAccess } from '@/lib/auth/session';
import { getAdvancedAgentDiagnostics } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate, getRuntimeTypeLabel } from '../../../_components/code-console-ui';
import { AdminStatCard, EmptyAdminState } from '../../_components/admin-shared';

export const dynamic = 'force-dynamic';

function checkTone(ok) {
  return ok ? 'approved' : 'failed';
}

function compatibilityTone(status) {
  if (status === 'ready') {
    return 'approved';
  }

  if (status === 'review_required') {
    return 'in_review';
  }

  return 'failed';
}

function ReadyBadge({ ready }) {
  return ready ? <StatusBadge status="approved" label="Prêt beta" /> : <StatusBadge status="failed" label="Bloqué" />;
}

function ReadinessScore({ readiness }) {
  const toneClass =
    readiness.tone === 'success'
      ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]'
      : readiness.tone === 'warning'
        ? 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]'
        : 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="font-label text-xs">Readiness score</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="font-display text-3xl font-bold">{readiness.score}</p>
        <p className="pb-1 text-sm font-semibold">/ 100 · {readiness.label}</p>
      </div>
      {readiness.blockers.length > 0 && (
        <p className="mt-2 text-xs leading-5">
          Blockers: {readiness.blockers.join(', ')}
        </p>
      )}
    </div>
  );
}

function infraDescription(item) {
  if (item.runtimeType === 'creator_endpoint') {
    return 'AgentHub garde accès, paiement, historique et avis. L’exécution passe par un endpoint creator approuvé, appelé serveur uniquement.';
  }

  if (item.infra.fallbackMode === 'hybrid_webhook') {
    return 'Workflow orchestré par AgentHub avec au moins un webhook creator approuvé. Les health checks doivent être OK ou explicitement waivés.';
  }

  return 'Workflow orchestré par AgentHub. Aucun endpoint creator n’est requis pour cette version.';
}

function WorkspaceCompatibility({ compatibility }) {
  const decision = compatibility.decision;

  return (
    <div className="rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label text-xs text-[#6B3FA0]">Compatibilité workspace</p>
          <p className="mt-1 text-sm font-bold text-[#111827]">{compatibility.label}</p>
        </div>
        <StatusBadge status={compatibilityTone(compatibility.status)} label={compatibility.status === 'ready' ? 'Compatible' : compatibility.status === 'review_required' ? 'À revoir' : 'Bloqué'} />
      </div>
      <p className="mt-3 text-xs leading-5 text-[#64748B]">{compatibility.detail}</p>
      {decision && (
        <div className="mt-3 rounded-xl border border-[#E9D5FF] bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-label text-[10px] text-[#6B3FA0]">Décision workspace</p>
              <p className="mt-1 text-sm font-bold text-[#111827]">
                {decision.fallbackRequired ? 'Fallback creator requis' : 'Workspace AgentHub compatible'}
              </p>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">{decision.adminAction}</p>
              <p className="mt-2 text-xs leading-5 text-[#7C3AED]">{decision.userDisclosure}</p>
            </div>
            <StatusBadge
              status={decision.fallbackRequired ? 'in_review' : 'approved'}
              label={decision.runtimeOwner === 'creator' ? 'Creator-owned' : decision.runtimeOwner === 'hybrid' ? 'Hybrid' : 'AgentHub-owned'}
            />
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {compatibility.checks.map((check) => (
          <StatusBadge
            key={check.key}
            status={checkTone(check.ok)}
            label={`${check.label}: ${check.ok ? 'OK' : 'KO'}`}
          />
        ))}
      </div>
    </div>
  );
}

function AdvancedAgentCard({ item }) {
  return (
    <CodePanel tone={item.ready ? 'green' : 'amber'}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold text-[#111827]">{item.agent.name}</h2>
            <ReadyBadge ready={item.ready} />
            <StatusBadge status="in_review" label={getRuntimeTypeLabel(item.runtimeType)} />
            <StatusBadge status={item.agent.status} label={item.agent.status} />
          </div>
          <p className="mt-2 text-sm text-[#4B5563]">
            {item.creator.publicName} · {item.creator.email} · version {item.versionId.slice(0, 8)}
          </p>
          {item.firstBlocker && (
            <div className="mt-4 rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
              <span className="font-semibold">Premier blocage :</span> {item.firstBlocker}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/code/admin/review`} className="rounded-xl border border-[#D8DDEE] bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:border-[#8B5CF6]">
            Review admin
          </Link>
          {item.securityReview?.id && (
            <Link href={`/code/admin/security/reviews/${item.securityReview.id}`} className="rounded-xl border border-[#D8DDEE] bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:border-[#8B5CF6]">
              Security review
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <ReadinessScore readiness={item.readiness} />
        <div className="grid gap-4">
          <WorkspaceCompatibility compatibility={item.workspaceCompatibility} />
          <div className="rounded-2xl border border-[#DDD6FE] bg-white p-4">
            <p className="font-label mb-2 text-xs text-[#6B3FA0]">Infrastructure runtime</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="in_review" label={item.infra.fallbackMode} />
              {item.infra.health && (
                <StatusBadge status={item.infra.health.ok ? 'approved' : 'failed'} label={`health: ${item.infra.health.status}`} />
              )}
            </div>
            <p className="mt-2 text-xs leading-5 text-[#64748B]">{infraDescription(item)}</p>
            {item.infra.health?.detail && (
              <p className="mt-2 text-xs leading-5 text-[#64748B]">Dernier health check : {item.infra.health.detail}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {item.checks.map((check) => (
          <div key={check.key} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#111827]">{check.label}</p>
              <StatusBadge status={checkTone(check.ok)} label={check.ok ? 'OK' : 'À corriger'} />
            </div>
            {check.detail && <p className="mt-2 text-xs leading-5 text-[#64748B]">{check.detail}</p>}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">Asset runtime</p>
          {item.runtimeType === 'workflow_automation' ? (
            item.asset.workflowSteps.length ? (
              <ul className="space-y-2 text-sm text-[#4B5563]">
                {item.asset.workflowSteps.map((step, index) => (
                  <li key={`${step.type}-${step.label}`} className="flex gap-2">
                    <span className="font-label text-xs text-[#6B3FA0]">{index + 1}</span>
                    <span>{step.type === 'webhook_step' ? 'Webhook' : 'LLM'} · {step.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#64748B]">Aucune définition workflow lisible.</p>
            )
          ) : (
            <div className="space-y-1 text-sm text-[#4B5563]">
              <p>{item.asset.endpointName ?? 'Endpoint non configuré'}</p>
              <p className="break-all text-xs text-[#64748B]">{item.asset.endpointUrl ?? 'URL non disponible'}</p>
              {item.asset.endpointStatus && <StatusBadge status={item.asset.endpointStatus} label={item.asset.endpointStatus} />}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">Dernier run</p>
          {item.latestRun ? (
            <div className="space-y-2 text-sm text-[#4B5563]">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={item.latestRun.status} label={item.latestRun.status} />
                <StatusBadge status="in_review" label={item.latestRun.provider} />
                {item.latestRun.errorCode && <StatusBadge status="failed" label={item.latestRun.errorCode} />}
              </div>
              <p>{formatDate(item.latestRun.createdAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">Aucun run enregistré pour cette version.</p>
          )}
        </div>
      </div>
    </CodePanel>
  );
}

export default async function AdvancedAgentsOpsPage() {
  await requireAdminAccess('fr', '/code/admin/ops/advanced-agents');
  const result = await getAdvancedAgentDiagnostics();

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN OPS"
        title="Diagnostic agents avancés"
        description="Vue read-only pour comprendre les blocages workflow/API avant publication ou exécution workspace."
        action={
          <Link href="/code/admin/ops" className="rounded-xl border border-[#D8DDEE] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:border-[#8B5CF6]">
            Retour ops
          </Link>
        }
      />

      {result.error && <CodeAlert tone="error">Impossible de charger le diagnostic agents avancés.</CodeAlert>}

      <section className="mb-6 grid gap-4 md:grid-cols-5">
        <AdminStatCard label="Agents avancés" value={result.summary.total} />
        <AdminStatCard label="Prêts beta" value={result.summary.ready} tone="success" />
        <AdminStatCard label="Bloqués" value={result.summary.blocked} tone={result.summary.blocked > 0 ? 'warning' : 'success'} />
        <AdminStatCard label="Fallback creator" value={result.summary.fallbackRequired} tone={result.summary.fallbackRequired > 0 ? 'warning' : 'success'} />
        <AdminStatCard label="Readiness moyenne" value={`${result.summary.averageReadiness}/100`} tone={result.summary.averageReadiness >= 90 ? 'success' : result.summary.averageReadiness >= 70 ? 'warning' : 'error'} />
      </section>

      <section className="grid gap-4">
        {result.diagnostics.length === 0 && (
          <EmptyAdminState
            title="Aucun agent avancé"
            text="Les agents workflow_automation et creator_endpoint apparaîtront ici dès qu’un creator en soumet."
          />
        )}
        {result.diagnostics.map((item) => (
          <AdvancedAgentCard key={item.versionId} item={item} />
        ))}
      </section>
    </main>
  );
}

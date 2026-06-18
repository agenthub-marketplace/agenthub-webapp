import Link from 'next/link';
import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminSecurityReviews } from '@/server/admin/code-admin';
import { Button } from '@/components/ui/button';
import { CodePageHeader, CodePanel, StatusBadge } from '../../_components/code-console-ui';
import { AdminQuickLink, AdminStatCard, SecurityChecklist } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

const runtimeReviewRules = [
  {
    decision: 'Standard review',
    detail: 'Aucune security review obligatoire par défaut. Vérifier promesse, limites, prix et données demandées.',
    label: 'Assistant IA guidé',
    runtimeType: 'llm_prompt',
    status: 'approved',
  },
  {
    decision: 'Review légère',
    detail: 'Valider stockage privé, limites PDF/DOCX, absence d’URL publique et consigne anti-documents sensibles réels.',
    label: 'Agent document',
    runtimeType: 'document_file',
    status: 'in_review',
  },
  {
    decision: 'Review obligatoire',
    detail: 'Valider le DSL linéaire, les étapes LLM, les webhooks approuvés et l’absence de secrets dans le payload.',
    label: 'Agent workflow',
    runtimeType: 'workflow_automation',
    status: 'failed',
  },
  {
    decision: 'Review obligatoire',
    detail: 'Valider endpoint HTTPS public, HMAC, timeout, réponse bornée et aucun appel client direct.',
    label: 'Agent API creator',
    runtimeType: 'creator_endpoint',
    status: 'failed',
  },
];

export default async function AdminSecurityPage() {
  await requireAdminAccess('fr', '/code/admin/security');
  const result = await getAdminSecurityReviews();
  const reviews = result.reviews ?? [];

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN SECURITY"
        title="Security Review v0"
        description="Revue manuelle des runtimes sensibles. Codex Security pourra assister l’analyse plus tard, sans décision automatique."
        action={
          <Link href="/code/admin/security/reviews">
            <Button className="h-11 border-0 bg-[#111827] px-5 text-white hover:bg-[#2B1A44]">Ouvrir les reviews</Button>
          </Link>
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminStatCard label="Reviews totales" value={reviews.length} />
        <AdminStatCard label="À traiter" value={reviews.filter((review) => ['pending', 'in_review'].includes(review.status)).length} tone="warning" />
        <AdminStatCard label="Passées" value={reviews.filter((review) => review.status === 'passed').length} tone="success" />
        <AdminStatCard label="Failed" value={reviews.filter((review) => review.status === 'failed').length} tone="error" />
      </section>

      <section className="mb-6 rounded-3xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_62%,#F3E8FF_100%)] p-5 shadow-[0_18px_50px_rgba(109,64,160,0.08)]">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-label text-xs text-[#6B3FA0]">MODE OPÉRATOIRE</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#111827]">Ce qui bloque une publication sensible</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#4B5563]">
            La décision finale reste humaine. Codex Security peut aider plus tard, mais un admin doit toujours relire les findings et assumer le passage en marketplace.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {runtimeReviewRules.map((rule) => (
            <CodePanel key={rule.runtimeType} className="bg-white">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-label text-xs text-[#6B3FA0]">{rule.label}</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#111827]">{rule.decision}</h3>
                </div>
                <StatusBadge status={rule.status} label={rule.status === 'approved' ? 'simple' : rule.status === 'in_review' ? 'à revoir' : 'bloquant'} />
              </div>
              <p className="mb-4 text-sm leading-6 text-[#4B5563]">{rule.detail}</p>
              <SecurityChecklist runtimeType={rule.runtimeType} />
            </CodePanel>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <CodePanel tone="violet">
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">1. Créer ou ouvrir</p>
          <h2 className="font-display text-xl font-bold text-[#111827]">Review liée à l’asset</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            La review doit pointer vers la version agent, l’endpoint creator ou l’asset workflow concerné. Pas de décision générique sans lien traçable.
          </p>
        </CodePanel>
        <CodePanel tone="violet">
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">2. Relire les preuves</p>
          <h2 className="font-display text-xl font-bold text-[#111827]">Checklist + findings</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Vérifier les limites runtime, les données exposées, les endpoints, les timeouts et les messages visibles par l’utilisateur.
          </p>
        </CodePanel>
        <CodePanel tone="violet">
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">3. Décider</p>
          <h2 className="font-display text-xl font-bold text-[#111827]">Passed, failed ou waived</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            `passed` autorise la suite. `waived` doit rester exceptionnel et documenté. `failed` bloque la publication jusqu’à correction.
          </p>
        </CodePanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <AdminQuickLink href="/code/admin/security/reviews" title="Reviews sécurité" description="Lister et décider les security reviews liées aux assets sensibles." />
        <AdminQuickLink href="/code/admin/review" title="Validation agents" description="Les approbations agents sensibles sont bloquées tant que la review n’est pas passée ou waived." />
      </section>
    </main>
  );
}

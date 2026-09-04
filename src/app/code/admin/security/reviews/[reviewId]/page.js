import { requireAdminAccess } from '@/lib/auth/session';
import { decideSecurityReviewAction } from '@/server/admin/actions';
import { getAdminSecurityReview } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate, getRuntimeTypeLabel } from '../../../../_components/code-console-ui';
import { Button, EmptyAdminState, SecurityChecklist } from '../../../_components/admin-shared';

export const dynamic = 'force-dynamic';

export default async function AdminSecurityReviewDetailPage({ params, searchParams }) {
  await requireAdminAccess('fr', '/code/admin/security/reviews');
  const resolvedParams = params ? await params : {};
  const resolvedSearch = searchParams ? await searchParams : {};
  const reviewId = typeof resolvedParams?.reviewId === 'string' ? resolvedParams.reviewId : '';
  const updated = typeof resolvedSearch?.updated === 'string' ? resolvedSearch.updated : null;
  const result = await getAdminSecurityReview(reviewId);
  const review = result.review;

  if (!review) {
    return (
      <main className="px-4 py-8 lg:px-8">
        <CodePageHeader eyebrow="SECURITY REVIEW" title="Review introuvable" />
        <EmptyAdminState title="Review introuvable" text="Cette security review n’existe pas ou n’est pas accessible." />
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="SECURITY REVIEW"
        title={review.agent?.name ?? review.assetType}
        description={`${review.assetType} · ${getRuntimeTypeLabel(review.runtimeType)} · créé le ${formatDate(review.createdAt)}`}
      />

      {updated && <CodeAlert tone="success">Décision security review enregistrée.</CodeAlert>}

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <CodePanel>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={review.status === 'passed' ? 'approved' : review.status === 'failed' ? 'failed' : 'pending'} label={review.status} />
              <StatusBadge status="in_review" label={getRuntimeTypeLabel(review.runtimeType)} />
              {review.agent && <StatusBadge status={review.agent.status} label={review.agent.status} />}
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="font-label text-[10px] text-[#6B3FA0]">Asset type</dt>
                <dd className="mt-1 text-[#111827]">{review.assetType}</dd>
              </div>
              <div>
                <dt className="font-label text-[10px] text-[#6B3FA0]">Asset id</dt>
                <dd className="mt-1 break-all text-[#111827]">{review.assetId}</dd>
              </div>
              <div>
                <dt className="font-label text-[10px] text-[#6B3FA0]">Agent version</dt>
                <dd className="mt-1 break-all text-[#111827]">{review.agentVersionId || 'n/a'}</dd>
              </div>
              <div>
                <dt className="font-label text-[10px] text-[#6B3FA0]">Dernière décision</dt>
                <dd className="mt-1 text-[#111827]">{review.reviewedAt ? formatDate(review.reviewedAt) : 'Aucune décision finale'}</dd>
              </div>
            </dl>
          </CodePanel>

          <CodePanel>
            <h2 className="font-display mb-4 text-xl font-bold text-[#111827]">Checklist manuelle v0</h2>
            <SecurityChecklist runtimeType={review.runtimeType} />
          </CodePanel>

          <CodePanel>
            <h2 className="font-display mb-4 text-xl font-bold text-[#111827]">Findings</h2>
            {review.findings.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Aucun finding enregistré. Codex Security pourra alimenter cette section plus tard.</p>
            ) : (
              <pre className="overflow-auto rounded-xl bg-[#0F172A] p-4 text-xs text-white">{JSON.stringify(review.findings, null, 2)}</pre>
            )}
          </CodePanel>
        </div>

        <CodePanel>
          <h2 className="font-display text-xl font-bold text-[#111827]">Décision admin</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            La décision finale reste manuelle. Codex Security peut assister l’analyse, mais ne bloque jamais automatiquement en v0.
          </p>
          <form action={decideSecurityReviewAction} className="mt-5 space-y-3">
            <input type="hidden" name="review_id" value={review.id} />
            <select name="status" defaultValue={review.status} className="h-11 w-full rounded-xl border border-[#DDD6FE] bg-white px-3 text-sm">
              <option value="pending">Pending</option>
              <option value="in_review">In review</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="waived">Waived</option>
            </select>
            <textarea name="notes" defaultValue={review.notes || ''} rows={5} className="w-full rounded-xl border border-[#DDD6FE] bg-white p-3 text-sm outline-none focus:border-[#8B5CF6]" placeholder="Notes de décision" />
            <Button type="submit" className="h-11 w-full border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
              Enregistrer la décision
            </Button>
          </form>
        </CodePanel>
      </section>
    </main>
  );
}

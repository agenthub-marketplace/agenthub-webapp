import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminSecurityReviews } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, StatusBadge, formatDate, getRuntimeTypeLabel } from '../../../_components/code-console-ui';
import { EmptyAdminState } from '../../_components/admin-shared';

export const dynamic = 'force-dynamic';

export default async function AdminSecurityReviewsPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/security/reviews');
  const params = searchParams ? await searchParams : {};
  const error = typeof params?.error === 'string' ? params.error : null;
  const result = await getAdminSecurityReviews();

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="SECURITY REVIEWS"
        title="Reviews sécurité"
        description="Décisions manuelles pour document_file, workflow_automation, creator_endpoint et futurs packages code."
      />

      {error && <CodeAlert tone="error">Impossible de mettre à jour la security review.</CodeAlert>}

      <section className="mt-6 grid gap-4">
        {result.error && <CodeAlert tone="error">Impossible de charger les security reviews.</CodeAlert>}
        {!result.error && result.reviews.length === 0 && (
          <EmptyAdminState title="Aucune security review" text="Les reviews seront créées quand un asset sensible sera soumis." />
        )}
        {result.reviews.map((review) => (
          <Link key={review.id} href={`/code/admin/security/reviews/${review.id}`}>
            <CodePanel className="transition hover:border-[#8B5CF6]">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-[#111827]">{review.agent?.name ?? review.assetType}</h2>
                    <StatusBadge status={review.status === 'passed' ? 'approved' : review.status === 'failed' ? 'failed' : 'pending'} label={review.status} />
                    <StatusBadge status="in_review" label={getRuntimeTypeLabel(review.runtimeType)} />
                  </div>
                  <p className="text-sm text-[#4B5563]">
                    {review.assetType} · {review.assetId} · créé le {formatDate(review.createdAt)}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-[#6B3FA0]" />
              </div>
            </CodePanel>
          </Link>
        ))}
      </section>
    </main>
  );
}

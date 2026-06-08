import Link from 'next/link';
import { requireAdminAccess } from '@/lib/auth/session';
import { getAdminSecurityReviews } from '@/server/admin/code-admin';
import { Button } from '@/components/ui/button';
import { CodePageHeader } from '../../_components/code-console-ui';
import { AdminQuickLink, AdminStatCard } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

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

      <section className="grid gap-4 md:grid-cols-2">
        <AdminQuickLink href="/code/admin/security/reviews" title="Reviews sécurité" description="Lister et décider les security reviews liées aux assets sensibles." />
        <AdminQuickLink href="/code/admin/review" title="Validation agents" description="Les approbations agents sensibles sont bloquées tant que la review n’est pas passée ou waived." />
      </section>
    </main>
  );
}

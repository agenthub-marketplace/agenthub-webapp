import Link from 'next/link';
import { ArrowRight, CheckCircle2, PieChart, TrendingUp, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodePanel, StatusBadge, formatDate, formatMoney, getRuntimeTypeLabel } from '../../_components/code-console-ui';

export function AdminStatCard({ label, tone = 'neutral', value }) {
  const toneClass =
    tone === 'error'
      ? 'border-[#FCA5A5] bg-[#FEF2F2]'
      : tone === 'warning'
        ? 'border-[#FCD34D] bg-[#FFFBEB]'
        : tone === 'success'
          ? 'border-[#86EFAC] bg-[#F0FDF4]'
          : 'border-[#DDD6FE] bg-white';

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="font-label text-xs text-[#6B3FA0]">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-[#111827]">{value}</p>
    </div>
  );
}

export function AdminError({ children }) {
  return (
    <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
      {children}
    </div>
  );
}

export function BooleanPill({ active, falseLabel = 'Non', trueLabel = 'Oui' }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-label ${active ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]' : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]'}`}>
      {active ? trueLabel : falseLabel}
    </span>
  );
}

export function AdminQuickLink({ description, href, title }) {
  return (
    <Link href={href}>
      <CodePanel className="h-full transition hover:border-[#8B5CF6] hover:shadow-[0_18px_45px_rgba(109,64,160,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111827]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">{description}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-[#6B3FA0]" />
        </div>
      </CodePanel>
    </Link>
  );
}

function AdminRevenueBucketList({ buckets = [], currency, totalCents }) {
  if (!buckets.length) {
    return <p className="text-sm text-[#6B7280]">Aucune donnée revenue sur cette période.</p>;
  }

  return (
    <div className="space-y-3">
      {buckets.map((bucket) => {
        const width = totalCents > 0 ? Math.max(8, Math.round((bucket.amountCents / totalCents) * 100)) : 0;

        return (
          <div key={bucket.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-[#111827]">{bucket.label}</span>
              <span className="text-[#4B5563]">{formatMoney(bucket.amountCents, currency)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#EEF2FF]">
              <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${width}%` }} />
            </div>
            <p className="text-xs text-[#6B7280]">{bucket.purchaseCount} achat{bucket.purchaseCount > 1 ? 's' : ''}</p>
          </div>
        );
      })}
    </div>
  );
}

export function AdminRevenueOverview({ result }) {
  const analytics = result?.analytics;
  const currency = analytics?.currency ?? 'eur';

  if (result?.error) {
    return <AdminError>Impossible de charger les revenus beta.</AdminError>;
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_70%,#F5F3FF_100%)] shadow-[0_16px_42px_rgba(109,64,160,0.08)]">
      <div className="border-b border-[#DDD6FE] p-5">
        <p className="font-label mb-2 text-xs text-[#6B3FA0]">REVENUS BETA</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#111827]">GMV sandbox plateforme</h2>
            <p className="mt-2 text-sm text-[#4B5563]">{analytics?.sandboxNotice ?? 'Montants sandbox, aucun payout réel en beta.'}</p>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <Link href="?revenuePeriod=30d" className={`rounded-full border px-3 py-1.5 ${analytics?.period === '30d' ? 'border-[#8B5CF6] bg-[#F5F3FF] text-[#5B21B6]' : 'border-[#D8DDEE] bg-white text-[#4B5563]'}`}>
              30 jours
            </Link>
            <Link href="?revenuePeriod=all" className={`rounded-full border px-3 py-1.5 ${analytics?.period === 'all' ? 'border-[#8B5CF6] bg-[#F5F3FF] text-[#5B21B6]' : 'border-[#D8DDEE] bg-white text-[#4B5563]'}`}>
              Tout
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[0.9fr_1fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <AdminStatCard label="GMV activé" value={formatMoney(analytics?.activatedGmvCents ?? 0, currency)} tone="success" />
          <AdminStatCard label="Paiements à surveiller" value={formatMoney(analytics?.attentionCents ?? 0, currency)} tone={(analytics?.attentionCents ?? 0) > 0 ? 'warning' : 'success'} />
          <AdminStatCard label="Paiements pending" value={formatMoney(analytics?.pendingCents ?? 0, currency)} tone={(analytics?.pendingCents ?? 0) > 0 ? 'warning' : 'success'} />
          <AdminStatCard label="Panier moyen" value={formatMoney(analytics?.averageOrderCents ?? 0, currency)} />
          <div className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-5">
            <p className="font-label text-xs text-[#92400E]">PAYOUTS</p>
            <p className="mt-2 font-display text-lg font-bold text-[#111827]">
              {analytics?.payoutReadiness?.label ?? 'Payouts non configurés'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#92400E]">
              {analytics?.payoutReadiness?.detail ?? 'GMV sandbox uniquement. Stripe Connect et les payouts creator ne sont pas activés en beta.'}
            </p>
          </div>
          <div className="rounded-2xl border border-[#DDD6FE] bg-white p-5">
            <p className="font-label text-xs text-[#6B3FA0]">LEDGER</p>
            <p className="mt-2 font-display text-lg font-bold text-[#111827]">
              {analytics?.ledger?.eventCount ?? 0} événement(s)
            </p>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              {formatMoney(analytics?.ledger?.earnedCents ?? 0, currency)} attribué beta · {formatMoney(analytics?.ledger?.blockedCents ?? 0, currency)} bloqué
            </p>
          </div>
        </div>

        <CodePanel className="bg-white">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#111827]">Secteurs d’activité</h3>
            <PieChart className="h-5 w-5 text-[#6B3FA0]" />
          </div>
          <AdminRevenueBucketList buckets={analytics?.sectors ?? []} currency={currency} totalCents={analytics?.activatedGmvCents ?? 0} />
        </CodePanel>

        <CodePanel className="bg-white">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#111827]">Top agents</h3>
            <TrendingUp className="h-5 w-5 text-[#6B3FA0]" />
          </div>
          <AdminRevenueBucketList buckets={analytics?.topAgents ?? []} currency={currency} totalCents={analytics?.activatedGmvCents ?? 0} />
        </CodePanel>
      </div>
    </section>
  );
}

export function RuntimeSettingSummary({ setting }) {
  if (!setting) {
    return <StatusBadge status="failed" label="Runtime inconnu" />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <BooleanPill active={setting.enabled} trueLabel="Enabled" falseLabel="Disabled" />
      <BooleanPill active={setting.creator_visible} trueLabel="Creator visible" falseLabel="Creator hidden" />
      <BooleanPill active={setting.run_enabled} trueLabel="Run enabled" falseLabel="Run disabled" />
    </div>
  );
}

export function PaymentLine({ payment }) {
  return (
    <CodePanel>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-bold text-[#111827]">{payment.agent?.name ?? 'Agent inconnu'}</h2>
            <StatusBadge status={payment.status} label={payment.status} />
            {payment.activationError && <StatusBadge status="failed" label={payment.activationError} />}
          </div>
          <p className="mt-2 text-sm text-[#4B5563]">
            {payment.userEmail} · {formatDate(payment.createdAt)} · {payment.stripeCheckoutSessionId || 'session inconnue'}
          </p>
        </div>
        <p className="font-display text-lg font-bold text-[#111827]">{formatMoney(payment.amountCents, payment.currency)}</p>
      </div>
    </CodePanel>
  );
}

export function SecurityChecklist({ runtimeType }) {
  const items =
    runtimeType === 'document_file'
      ? ['Bucket privé confirmé', 'Aucun document sensible réel en beta', 'Pas d’URL publique', 'Limites taille/MIME respectées']
      : runtimeType === 'workflow_automation'
        ? ['DSL linéaire', 'Endpoints approuvés', 'Payload sans secrets', 'Timeout et HMAC prévus']
        : runtimeType === 'creator_endpoint'
          ? ['HTTPS public sûr', 'Pas d’IP privée', 'Signature HMAC', 'Réponse bornée et sans secrets']
          : ['Review manuelle requise', 'Findings relus', 'Décision admin explicite'];

  return (
    <ul className="grid gap-2 text-sm text-[#4B5563] sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function RuntimeName({ runtimeType }) {
  return <span>{getRuntimeTypeLabel(runtimeType)}</span>;
}

export function EmptyAdminState({ text, title }) {
  return (
    <CodePanel>
      <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
        <XCircle className="mb-4 h-9 w-9 text-[#94A3B8]" />
        <h2 className="font-display text-xl font-bold text-[#111827]">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6B7280]">{text}</p>
      </div>
    </CodePanel>
  );
}

export { Button };

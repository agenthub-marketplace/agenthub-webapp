import Link from 'next/link';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
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

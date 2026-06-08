import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { AGENT_RUNTIME_TYPE_LABELS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';

export const statusLabels = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  in_review: 'En revue',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  suspended: 'Suspendu',
};

export const rentalStatusLabels = {
  pending: 'À traiter',
  accepted: 'Actif',
  in_progress: 'Legacy',
  delivered: 'Livré',
  rejected: 'Refusé',
  cancelled: 'Annulé',
  active: 'Actif',
  stopped: 'Arrêté',
  expired: 'Expiré',
};

export const pricingLabels = {
  task: 'Agent à la location',
  project: "Agent à l'achat",
};

export const riskLabels = {
  low: 'Risque faible',
  medium: 'Risque moyen',
  high: 'Risque élevé',
  forbidden_beta: 'Non compatible beta',
};

export const accessAnalyticsStatuses = ['active', 'accepted', 'in_progress', 'delivered'];

export const statusTone = {
  draft: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
  submitted: 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]',
  in_review: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
  approved: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
  rejected: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]',
  suspended: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]',
  pending: 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]',
  accepted: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
  in_progress: 'border-[#7DD3FC] bg-[#F0F9FF] text-[#075985]',
  delivered: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
  active: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
  stopped: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
  expired: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
  cancelled: 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]',
  running: 'border-[#C4B5FD] bg-[#F5F3FF] text-[#5B21B6]',
  succeeded: 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]',
  failed: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]',
};

export function isChangesRequest(review) {
  return review?.isChangesRequest || (review?.decision === 'in_review' && Boolean(review?.notes?.trim()));
}

export function cleanAdminNotes(notes) {
  return (notes || '')
    .replace(/^\s*Modifications demandées\s*:\s*/i, '')
    .trim();
}

export function getAgentStatusLabel(agent) {
  if (agent?.status === 'in_review' && isChangesRequest(agent.latestAdminReview)) {
    return 'Modifications demandées';
  }

  return statusLabels[agent?.status] || agent?.status || 'Statut inconnu';
}

export function getAdminReviewLabel(review) {
  if (!review) {
    return '';
  }

  if (isChangesRequest(review)) {
    return 'Modifications demandées';
  }

  return statusLabels[review.decision] || review.decision;
}

export function canEditAgent(agent) {
  return ['submitted', 'in_review', 'rejected'].includes(agent?.status);
}

export function formatDate(value) {
  if (!value) {
    return 'Date inconnue';
  }

  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(cents, currency = 'eur') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

export function formatRating(rating, reviews = 0) {
  if (!reviews || !rating) {
    return 'Aucun avis';
  }

  return `${rating.toFixed(1)} (${reviews})`;
}

export function getRuntimeTypeLabel(runtimeType) {
  return AGENT_RUNTIME_TYPE_LABELS[runtimeType] || runtimeType || 'Runtime non défini';
}

export function getWorkspaceModeLabel(workspaceMode) {
  return WORKSPACE_MODE_LABELS[workspaceMode] || workspaceMode || 'Workspace non défini';
}

export function StatusBadge({ label, status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-label ${statusTone[status] || statusTone.draft}`}>
      {label}
    </span>
  );
}

const panelToneClasses = {
  default: 'border-[#DDD6FE] bg-white',
  violet: 'border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)]',
  blue: 'border-[#BFDBFE] bg-[linear-gradient(135deg,#FFFFFF_0%,#EFF6FF_100%)]',
  green: 'border-[#BBF7D0] bg-[linear-gradient(135deg,#FFFFFF_0%,#F0FDF4_100%)]',
  amber: 'border-[#FDE68A] bg-[linear-gradient(135deg,#FFFFFF_0%,#FFFBEB_100%)]',
  slate: 'border-[#E2E8F0] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_100%)]',
};

export function CodePanel({ children, className = '', tone = 'default' }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-[0_10px_30px_rgba(109,64,160,0.05)] transition duration-200 hover:brightness-[0.97] hover:shadow-[0_14px_36px_rgba(109,64,160,0.08)] ${panelToneClasses[tone] || panelToneClasses.default} ${className}`}>
      {children}
    </div>
  );
}

export function CodePageHeader({ action, description, eyebrow = 'AGENTHUB CODE', title }) {
  return (
    <section className="mb-8 grid gap-5 overflow-hidden rounded-3xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_58%,#F3E8FF_100%)] p-6 shadow-[0_18px_50px_rgba(109,64,160,0.08)] md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="font-label mb-2 text-xs text-[#6B3FA0]">{eyebrow}</p>
        <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[#4B5563]">{description}</p>}
      </div>
      {action && <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">{action}</div>}
    </section>
  );
}

export function CodeAlert({ children, tone = 'warning', title }) {
  const classes =
    tone === 'error'
      ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]'
      : tone === 'success'
        ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]'
        : 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertTriangle : ShieldAlert;

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          {title && <p className="font-display font-semibold text-[#111827]">{title}</p>}
          <p className="text-sm leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyCodeState({ action, icon: Icon = Clock, text, title }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8DDEE] bg-[#F8FAFC] p-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6B3FA0]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl font-bold text-[#111827]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6B7280]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

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

export function StatusBadge({ label, status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-label ${statusTone[status] || statusTone.draft}`}>
      {label}
    </span>
  );
}

export function CodePanel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#E3E7F2] bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
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

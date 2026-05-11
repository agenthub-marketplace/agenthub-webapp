import type { AgentStatus } from "@/types/agent";
import type { OrderStatus } from "@/types/order";

import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: AgentStatus | OrderStatus | "low" | "medium" | "high" | "verified";
  label?: string;
  locale?: Locale;
};

const statusClasses: Record<StatusBadgeProps["status"], string> = {
  approved: "bg-[#dceee6] text-[#1e5d47] border-[#b8dccd]",
  cancelled: "bg-[#f4eee5] text-[#6f675d] border-[#ded4c7]",
  completed: "bg-[#dceee6] text-[#1e5d47] border-[#b8dccd]",
  disputed: "bg-[#fde8d3] text-[#8a4b16] border-[#f6c99d]",
  draft: "bg-[#f4eee5] text-[#6f675d] border-[#ded4c7]",
  failed: "bg-[#f8dede] text-[#8a2f2f] border-[#e9b7b7]",
  high: "bg-[#f8dede] text-[#8a2f2f] border-[#e9b7b7]",
  in_progress: "bg-[#dfe8f6] text-[#244a7c] border-[#bfd0ea]",
  in_review: "bg-[#fff0c7] text-[#76541a] border-[#ead083]",
  low: "bg-[#dceee6] text-[#1e5d47] border-[#b8dccd]",
  medium: "bg-[#fff0c7] text-[#76541a] border-[#ead083]",
  paid: "bg-[#dfe8f6] text-[#244a7c] border-[#bfd0ea]",
  pending_payment: "bg-[#fff0c7] text-[#76541a] border-[#ead083]",
  refunded: "bg-[#f4eee5] text-[#6f675d] border-[#ded4c7]",
  rejected: "bg-[#f8dede] text-[#8a2f2f] border-[#e9b7b7]",
  submitted: "bg-[#dfe8f6] text-[#244a7c] border-[#bfd0ea]",
  suspended: "bg-[#f8dede] text-[#8a2f2f] border-[#e9b7b7]",
  verified: "bg-[#dceee6] text-[#1e5d47] border-[#b8dccd]",
};

export function StatusBadge({ status, label, locale = "fr" }: StatusBadgeProps) {
  const fallbackLabel = getDictionary(locale).statuses[status] ?? status.replaceAll("_", " ");

  return (
    <Badge
      className={cn(
        "capitalize",
        statusClasses[status],
      )}
      variant="outline"
    >
      {label ?? fallbackLabel}
    </Badge>
  );
}

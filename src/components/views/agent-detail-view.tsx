import Link from "next/link";
import { ArrowLeft, Clock3, FileText, ShieldCheck, Star } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ReviewCard } from "@/components/app/review-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocalizedAgentBySlug, getLocalizedReviewsForAgent } from "@/lib/i18n/mock-data";
import { cn } from "@/lib/utils";

type AgentDetailViewProps = {
  locale: Locale;
  slug: string;
};

export function AgentDetailView({ locale, slug }: AgentDetailViewProps) {
  const t = getDictionary(locale);
  const agent = getLocalizedAgentBySlug(slug, locale);

  if (!agent) {
    return (
      <AppShell locale={locale}>
        <EmptyState
          icon={FileText}
          title={t.agentDetail.notFoundTitle}
          description={t.agentDetail.notFoundDescription}
          actionHref={localizedPath("/marketplace", locale)}
          actionLabel={t.common.backToMarketplace}
        />
      </AppShell>
    );
  }

  const reviews = getLocalizedReviewsForAgent(agent.slug, locale);
  const sensitivityLabel = t.statuses[agent.dataSensitivityLevel];

  return (
    <AppShell locale={locale}>
      <Link
        href={localizedPath("/marketplace", locale)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6f675d] hover:text-[#181716]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.common.backToMarketplace}
      </Link>

      <PageHeader
        eyebrow={agent.category}
        title={agent.name}
        description={agent.longDescription}
        action={
          <Link
            href={localizedPath("/dashboard", locale)}
            className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}
          >
            {t.common.rentThisAgent}
          </Link>
        }
      />

      <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="rounded-lg bg-white">
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="verified" locale={locale} />
                <StatusBadge
                  status={agent.dataSensitivityLevel}
                  label={t.agentDetail.dataSensitivity(sensitivityLabel)}
                  locale={locale}
                />
                <Badge className="capitalize" variant="outline">
                  {t.agentDetail.pricingLabel(t.pricing[agent.pricingType])}
                </Badge>
              </div>
              <CardTitle>{t.agentDetail.whatDoes}</CardTitle>
              <Checklist items={agent.does} />
            </CardHeader>
          </Card>

          <Card className="rounded-lg bg-white">
            <CardHeader>
              <CardTitle>{t.agentDetail.whatDoesNot}</CardTitle>
              <Checklist items={agent.doesNot} tone="muted" />
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-lg bg-white">
              <CardHeader>
                <CardTitle>{t.agentDetail.requiredInputs}</CardTitle>
                <Checklist items={agent.requiredInputs} />
              </CardHeader>
            </Card>
            <Card className="rounded-lg bg-white">
              <CardHeader>
                <CardTitle>{t.agentDetail.deliverables}</CardTitle>
                <Checklist items={agent.deliverables} />
              </CardHeader>
            </Card>
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="rounded-lg bg-white">
            <CardHeader>
              <CardTitle>{t.agentDetail.rentalSummary}</CardTitle>
              <div className="space-y-4 text-sm">
                <SummaryRow label={t.agentDetail.creator} value={agent.creatorName} />
                <SummaryRow label={t.agentDetail.price} value={agent.priceLabel} />
                <SummaryRow label={t.agentDetail.estimatedDuration} value={agent.estimatedDuration} />
                <div className="flex items-center justify-between gap-3 border-t border-[#eee7dc] pt-4">
                  <span className="flex items-center gap-2 text-[#6f675d]">
                    <Star className="size-4 fill-[#d79b2d] text-[#d79b2d]" />
                    {t.agentDetail.rating}
                  </span>
                  <span className="font-medium">
                    {agent.rating.toFixed(1)} ({agent.reviewCount})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[#6f675d]">
                    <Clock3 className="size-4" />
                    {t.agentDetail.delivery}
                  </span>
                  <span className="font-medium">{agent.estimatedDuration}</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="rounded-lg bg-[#181716] text-white">
            <CardHeader>
              <ShieldCheck className="size-8 text-[#9fd3be]" aria-hidden="true" />
              <CardTitle>{t.agentDetail.verifiedModel}</CardTitle>
              <p className="text-sm leading-6 text-[#d6d0c8]">
                {t.agentDetail.verifiedModelDescription}
              </p>
            </CardHeader>
          </Card>
        </aside>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t.agentDetail.reviews}</h2>
          <p className="text-sm text-[#6f675d]">{t.agentDetail.mockReviews(reviews.length)}</p>
        </div>
        {reviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Star}
            title={t.agentDetail.noReviewsTitle}
            description={t.agentDetail.noReviewsDescription}
          />
        )}
      </section>
    </AppShell>
  );
}

function Checklist({ items, tone = "default" }: { items: string[]; tone?: "default" | "muted" }) {
  return (
    <ul className="grid gap-3 text-sm text-[#6f675d]">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span
            className={cn(
              "mt-1 size-2 rounded-full",
              tone === "muted" ? "bg-[#c4b9aa]" : "bg-[#1e7a57]",
            )}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#6f675d]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

import { ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocalizedCreatorAgents } from "@/lib/i18n/mock-data";
import { cn } from "@/lib/utils";

type AdminViewProps = {
  locale: Locale;
};

export function AdminView({ locale }: AdminViewProps) {
  const t = getDictionary(locale);
  const reviewQueue = getLocalizedCreatorAgents(locale).filter((agent) =>
    ["submitted", "in_review", "approved", "rejected"].includes(agent.status),
  );

  return (
    <AppShell locale={locale}>
      <PageHeader
        eyebrow={t.adminPage.eyebrow}
        title={t.adminPage.title}
        description={t.adminPage.description}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg bg-white">
          <CardHeader>
            <p className="text-sm text-[#6f675d]">{t.adminPage.submitted}</p>
            <CardTitle className="text-3xl">
              {reviewQueue.filter((agent) => agent.status === "submitted").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg bg-white">
          <CardHeader>
            <p className="text-sm text-[#6f675d]">{t.adminPage.inReview}</p>
            <CardTitle className="text-3xl">
              {reviewQueue.filter((agent) => agent.status === "in_review").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg bg-[#181716] text-white">
          <CardHeader>
            <ShieldCheck className="size-7 text-[#9fd3be]" aria-hidden="true" />
            <CardTitle>{t.adminPage.manualTitle}</CardTitle>
            <p className="text-sm leading-6 text-[#d6d0c8]">{t.adminPage.manualDescription}</p>
          </CardHeader>
        </Card>
      </section>

      <Card className="rounded-lg bg-white">
        <CardHeader>
          <CardTitle>{t.adminPage.queue}</CardTitle>
          <div className="mt-4 divide-y divide-[#eee7dc]">
            {reviewQueue.map((agent) => (
              <div key={agent.id} className="grid gap-4 py-5 xl:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{agent.name}</h3>
                    <StatusBadge status={agent.status} locale={locale} />
                    <StatusBadge status={agent.dataSensitivityLevel} locale={locale} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6f675d]">{agent.shortDescription}</p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[#6f675d]">{t.adminPage.creator}</dt>
                      <dd className="font-medium">{agent.creatorName}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6f675d]">{t.adminPage.category}</dt>
                      <dd className="font-medium">{agent.category}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6f675d]">{t.adminPage.pricing}</dt>
                      <dd className="font-medium capitalize">{t.pricing[agent.pricingType]}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <button type="button" className={cn(buttonVariants({ size: "sm" }), "bg-[#1e5d47]")}>
                    {t.adminPage.approve}
                  </button>
                  <button type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-[#d7cec1] bg-white")}>
                    {t.adminPage.requestChanges}
                  </button>
                  <button type="button" className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}>
                    {t.adminPage.reject}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>
    </AppShell>
  );
}

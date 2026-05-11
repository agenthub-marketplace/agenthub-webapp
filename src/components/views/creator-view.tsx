import { Plus, WalletCards } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocalizedCreatorAgents } from "@/lib/i18n/mock-data";
import { cn } from "@/lib/utils";

type CreatorViewProps = {
  locale: Locale;
};

export function CreatorView({ locale }: CreatorViewProps) {
  const t = getDictionary(locale);
  const creatorAgents = getLocalizedCreatorAgents(locale);
  const stats = [
    { label: t.creatorPage.stats[0], value: "1" },
    { label: t.creatorPage.stats[1], value: "2" },
    { label: t.creatorPage.stats[2], value: "1" },
    { label: t.creatorPage.stats[3], value: "€0" },
  ];

  return (
    <AppShell locale={locale}>
      <PageHeader
        eyebrow={t.creatorPage.eyebrow}
        title={t.creatorPage.title}
        description={t.creatorPage.description}
        action={
          <button type="button" className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}>
            <Plus className="size-4" aria-hidden="true" />
            {t.creatorPage.submit}
          </button>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-lg bg-white">
            <CardHeader>
              <p className="text-sm text-[#6f675d]">{stat.label}</p>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-lg bg-white">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t.creatorPage.pipelineTitle}</CardTitle>
                <p className="mt-1 text-sm text-[#6f675d]">{t.creatorPage.pipelineDescription}</p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-[#eee7dc]">
              {creatorAgents.map((agent) => (
                <div key={agent.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto]">
                  <div>
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="mt-1 text-sm text-[#6f675d]">{agent.shortDescription}</p>
                  </div>
                  <div className="text-sm text-[#6f675d] md:text-right">{agent.category}</div>
                  <div className="md:text-right">
                    <StatusBadge status={agent.status} locale={locale} />
                  </div>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-lg bg-[#181716] text-white">
          <CardHeader>
            <WalletCards className="size-9 text-[#9fd3be]" aria-hidden="true" />
            <CardTitle>{t.creatorPage.stripeTitle}</CardTitle>
            <p className="text-sm leading-6 text-[#d6d0c8]">{t.creatorPage.stripeDescription}</p>
          </CardHeader>
        </Card>
      </section>
    </AppShell>
  );
}

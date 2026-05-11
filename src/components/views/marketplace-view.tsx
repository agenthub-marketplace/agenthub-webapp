import { SlidersHorizontal } from "lucide-react";

import { AgentCard } from "@/components/app/agent-card";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  getLocalizedAgentCategories,
  getLocalizedApprovedAgents,
  getLocalizedAgents,
} from "@/lib/i18n/mock-data";

type MarketplaceViewProps = {
  locale: Locale;
};

export function MarketplaceView({ locale }: MarketplaceViewProps) {
  const t = getDictionary(locale);
  const agents = getLocalizedApprovedAgents(locale);
  const categories = getLocalizedAgentCategories(locale);
  const totalAgents = getLocalizedAgents(locale).length;
  const pricingFilters = ["task", "duration", "project"] as const;

  return (
    <AppShell locale={locale}>
      <PageHeader
        eyebrow={t.marketplace.eyebrow}
        title={t.marketplace.title}
        description={t.marketplace.description}
      />

      <section className="mb-8 rounded-lg border border-[#e2dacd] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="agent-search">
              {t.marketplace.searchLabel}
            </label>
            <Input
              id="agent-search"
              placeholder={t.marketplace.searchPlaceholder}
              readOnly
            />
          </div>
          <div className="flex items-end">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-[#e2dacd] px-3 text-sm text-[#6f675d]">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {t.marketplace.staticFilters}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">{t.marketplace.categories}</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#181716] text-white">{t.marketplace.all}</Badge>
              {categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t.marketplace.pricing}</p>
            <div className="flex flex-wrap gap-2">
              {pricingFilters.map((pricing) => (
                <Badge key={pricing} className="capitalize" variant="outline">
                  {t.pricing[pricing]}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-[#6f675d]">
          {t.marketplace.showing(agents.length, totalAgents)}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} locale={locale} />
        ))}
      </section>
    </AppShell>
  );
}

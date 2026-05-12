import Link from "next/link";
import { Bot, Plus, WalletCards } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthProfile } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { getCreatorAgentsForUser } from "@/server/agents/creator-agents";

type CreatorViewProps = {
  locale: Locale;
  profile: AuthProfile;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const copy = {
  fr: {
    realAgentsTitle: "Agents soumis dans Supabase",
    realAgentsDescription:
      "Ces listings sont reels et attendent une validation admin avant publication marketplace.",
    submitted: "Agent soumis pour validation.",
    noAgentsTitle: "Aucun agent soumis",
    noAgentsDescription:
      "Soumettez votre premier agent pour lancer le processus de validation beta.",
    creatorProfileMissingTitle: "Profil createur manquant",
    creatorProfileMissingDescription:
      "Ce compte a acces a l'espace createur, mais aucun creator_profile n'est lie a votre utilisateur.",
    loadError: "Impossible de charger les agents createur pour le moment.",
    categoryFallback: "Sans categorie",
    pricing: "Prix",
    risk: "Risque",
  },
  en: {
    realAgentsTitle: "Agents submitted in Supabase",
    realAgentsDescription:
      "These listings are real and require admin validation before marketplace publication.",
    submitted: "Agent submitted for review.",
    noAgentsTitle: "No submitted agents",
    noAgentsDescription: "Submit your first agent to start the beta validation process.",
    creatorProfileMissingTitle: "Creator profile missing",
    creatorProfileMissingDescription:
      "This account can access the creator area, but no creator_profile is linked to your user.",
    loadError: "Could not load creator agents right now.",
    categoryFallback: "No category",
    pricing: "Pricing",
    risk: "Risk",
  },
} as const;

function getSearchValue(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function CreatorView({ locale, profile, searchParams }: CreatorViewProps) {
  const t = getDictionary(locale);
  const viewCopy = copy[locale];
  const params = searchParams ? await searchParams : undefined;
  const submitted = getSearchValue(params, "submitted");
  const creatorAgentsResult = await getCreatorAgentsForUser(profile.id);
  const creatorAgents = creatorAgentsResult.agents;
  const stats = [
    { label: t.creatorPage.stats[0], value: String(creatorAgents.filter((agent) => agent.status === "approved").length) },
    { label: t.creatorPage.stats[1], value: String(creatorAgents.filter((agent) => agent.status === "submitted").length) },
    { label: t.creatorPage.stats[2], value: String(creatorAgents.filter((agent) => agent.status === "in_review").length) },
    { label: t.creatorPage.stats[3], value: "€0" },
  ];

  return (
    <AppShell locale={locale}>
      <PageHeader
        eyebrow={t.creatorPage.eyebrow}
        title={t.creatorPage.title}
        description={t.creatorPage.description}
        action={
          <Link
            href={localizedPath("/creator/agents/new", locale)}
            className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t.creatorPage.submit}
          </Link>
        }
      />

      {submitted ? (
        <p className="mb-6 rounded-lg border border-[#b8dccd] bg-[#dceee6] p-3 text-sm text-[#1e5d47]">
          {viewCopy.submitted}
        </p>
      ) : null}

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
                <CardTitle>{viewCopy.realAgentsTitle}</CardTitle>
                <p className="mt-1 text-sm text-[#6f675d]">{viewCopy.realAgentsDescription}</p>
              </div>
            </div>
            {creatorAgentsResult.creatorProfileMissing ? (
              <div className="mt-4">
                <EmptyState
                  icon={Bot}
                  title={viewCopy.creatorProfileMissingTitle}
                  description={viewCopy.creatorProfileMissingDescription}
                />
              </div>
            ) : creatorAgentsResult.error ? (
              <p className="mt-4 rounded-lg border border-[#e9b7b7] bg-[#f8dede] p-3 text-sm text-[#8a2f2f]">
                {viewCopy.loadError}
              </p>
            ) : creatorAgents.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={Bot}
                  title={viewCopy.noAgentsTitle}
                  description={viewCopy.noAgentsDescription}
                  actionHref={localizedPath("/creator/agents/new", locale)}
                  actionLabel={t.creatorPage.submit}
                />
              </div>
            ) : (
              <div className="mt-4 divide-y divide-[#eee7dc]">
                {creatorAgents.map((agent) => (
                  <div key={agent.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto]">
                    <div>
                      <h3 className="font-medium">{agent.name}</h3>
                      <p className="mt-1 text-sm text-[#6f675d]">{agent.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6f675d]">
                        <span>{agent.categoryName ?? viewCopy.categoryFallback}</span>
                        <span>
                          {viewCopy.pricing}: {agent.pricingType}
                        </span>
                        <span>
                          {viewCopy.risk}: {agent.riskLevel}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-[#6f675d] md:text-right">
                      {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
                        dateStyle: "medium",
                      }).format(new Date(agent.createdAt))}
                    </div>
                    <div className="md:text-right">
                      <StatusBadge status={agent.status} locale={locale} />
                    </div>
                  </div>
                ))}
              </div>
            )}
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

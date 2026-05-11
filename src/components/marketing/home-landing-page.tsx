import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSearch,
  Layers3,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedPath, switchLocalePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const stepIcons = [Search, Clock3, ClipboardCheck];
const featureIcons = [
  BadgeCheck,
  Layers3,
  Star,
  MessageSquareText,
  WalletCards,
  ShieldCheck,
];

const previewAgents = {
  fr: [
    ["Rédacteur proposition", "Contenu", "Tâche", "4.9"],
    ["Qualificateur leads", "Ventes", "Durée", "4.8"],
    ["Assistant recherche", "Recherche", "Projet", "4.9"],
  ],
  en: [
    ["Proposal Writer", "Content", "Task", "4.9"],
    ["Lead Qualifier", "Sales", "Duration", "4.8"],
    ["Research Assistant", "Research", "Project", "4.9"],
  ],
} satisfies Record<Locale, string[][]>;

type HomeLandingPageProps = {
  locale?: Locale;
};

export function HomeLandingPage({ locale = "fr" }: HomeLandingPageProps) {
  const t = getDictionary(locale);

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#181716]">
      <header className="sticky top-0 z-30 border-b border-[#e6e0d6] bg-[#faf9f6]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href={localizedPath("/", locale)} className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#181716] text-white">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            AgentHub
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-[#68615a] md:flex">
            {[
              ["#how-it-works", t.nav.howItWorks],
              ["#features", t.nav.features],
              ["#use-cases", t.nav.useCases],
              ["#trust", t.nav.trust],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="transition-colors hover:text-[#181716]">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-lg border border-[#d7cec1] bg-white p-1 sm:flex">
              <Link
                href={switchLocalePath("/", "fr")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium",
                  locale === "fr" ? "bg-[#181716] text-white" : "text-[#68615a]",
                )}
              >
                FR
              </Link>
              <Link
                href={switchLocalePath("/", "en")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium",
                  locale === "en" ? "bg-[#181716] text-white" : "text-[#68615a]",
                )}
              >
                EN
              </Link>
            </div>
            <Link
              href={localizedPath("/auth/login", locale)}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
            >
              {t.common.login}
            </Link>
            <Link
              href={localizedPath("/marketplace", locale)}
              className={cn(buttonVariants({ size: "sm" }), "bg-[#181716]")}
            >
              {t.common.marketplace}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#e6e0d6]">
        <div className="absolute inset-x-0 top-0 h-40 bg-[#e9f3ee]" />
        <div className="relative mx-auto grid min-h-[calc(88svh-4rem)] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              {t.landing.badges.map((badge, index) => (
                <Badge
                  key={badge}
                  className={cn(
                    index === 0 && "bg-[#dceee6] text-[#1e5d47]",
                    index === 1 && "bg-[#f3e7c3] text-[#76541a]",
                    index === 2 && "bg-[#dfe8f6] text-[#244a7c]",
                  )}
                  variant="secondary"
                >
                  {badge}
                </Badge>
              ))}
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-[#151412] md:text-6xl">
                {t.landing.headline}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#5f5a52]">
                {t.landing.subheadline}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={localizedPath("/marketplace", locale)}
                className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716] px-4 text-white")}
              >
                {t.common.browseMarketplace}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={localizedPath("/creator", locale)}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 border-[#d4cbbd] bg-white px-4")}
              >
                {t.creatorPage.submit}
              </Link>
            </div>

            <dl className="grid max-w-xl grid-cols-3 gap-4 border-t border-[#e6e0d6] pt-6">
              {t.landing.stats.map(([value, label]) => (
                <div key={value}>
                  <dt className="text-sm font-semibold text-[#181716]">{value}</dt>
                  <dd className="mt-1 text-sm text-[#6f675d]">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroPreview locale={locale} />
        </div>
      </section>

      <Section
        id="how-it-works"
        eyebrow={t.nav.howItWorks}
        title={t.landing.howTitle}
        description={t.landing.howDescription}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {t.landing.howSteps.map((step, index) => {
            const Icon = stepIcons[index];

            return (
              <Card key={step.title} className="rounded-lg bg-white">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef3ef] text-[#1e5d47]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-[#948a7d]">0{index + 1}</span>
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section
        id="features"
        eyebrow={t.nav.features}
        title={t.landing.featuresTitle}
        description={t.landing.featuresDescription}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.landing.features.map(([title, description], index) => {
            const Icon = featureIcons[index];

            return (
              <Card key={title} className="rounded-lg bg-white">
                <CardHeader>
                  <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[#f1ede6] text-[#52483d]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section
        id="use-cases"
        eyebrow={t.nav.useCases}
        title={t.landing.useCasesTitle}
        description={t.landing.useCasesDescription}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {t.landing.useCases.map((category) => (
            <div key={category} className="rounded-lg border border-[#e2dacd] bg-white p-4 shadow-sm">
              <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-[#e8eef7] text-[#244a7c]">
                <FileSearch className="size-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold">{category}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6f675d]">
                {locale === "fr"
                  ? "Trouve un agent revu avec un périmètre précis et un résultat mesurable."
                  : "Find a reviewed agent with a specific scope and measurable output."}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Marketplace"
        title={t.landing.valueTitle}
        description={t.landing.valueDescription}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <ValuePanel
            title={t.landing.forUsers.title}
            description={t.landing.forUsers.description}
            items={t.landing.forUsers.points}
            icon={Users}
          />
          <ValuePanel
            title={t.landing.forCreators.title}
            description={t.landing.forCreators.description}
            items={t.landing.forCreators.points}
            icon={Zap}
          />
        </div>
      </Section>

      <Section
        id="trust"
        eyebrow={t.nav.trust}
        title={t.landing.trustTitle}
        description={t.landing.trustDescription}
      >
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-[#d8d0c4] bg-[#181716] p-6 text-white">
            <ShieldCheck className="size-9 text-[#9fd3be]" aria-hidden="true" />
            <h3 className="mt-6 text-2xl font-semibold">{t.landing.trustCardTitle}</h3>
            <p className="mt-4 leading-7 text-[#d6d0c8]">{t.landing.trustCardDescription}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.landing.trustItems.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-[#e2dacd] bg-white p-4">
                <CheckCircle2 className="mt-0.5 size-5 text-[#1e7a57]" aria-hidden="true" />
                <div>
                  <h3 className="font-medium">{item}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#6f675d]">
                    {locale === "fr"
                      ? "Des règles marketplace claires aident à choisir en confiance."
                      : "Clear marketplace rules help users choose with confidence."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl rounded-lg border border-[#d8d0c4] bg-white p-8 text-center shadow-sm md:p-12">
          <Badge className="bg-[#dceee6] text-[#1e5d47]" variant="secondary">
            {t.landing.finalBadge}
          </Badge>
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            {t.landing.finalTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#6f675d]">
            {t.landing.finalDescription}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={localizedPath("/marketplace", locale)}
              className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716] px-4 text-white")}
            >
              {t.common.browseMarketplace}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={localizedPath("/creator", locale)}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 border-[#d4cbbd] bg-white px-4")}
            >
              {t.creatorPage.submit}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e6e0d6] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#6f675d] sm:flex-row sm:items-center sm:justify-between">
          <p>{t.landing.footer}</p>
          <div className="flex gap-4">
            <Link href={localizedPath("/marketplace", locale)} className="hover:text-[#181716]">
              {t.common.marketplace}
            </Link>
            <Link href={localizedPath("/creator", locale)} className="hover:text-[#181716]">
              {t.common.creator}
            </Link>
            <Link href={localizedPath("/auth/signup", locale)} className="hover:text-[#181716]">
              {t.common.signup}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroPreview({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <div className="relative">
      <div className="rounded-lg border border-[#d8d0c4] bg-white p-4 shadow-2xl shadow-[#3b3327]/10">
        <div className="flex items-center justify-between border-b border-[#eee7dc] pb-4">
          <div>
            <p className="text-sm font-medium">{t.landing.heroPreviewTitle}</p>
            <p className="mt-1 text-xs text-[#777064]">{t.landing.heroPreviewSubtitle}</p>
          </div>
          <Badge className="bg-[#dceee6] text-[#1e5d47]" variant="secondary">
            {t.statuses.verified}
          </Badge>
        </div>

        <div className="mt-4 space-y-3">
          {previewAgents[locale].map(([name, category, price, rating]) => (
            <div key={name} className="grid gap-3 rounded-lg border border-[#eee7dc] bg-[#fdfcf9] p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{name}</h3>
                  <Badge variant="outline">{t.statuses.verified}</Badge>
                </div>
                <p className="mt-2 text-sm text-[#6f675d]">
                  {category} · {price}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Star className="size-4 fill-[#d79b2d] text-[#d79b2d]" />
                {rating}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            [locale === "fr" ? "Revue" : "Review", locale === "fr" ? "Qualité vérifiée" : "Quality checked"],
            [locale === "fr" ? "Périmètre" : "Scope", locale === "fr" ? "Livrables définis" : "Deliverables set"],
            [locale === "fr" ? "Run" : "Run", locale === "fr" ? "Gateway prévu" : "Gateway planned"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#eee7dc] bg-[#faf9f6] p-3">
              <p className="text-xs text-[#777064]">{label}</p>
              <p className="mt-1 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-6 -left-6 hidden rounded-lg border border-[#d8d0c4] bg-[#fff8e6] p-4 shadow-lg lg:block">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#f3e0a8] text-[#76541a]">
            <BarChart3 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium">{locale === "fr" ? "Résultats clairs" : "Clear outcomes"}</p>
            <p className="text-xs text-[#6f675d]">
              {locale === "fr" ? "Tâches, durées, projets" : "Tasks, durations, projects"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type SectionProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function Section({ id, eyebrow, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 px-6 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <Badge className="bg-white text-[#5f5a52]" variant="outline">
            {eyebrow}
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#6f675d]">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

type ValuePanelProps = {
  title: string;
  description: string;
  items: readonly string[];
  icon: React.ElementType;
};

function ValuePanel({ title, description, items, icon: Icon }: ValuePanelProps) {
  return (
    <div className="rounded-lg border border-[#e2dacd] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef3ef] text-[#1e5d47]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="mt-4 leading-7 text-[#6f675d]">{description}</p>
      <ul className="mt-6 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="size-5 text-[#1e7a57]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

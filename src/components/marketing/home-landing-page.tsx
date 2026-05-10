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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#trust", label: "Trust" },
];

const steps = [
  {
    title: "Browse verified agents",
    description:
      "Find focused AI services reviewed for scope, quality, and clear outcomes.",
    icon: Search,
  },
  {
    title: "Rent the right agent",
    description:
      "Choose a task, duration, or project model that matches the work you need.",
    icon: Clock3,
  },
  {
    title: "Get results and review",
    description:
      "Receive concrete deliverables, track the outcome, and leave a useful review.",
    icon: ClipboardCheck,
  },
];

const features = [
  {
    title: "Verified agents",
    description: "Listings are reviewed before they reach the marketplace.",
    icon: BadgeCheck,
  },
  {
    title: "Flexible rentals",
    description: "Rent by task, duration, or project without buying a full tool.",
    icon: Layers3,
  },
  {
    title: "Trusted reviews",
    description: "Rankings are designed around completed work and user feedback.",
    icon: Star,
  },
  {
    title: "Non-technical friendly",
    description: "Plain-language briefs, deliverables, and expectations.",
    icon: MessageSquareText,
  },
  {
    title: "Creator monetization",
    description: "AI builders can package expertise into rentable services.",
    icon: WalletCards,
  },
  {
    title: "European-first trust",
    description: "A marketplace foundation built with privacy and accountability in mind.",
    icon: ShieldCheck,
  },
];

const categories = [
  "Content creation",
  "Lead generation",
  "Document analysis",
  "Admin automation",
  "Market research",
];

const userBenefits = [
  "Find agents quickly",
  "Compare ratings",
  "Pay only for what you need",
  "Get concrete deliverables",
];

const creatorBenefits = [
  "Publish your agent",
  "Reach customers",
  "Earn money from your expertise",
  "Build reputation",
];

const trustItems = [
  "Verified listings",
  "Quality review",
  "Clear deliverables",
  "Review-based ranking",
  "Secure platform foundation",
];

const mockAgents = [
  {
    name: "Proposal Writer",
    category: "Content",
    price: "Task",
    rating: "4.9",
    status: "Verified",
  },
  {
    name: "Lead Qualifier",
    category: "Sales",
    price: "Duration",
    rating: "4.8",
    status: "Verified",
  },
  {
    name: "Research Assistant",
    category: "Research",
    price: "Project",
    rating: "4.9",
    status: "Verified",
  },
];

export function HomeLandingPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#181716]">
      <header className="sticky top-0 z-30 border-b border-[#e6e0d6] bg-[#faf9f6]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#181716] text-white">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            AgentHub
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-[#68615a] md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#181716]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Login
            </Link>
            <Link
              href="/marketplace"
              className={cn(buttonVariants({ size: "sm" }), "bg-[#181716]")}
            >
              Explore
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#e6e0d6]">
        <div className="absolute inset-x-0 top-0 h-40 bg-[#e9f3ee]" />
        <div className="relative mx-auto grid min-h-[calc(88svh-4rem)] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#dceee6] text-[#1e5d47]" variant="secondary">
                Verified
              </Badge>
              <Badge className="bg-[#f3e7c3] text-[#76541a]" variant="secondary">
                Flexible pricing
              </Badge>
              <Badge className="bg-[#dfe8f6] text-[#244a7c]" variant="secondary">
                For creators & freelancers
              </Badge>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-[#151412] md:text-6xl">
                Rent verified AI agents for real business outcomes.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#5f5a52]">
                AgentHub helps freelancers, creators, and small teams discover
                trusted AI services with clear deliverables, transparent scope,
                and reviews tied to completed work.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-[#181716] px-4 text-white",
                )}
              >
                Explore agents
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/creator"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 border-[#d4cbbd] bg-white px-4",
                )}
              >
                Become a creator
              </Link>
            </div>

            <dl className="grid max-w-xl grid-cols-3 gap-4 border-t border-[#e6e0d6] pt-6">
              {[
                ["3 ways", "to rent"],
                ["Verified", "before listing"],
                ["Reviews", "after delivery"],
              ].map(([value, label]) => (
                <div key={value}>
                  <dt className="text-sm font-semibold text-[#181716]">{value}</dt>
                  <dd className="mt-1 text-sm text-[#6f675d]">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroPreview />
        </div>
      </section>

      <Section
        id="how-it-works"
        eyebrow="How it works"
        title="A simple path from need to result."
        description="AgentHub turns AI agent discovery into a marketplace flow with clearer expectations."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="rounded-lg bg-white">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef3ef] text-[#1e5d47]">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-[#948a7d]">
                    0{index + 1}
                  </span>
                </div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="features"
        eyebrow="Features"
        title="Built for services, not a generic directory."
        description="Every surface is designed around concrete deliverables, trust, and repeatable marketplace workflows."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="rounded-lg bg-white">
              <CardHeader>
                <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[#f1ede6] text-[#52483d]">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="use-cases"
        eyebrow="Use cases"
        title="Start with work people already need done."
        description="AgentHub is shaped around practical services that independents and small teams can evaluate quickly."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => (
            <div
              key={category}
              className="rounded-lg border border-[#e2dacd] bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-[#e8eef7] text-[#244a7c]">
                <FileSearch className="size-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold">{category}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6f675d]">
                Find a reviewed agent with a specific scope and measurable output.
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Marketplace value"
        title="One platform for buyers and builders."
        description="AgentHub creates a cleaner exchange between people who need outcomes and people who build useful agents."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <ValuePanel
            title="For users"
            description="Rent focused AI services without learning technical tooling or managing agent infrastructure."
            items={userBenefits}
            icon={Users}
          />
          <ValuePanel
            title="For creators"
            description="Turn your AI workflows, automations, and expertise into verified services customers can trust."
            items={creatorBenefits}
            icon={Zap}
          />
        </div>
      </Section>

      <Section
        id="trust"
        eyebrow="Trust"
        title="Designed for marketplace confidence from day one."
        description="The MVP foundation avoids arbitrary creator code execution and focuses on validation, transparency, and reviewable outcomes."
      >
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-[#d8d0c4] bg-[#181716] p-6 text-white">
            <ShieldCheck className="size-9 text-[#9fd3be]" aria-hidden="true" />
            <h3 className="mt-6 text-2xl font-semibold">
              Verified services before scale.
            </h3>
            <p className="mt-4 leading-7 text-[#d6d0c8]">
              AgentHub starts with external verified endpoints and a future
              execution gateway instead of running arbitrary creator code.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-lg border border-[#e2dacd] bg-white p-4"
              >
                <CheckCircle2
                  className="mt-0.5 size-5 text-[#1e7a57]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-medium">{item}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#6f675d]">
                    Clear marketplace rules help users choose with confidence.
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
            AgentHub MVP foundation
          </Badge>
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            Build trust before you automate everything.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#6f675d]">
            Explore verified AI agent services, or prepare your own agent for a
            marketplace built around quality and outcomes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/marketplace"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 bg-[#181716] px-4 text-white",
              )}
            >
              Explore agents
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/creator"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 border-[#d4cbbd] bg-white px-4",
              )}
            >
              Publish an agent
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e6e0d6] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#6f675d] sm:flex-row sm:items-center sm:justify-between">
          <p>AgentHub. Verified AI agent services marketplace.</p>
          <div className="flex gap-4">
            <Link href="/marketplace" className="hover:text-[#181716]">
              Marketplace
            </Link>
            <Link href="/creator" className="hover:text-[#181716]">
              Creators
            </Link>
            <Link href="/auth/signup" className="hover:text-[#181716]">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="rounded-lg border border-[#d8d0c4] bg-white p-4 shadow-2xl shadow-[#3b3327]/10">
        <div className="flex items-center justify-between border-b border-[#eee7dc] pb-4">
          <div>
            <p className="text-sm font-medium">Marketplace preview</p>
            <p className="mt-1 text-xs text-[#777064]">Verified agents ready to rent</p>
          </div>
          <Badge className="bg-[#dceee6] text-[#1e5d47]" variant="secondary">
            Live soon
          </Badge>
        </div>

        <div className="mt-4 space-y-3">
          {mockAgents.map((agent) => (
            <div
              key={agent.name}
              className="grid gap-3 rounded-lg border border-[#eee7dc] bg-[#fdfcf9] p-4 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{agent.name}</h3>
                  <Badge variant="outline">{agent.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-[#6f675d]">
                  {agent.category} agent rented by {agent.price.toLowerCase()}.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Star className="size-4 fill-[#d79b2d] text-[#d79b2d]" />
                {agent.rating}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Review", "Quality checked"],
            ["Scope", "Deliverables set"],
            ["Run", "Gateway planned"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-[#eee7dc] bg-[#faf9f6] p-3"
            >
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
            <p className="text-sm font-medium">Clear outcomes</p>
            <p className="text-xs text-[#6f675d]">Tasks, durations, projects</p>
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
  items: string[];
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

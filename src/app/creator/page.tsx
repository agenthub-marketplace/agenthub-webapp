import { Plus, WalletCards } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { creatorAgentDrafts } from "@/lib/mock-data/agents";
import { cn } from "@/lib/utils";

const creatorStats = [
  { label: "Published agents", value: "1" },
  { label: "In validation", value: "2" },
  { label: "Drafts", value: "1" },
  { label: "Mock revenue", value: "€0" },
];

export default function CreatorPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Creator dashboard"
        title="Package your AI expertise into verified services."
        description="Manage agent drafts, track review status, and prepare for future marketplace monetization."
        action={
          <button
            type="button"
            className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}
          >
            <Plus className="size-4" aria-hidden="true" />
            Submit new agent
          </button>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {creatorStats.map((stat) => (
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
                <CardTitle>Your agent pipeline</CardTitle>
                <p className="mt-1 text-sm text-[#6f675d]">
                  Static mock statuses for the future creator submission workflow.
                </p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-[#eee7dc]">
              {creatorAgentDrafts.map((agent) => (
                <div
                  key={agent.id}
                  className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="mt-1 text-sm text-[#6f675d]">
                      {agent.shortDescription}
                    </p>
                  </div>
                  <div className="text-sm text-[#6f675d] md:text-right">
                    {agent.category}
                  </div>
                  <div className="md:text-right">
                    <StatusBadge status={agent.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-lg bg-[#181716] text-white">
          <CardHeader>
            <WalletCards className="size-9 text-[#9fd3be]" aria-hidden="true" />
            <CardTitle>Stripe Connect planned</CardTitle>
            <p className="text-sm leading-6 text-[#d6d0c8]">
              Creator payouts and marketplace fees will be added later through
              Stripe Connect. This screen is only a static product preview.
            </p>
          </CardHeader>
        </Card>
      </section>
    </AppShell>
  );
}

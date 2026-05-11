import { ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { creatorAgentDrafts } from "@/lib/mock-data/agents";
import { cn } from "@/lib/utils";

const reviewQueue = creatorAgentDrafts.filter((agent) =>
  ["submitted", "in_review", "approved", "rejected"].includes(agent.status),
);

export default function AdminPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Review submitted agents before they enter the marketplace."
        description="A static review queue for validating quality, safety, deliverables, and trust signals."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg bg-white">
          <CardHeader>
            <p className="text-sm text-[#6f675d]">Submitted</p>
            <CardTitle className="text-3xl">
              {reviewQueue.filter((agent) => agent.status === "submitted").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg bg-white">
          <CardHeader>
            <p className="text-sm text-[#6f675d]">In review</p>
            <CardTitle className="text-3xl">
              {reviewQueue.filter((agent) => agent.status === "in_review").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg bg-[#181716] text-white">
          <CardHeader>
            <ShieldCheck className="size-7 text-[#9fd3be]" aria-hidden="true" />
            <CardTitle>Validation is manual in MVP</CardTitle>
            <p className="text-sm leading-6 text-[#d6d0c8]">
              Buttons are visual only. No persistent admin actions are wired yet.
            </p>
          </CardHeader>
        </Card>
      </section>

      <Card className="rounded-lg bg-white">
        <CardHeader>
          <CardTitle>Agent review queue</CardTitle>
          <div className="mt-4 divide-y divide-[#eee7dc]">
            {reviewQueue.map((agent) => (
              <div key={agent.id} className="grid gap-4 py-5 xl:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{agent.name}</h3>
                    <StatusBadge status={agent.status} />
                    <StatusBadge
                      status={agent.dataSensitivityLevel}
                      label={`${agent.dataSensitivityLevel} data`}
                    />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6f675d]">
                    {agent.shortDescription}
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[#6f675d]">Creator</dt>
                      <dd className="font-medium">{agent.creatorName}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6f675d]">Category</dt>
                      <dd className="font-medium">{agent.category}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6f675d]">Pricing</dt>
                      <dd className="font-medium capitalize">{agent.pricingType}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "bg-[#1e5d47]",
                    )}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "border-[#d7cec1] bg-white",
                    )}
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
                  >
                    Reject
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

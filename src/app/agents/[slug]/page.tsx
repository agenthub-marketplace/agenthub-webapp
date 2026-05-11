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
import { getAgentBySlug, mockAgents } from "@/lib/mock-data/agents";
import { getReviewsForAgent } from "@/lib/mock-data/reviews";
import { cn } from "@/lib/utils";

type AgentDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return mockAgents.map((agent) => ({
    slug: agent.slug,
  }));
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { slug } = await params;
  const agent = getAgentBySlug(slug);

  if (!agent) {
    return (
      <AppShell>
        <EmptyState
          icon={FileText}
          title="Agent not found"
          description="This agent slug does not match a verified mock listing yet."
          actionHref="/marketplace"
          actionLabel="Back to marketplace"
        />
      </AppShell>
    );
  }

  const reviews = getReviewsForAgent(agent.slug);

  return (
    <AppShell>
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6f675d] hover:text-[#181716]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to marketplace
      </Link>

      <PageHeader
        eyebrow={agent.category}
        title={agent.name}
        description={agent.longDescription}
        action={
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}
          >
            Rent this agent
          </Link>
        }
      />

      <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="rounded-lg bg-white">
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="verified" label="Verified" />
                <StatusBadge
                  status={agent.dataSensitivityLevel}
                  label={`${agent.dataSensitivityLevel} data sensitivity`}
                />
                <Badge className="capitalize" variant="outline">
                  {agent.pricingType} pricing
                </Badge>
              </div>
              <CardTitle>What this agent does</CardTitle>
              <Checklist items={agent.does} />
            </CardHeader>
          </Card>

          <Card className="rounded-lg bg-white">
            <CardHeader>
              <CardTitle>What this agent does not do</CardTitle>
              <Checklist items={agent.doesNot} tone="muted" />
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-lg bg-white">
              <CardHeader>
                <CardTitle>Required inputs</CardTitle>
                <Checklist items={agent.requiredInputs} />
              </CardHeader>
            </Card>
            <Card className="rounded-lg bg-white">
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
                <Checklist items={agent.deliverables} />
              </CardHeader>
            </Card>
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="rounded-lg bg-white">
            <CardHeader>
              <CardTitle>Rental summary</CardTitle>
              <div className="space-y-4 text-sm">
                <SummaryRow label="Creator" value={agent.creatorName} />
                <SummaryRow label="Price" value={agent.priceLabel} />
                <SummaryRow label="Estimated duration" value={agent.estimatedDuration} />
                <div className="flex items-center justify-between gap-3 border-t border-[#eee7dc] pt-4">
                  <span className="flex items-center gap-2 text-[#6f675d]">
                    <Star className="size-4 fill-[#d79b2d] text-[#d79b2d]" />
                    Rating
                  </span>
                  <span className="font-medium">
                    {agent.rating.toFixed(1)} ({agent.reviewCount})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[#6f675d]">
                    <Clock3 className="size-4" />
                    Delivery
                  </span>
                  <span className="font-medium">{agent.estimatedDuration}</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="rounded-lg bg-[#181716] text-white">
            <CardHeader>
              <ShieldCheck className="size-8 text-[#9fd3be]" aria-hidden="true" />
              <CardTitle>Verified endpoint model</CardTitle>
              <p className="text-sm leading-6 text-[#d6d0c8]">
                This static MVP represents the future gateway model. No creator code
                runs in this app.
              </p>
            </CardHeader>
          </Card>
        </aside>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reviews</h2>
          <p className="text-sm text-[#6f675d]">{reviews.length} mock reviews</p>
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
            title="No reviews yet"
            description="This mock agent is ready for its first completed rental review."
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

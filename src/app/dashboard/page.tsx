import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Star } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrdersByStatus, mockOrders } from "@/lib/mock-data/orders";
import { cn } from "@/lib/utils";

const activeOrders = getOrdersByStatus(["paid", "in_progress"]);
const completedOrders = getOrdersByStatus(["completed"]);
const pendingReviews = mockOrders.filter((order) => order.statusLabel === "Pending review");

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="User dashboard"
        title="Track rented agents and review completed work."
        description="A static view of active rentals, completed deliverables, and reviews waiting for feedback."
        action={
          <Link
            href="/marketplace"
            className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}
          >
            Browse marketplace
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Clock3} label="Active rentals" value={activeOrders.length} />
        <SummaryCard
          icon={CheckCircle2}
          label="Completed rentals"
          value={completedOrders.length}
        />
        <SummaryCard icon={Star} label="Pending reviews" value={pendingReviews.length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <OrderPanel title="Active rentals" orders={activeOrders} />
        <OrderPanel title="Completed rentals" orders={completedOrders} />
      </section>

      <section className="mt-6">
        <Card className="rounded-lg bg-white">
          <CardHeader>
            <CardTitle>Pending reviews</CardTitle>
            {pendingReviews.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {pendingReviews.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 rounded-lg border border-[#eee7dc] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h3 className="font-medium">{order.agentName}</h3>
                      <p className="mt-1 text-sm text-[#6f675d]">
                        Your deliverable is complete. Leave feedback to improve rankings.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "border-[#d7cec1] bg-white",
                      )}
                    >
                      Leave review
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="No pending reviews"
                description="Completed rentals that need feedback will appear here."
              />
            )}
          </CardHeader>
        </Card>
      </section>
    </AppShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
}) {
  return (
    <Card className="rounded-lg bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#6f675d]">{label}</p>
          <Icon className="size-5 text-[#6f675d]" aria-hidden="true" />
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function OrderPanel({
  title,
  orders,
}: {
  title: string;
  orders: typeof mockOrders;
}) {
  return (
    <Card className="rounded-lg bg-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="mt-4 grid gap-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-[#eee7dc] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={`/agents/${order.agentSlug}`}
                  className="font-medium hover:underline"
                >
                  {order.agentName}
                </Link>
                <StatusBadge status={order.status} label={order.statusLabel} />
              </div>
              <p className="mt-2 text-sm leading-6 text-[#6f675d]">
                {order.taskBrief}
              </p>
              <p className="mt-3 text-sm font-medium">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: order.currency.toUpperCase(),
                }).format(order.amountCents / 100)}
              </p>
            </div>
          ))}
        </div>
      </CardHeader>
    </Card>
  );
}

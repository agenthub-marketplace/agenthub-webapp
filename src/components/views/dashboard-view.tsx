import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Star } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocalizedOrders } from "@/lib/i18n/mock-data";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";

type DashboardViewProps = {
  locale: Locale;
};

export function DashboardView({ locale }: DashboardViewProps) {
  const t = getDictionary(locale);
  const orders = getLocalizedOrders(locale);
  const getOrdersByStatus = (statuses: OrderStatus[]) =>
    orders.filter((order) => statuses.includes(order.status));
  const activeOrders = getOrdersByStatus(["paid", "in_progress"]);
  const completedOrders = getOrdersByStatus(["completed"]);
  const pendingReviews = orders.filter((order) =>
    locale === "fr" ? order.statusLabel === "Avis en attente" : order.statusLabel === "Pending review",
  );

  return (
    <AppShell locale={locale}>
      <PageHeader
        eyebrow={t.dashboardPage.eyebrow}
        title={t.dashboardPage.title}
        description={t.dashboardPage.description}
        action={
          <Link href={localizedPath("/marketplace", locale)} className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}>
            {t.common.browseMarketplace}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Clock3} label={t.dashboardPage.active} value={activeOrders.length} />
        <SummaryCard icon={CheckCircle2} label={t.dashboardPage.completed} value={completedOrders.length} />
        <SummaryCard icon={Star} label={t.dashboardPage.pendingReviews} value={pendingReviews.length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <OrderPanel locale={locale} title={t.dashboardPage.active} orders={activeOrders} />
        <OrderPanel locale={locale} title={t.dashboardPage.completed} orders={completedOrders} />
      </section>

      <section className="mt-6">
        <Card className="rounded-lg bg-white">
          <CardHeader>
            <CardTitle>{t.dashboardPage.pendingReviews}</CardTitle>
            {pendingReviews.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {pendingReviews.map((order) => (
                  <div key={order.id} className="flex flex-col gap-3 rounded-lg border border-[#eee7dc] p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-medium">{order.agentName}</h3>
                      <p className="mt-1 text-sm text-[#6f675d]">{t.dashboardPage.pendingReviewText}</p>
                    </div>
                    <button type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-[#d7cec1] bg-white")}>
                      {t.dashboardPage.leaveReview}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Star} title={t.dashboardPage.noPendingTitle} description={t.dashboardPage.noPendingDescription} />
            )}
          </CardHeader>
        </Card>
      </section>
    </AppShell>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: number }) {
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

function OrderPanel({ locale, title, orders }: { locale: Locale; title: string; orders: ReturnType<typeof getLocalizedOrders> }) {
  return (
    <Card className="rounded-lg bg-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="mt-4 grid gap-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-[#eee7dc] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={localizedPath(`/agents/${order.agentSlug}`, locale)} className="font-medium hover:underline">
                  {order.agentName}
                </Link>
                <StatusBadge status={order.status} label={order.statusLabel} locale={locale} />
              </div>
              <p className="mt-2 text-sm leading-6 text-[#6f675d]">{order.taskBrief}</p>
              <p className="mt-3 text-sm font-medium">
                {new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
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

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function DashboardPage() {
  return (
    <PlaceholderPage
      eyebrow="User dashboard"
      title="Track rented agents and project outcomes."
      description="This dashboard will show user orders, agent run status, deliverables, reviews, disputes, and support actions."
      notes={[
        "Orders grouped by status",
        "Run history and deliverable links",
        "Review and dispute entry points",
        "No payment implementation in the foundation",
      ]}
    />
  );
}

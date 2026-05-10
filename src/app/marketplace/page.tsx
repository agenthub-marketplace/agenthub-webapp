import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function MarketplacePage() {
  return (
    <PlaceholderPage
      eyebrow="Marketplace"
      title="Browse verified AI agents by concrete deliverable."
      description="This page will become the searchable marketplace for approved agents, categories, pricing models, and trust metadata."
      notes={[
        "Approved agent listings only",
        "Filters for task, duration, and project pricing",
        "Creator profile and verification signals",
        "Future order entry without direct code execution",
      ]}
    />
  );
}

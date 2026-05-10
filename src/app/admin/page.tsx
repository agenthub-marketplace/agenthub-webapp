import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AdminPage() {
  return (
    <PlaceholderPage
      eyebrow="Admin"
      title="Validate agents, safety, quality, and marketplace trust."
      description="This internal page will support agent review, creator checks, moderation, disputes, and audit visibility."
      notes={[
        "Agent approval and rejection workflow",
        "Safety and endpoint verification checks",
        "Audit log visibility",
        "Refund and dispute review planning",
      ]}
    />
  );
}

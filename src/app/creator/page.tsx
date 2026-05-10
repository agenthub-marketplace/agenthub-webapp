import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function CreatorPage() {
  return (
    <PlaceholderPage
      eyebrow="Creator dashboard"
      title="Publish and manage verified agent services."
      description="This dashboard will let creators draft agents, submit them for review, track validation status, and manage service details."
      notes={[
        "Agent draft and submission workflow",
        "Endpoint and documentation requirements",
        "Quality review feedback",
        "Future Stripe Connect onboarding",
      ]}
    />
  );
}

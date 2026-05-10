import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function HomePage() {
  return (
    <PlaceholderPage
      eyebrow="AgentHub"
      title="Trusted marketplace for verified AI agent services."
      description="This home page will introduce AgentHub, route users to verified agents, and explain how deliverables, trust, and creator validation work."
      notes={[
        "Marketplace positioning and trust signals",
        "Clear paths for users, creators, and admins",
        "No payment or execution flows in the foundation",
        "Ready for MVP product discovery and auth work",
      ]}
    />
  );
}

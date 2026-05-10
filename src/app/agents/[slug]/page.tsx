import { PlaceholderPage } from "@/components/layout/placeholder-page";

type AgentDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { slug } = await params;

  return (
    <PlaceholderPage
      eyebrow="Agent detail"
      title={`Agent detail page: ${slug}`}
      description="This page will show a verified agent's scope, deliverables, pricing, creator, reviews, and execution requirements."
      notes={[
        "Agent version and validation status",
        "Deliverables and expected turnaround",
        "Future rental and order creation entry point",
        "No arbitrary creator code execution in MVP",
      ]}
    />
  );
}

import { AgentDetailView } from "@/components/views/agent-detail-view";
import { mockAgents } from "@/lib/mock-data/agents";

type EnglishAgentDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return mockAgents.map((agent) => ({
    slug: agent.slug,
  }));
}

export default async function EnglishAgentDetailPage({ params }: EnglishAgentDetailPageProps) {
  const { slug } = await params;
  return <AgentDetailView locale="en" slug={slug} />;
}

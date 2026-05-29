import { redirect } from 'next/navigation';

export default async function AgentHubAgentRentRedirectPage({ params }) {
  const { slug } = await params;

  if (!slug) {
    redirect('/agenthub/search');
  }

  redirect(`/agenthub/agents/${slug}`);
}

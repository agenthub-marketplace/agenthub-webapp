import { redirect } from 'next/navigation';

export default async function EnAgentDetailAlias({ params }) {
  const { slug } = await params;

  if (typeof slug !== 'string' || !slug) {
    redirect('/en/search');
  }

  redirect(`/agents/${slug}`);
}

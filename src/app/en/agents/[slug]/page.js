import { redirect } from 'next/navigation';

export default async function EnAgentDetailAlias({ params, searchParams }) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};

  if (typeof slug !== 'string' || !slug) {
    redirect('/en/search');
  }

  const serializedQuery = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        return [[key, value]];
      }

      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }

      return [];
    }),
  ).toString();

  redirect(`/agents/${slug}${serializedQuery ? `?${serializedQuery}` : ''}`);
}

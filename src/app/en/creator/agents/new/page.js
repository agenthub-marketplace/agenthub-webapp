import { redirect } from 'next/navigation';

function withQuery(path, query) {
  const serializedQuery = new URLSearchParams(
    Object.entries(query ?? {}).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        return [[key, value]];
      }

      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }

      return [];
    }),
  ).toString();

  return serializedQuery ? `${path}?${serializedQuery}` : path;
}

export default async function NewAgentPage({ searchParams }) {
  const query = searchParams ? await searchParams : {};

  redirect(withQuery('/code/agents/new', query));
}

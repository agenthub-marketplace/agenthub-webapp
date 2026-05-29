import { redirect } from "next/navigation";

export default async function AgentRentPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (typeof slug !== "string" || !slug) {
    redirect("/agenthub/search");
  }

  redirect(`/agenthub/agents/${slug}`);
}

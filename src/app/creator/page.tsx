import { CreatorView } from "@/components/views/creator-view";
import { requireCreatorAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type CreatorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorPage({ searchParams }: CreatorPageProps) {
  const profile = await requireCreatorAccess("fr");
  return <CreatorView locale="fr" profile={profile} searchParams={searchParams} />;
}

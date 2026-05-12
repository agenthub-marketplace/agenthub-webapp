import { CreatorView } from "@/components/views/creator-view";
import { requireCreatorAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type EnglishCreatorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EnglishCreatorPage({ searchParams }: EnglishCreatorPageProps) {
  const profile = await requireCreatorAccess("en");
  return <CreatorView locale="en" profile={profile} searchParams={searchParams} />;
}

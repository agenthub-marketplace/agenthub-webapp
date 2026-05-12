import { CreatorAgentFormView } from "@/components/views/creator-agent-form-view";
import { requireCreatorAccess } from "@/lib/auth/session";
import { getAgentCategoryOptions, getCreatorProfileForUser } from "@/server/agents/creator-agents";

export const dynamic = "force-dynamic";

type EnglishNewCreatorAgentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EnglishNewCreatorAgentPage({
  searchParams,
}: EnglishNewCreatorAgentPageProps) {
  const profile = await requireCreatorAccess("en");
  const creatorProfile = await getCreatorProfileForUser(profile.id);
  const categories = await getAgentCategoryOptions();

  return (
    <CreatorAgentFormView
      categories={categories}
      creatorProfileMissing={creatorProfile.creatorProfileMissing}
      locale="en"
      profileError={creatorProfile.error}
      searchParams={searchParams}
    />
  );
}

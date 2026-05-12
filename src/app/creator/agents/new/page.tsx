import { CreatorAgentFormView } from "@/components/views/creator-agent-form-view";
import { requireCreatorAccess } from "@/lib/auth/session";
import { getAgentCategoryOptions, getCreatorProfileForUser } from "@/server/agents/creator-agents";

export const dynamic = "force-dynamic";

type NewCreatorAgentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewCreatorAgentPage({ searchParams }: NewCreatorAgentPageProps) {
  const profile = await requireCreatorAccess("fr");
  const creatorProfile = await getCreatorProfileForUser(profile.id);
  const categories = await getAgentCategoryOptions();

  return (
    <CreatorAgentFormView
      categories={categories}
      creatorProfileMissing={creatorProfile.creatorProfileMissing}
      locale="fr"
      profileError={creatorProfile.error}
      searchParams={searchParams}
    />
  );
}

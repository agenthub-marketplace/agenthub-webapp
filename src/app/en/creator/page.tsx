import { CreatorView } from "@/components/views/creator-view";
import { requireCreatorAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EnglishCreatorPage() {
  await requireCreatorAccess("en");
  return <CreatorView locale="en" />;
}

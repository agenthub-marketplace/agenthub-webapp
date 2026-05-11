import { AdminView } from "@/components/views/admin-view";
import { requireAdminAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EnglishAdminPage() {
  await requireAdminAccess("en");
  return <AdminView locale="en" />;
}

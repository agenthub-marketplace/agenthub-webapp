import { DashboardView } from "@/components/views/dashboard-view";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EnglishDashboardPage() {
  await requireAuth("en");
  return <DashboardView locale="en" />;
}

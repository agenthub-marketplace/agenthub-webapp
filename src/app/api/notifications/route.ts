import { NextResponse } from "next/server";

import { getCurrentUserNotifications } from "@/server/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const notifications = await getCurrentUserNotifications();

  return NextResponse.json(
    {
      notifications,
      count: notifications.length,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

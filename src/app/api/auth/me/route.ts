import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();

  return NextResponse.json(
    {
      authenticated: Boolean(profile),
      profile: profile
        ? {
            displayName: profile.displayName,
            email: profile.email,
            role: profile.role,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

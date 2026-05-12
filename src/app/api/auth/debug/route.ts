import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

export const dynamic = "force-dynamic";

type ProfileRole = {
  id: string;
  email: string;
  role: UserRole;
};

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      {
        authenticated: false,
        user_id: null,
        email: null,
        profile_found: false,
        profile_id: null,
        profile_email: null,
        role: null,
        profile_error_code: "missing-config",
        profile_error_message: "Supabase public configuration is missing.",
      },
      { headers: noStoreHeaders },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
        user_id: null,
        email: null,
        profile_found: false,
        profile_id: null,
        profile_email: null,
        role: null,
        profile_error_code: null,
        profile_error_message: null,
      },
      { headers: noStoreHeaders },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,role")
    .eq("id", user.id)
    .maybeSingle<ProfileRole>();

  return NextResponse.json(
    {
      authenticated: true,
      user_id: user.id,
      email: user.email ?? null,
      profile_found: Boolean(profile),
      profile_id: profile?.id ?? null,
      profile_email: profile?.email ?? null,
      role: profile?.role ?? null,
      profile_error_code: profileError?.code ?? null,
      profile_error_message: profileError?.message ?? null,
    },
    { headers: noStoreHeaders },
  );
}

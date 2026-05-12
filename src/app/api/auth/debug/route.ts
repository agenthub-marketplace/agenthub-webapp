import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

export const dynamic = "force-dynamic";

type ProfileRole = {
  role: UserRole;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({
      authenticated: false,
      user_id: null,
      email: null,
      role: null,
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user_id: null,
      email: null,
      role: null,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<ProfileRole>();

  return NextResponse.json({
    authenticated: true,
    user_id: user.id,
    email: user.email ?? null,
    role: profile?.role ?? null,
  });
}

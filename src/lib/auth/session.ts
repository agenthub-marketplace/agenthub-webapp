import "server-only";

import { redirect } from "next/navigation";

import { canAccessAdminArea, canAccessCreatorArea } from "@/lib/auth/roles";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
};

export type AuthProfile = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
};

function mapProfile(row: ProfileRow): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,email,display_name,role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  return data ? mapProfile(data) : null;
}

export async function requireAuth(locale: Locale) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(localizedPath("/auth/login", locale));
  }

  return profile;
}

export async function requireCreatorAccess(locale: Locale) {
  const profile = await requireAuth(locale);

  if (!canAccessCreatorArea(profile.role)) {
    redirect(localizedPath("/dashboard", locale));
  }

  return profile;
}

export async function requireAdminAccess(locale: Locale) {
  const profile = await requireAuth(locale);

  if (!canAccessAdminArea(profile.role)) {
    redirect(localizedPath("/dashboard", locale));
  }

  return profile;
}

export function getRoleHomePath(role: UserRole, locale: Locale) {
  if (role === "admin") {
    return localizedPath("/admin", locale);
  }

  if (role === "creator") {
    return localizedPath("/creator", locale);
  }

  return localizedPath("/dashboard", locale);
}

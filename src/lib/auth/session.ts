import "server-only";

import { redirect } from "next/navigation";

import { canAccessAdminArea, canAccessCreatorArea } from "@/lib/auth/roles";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
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

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function getBootstrapRole(metadata: Record<string, unknown> | undefined): Exclude<UserRole, "admin"> {
  return getMetadataString(metadata, "role") === "creator" ? "creator" : "user";
}

function getBootstrapDisplayName(metadata: Record<string, unknown> | undefined) {
  return getMetadataString(metadata, "display_name") || null;
}

async function bootstrapMissingProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<AuthProfile | null> {
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return null;
  }

  const role = getBootstrapRole(user.user_metadata);
  const displayName = getBootstrapDisplayName(user.user_metadata);
  const email = user.email ?? "";

  const { data: existingProfile, error: existingProfileError } = await serviceClient
    .from("profiles")
    .select("id,email,display_name,role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (existingProfileError) {
    return null;
  }

  if (existingProfile) {
    return mapProfile(existingProfile);
  }

  const { data: createdProfile, error: createProfileError } = await serviceClient
    .from("profiles")
    .insert({
      display_name: displayName,
      email,
      id: user.id,
      role,
    })
    .select("id,email,display_name,role")
    .maybeSingle<ProfileRow>();

  if (createProfileError || !createdProfile) {
    return null;
  }

  if (role === "creator") {
    await serviceClient.from("creator_profiles").upsert(
      {
        public_name: displayName || email.split("@")[0] || "Creator",
        user_id: user.id,
      },
      { onConflict: "user_id" },
    );
  }

  return mapProfile(createdProfile);
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    return null;
  }

  if (data) {
    return mapProfile(data);
  }

  return bootstrapMissingProfile(user);
}

function loginPath(locale: Locale, nextPath?: string) {
  const path = localizedPath("/auth/login", locale);

  if (!nextPath) {
    return path;
  }

  const params = new URLSearchParams({
    error: "session-expired",
    next: nextPath,
  });

  return `${path}?${params.toString()}`;
}

export function getUserHomePath(locale: Locale) {
  return locale === "en" ? localizedPath("/dashboard", locale) : localizedPath("/agenthub/dashboard", locale);
}

export async function requireAuth(locale: Locale, nextPath?: string) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(loginPath(locale, nextPath));
  }

  return profile;
}

export async function requireCreatorAccess(locale: Locale, nextPath?: string) {
  const profile = await requireAuth(locale, nextPath);

  if (!canAccessCreatorArea(profile.role)) {
    redirect(getUserHomePath(locale));
  }

  return profile;
}

export async function requireAdminAccess(locale: Locale, nextPath?: string) {
  const profile = await requireAuth(locale, nextPath);

  if (!canAccessAdminArea(profile.role)) {
    redirect(getUserHomePath(locale));
  }

  return profile;
}

export function getRoleHomePath(role: UserRole, locale: Locale) {
  if (role === "admin") {
    return "/code/admin";
  }

  if (role === "creator") {
    return "/code";
  }

  return getUserHomePath(locale);
}

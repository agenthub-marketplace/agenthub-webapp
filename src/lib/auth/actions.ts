"use server";

import { redirect } from "next/navigation";

import { getRoleHomePath } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function authRedirect(
  locale: Locale,
  page: "login" | "signup",
  key: "error" | "status",
  value: string,
): never {
  const path = localizedPath(`/auth/${page}`, locale);
  const params = new URLSearchParams({ [key]: value });
  redirect(`${path}?${params.toString()}`);
}

function getAppUrl() {
  if (publicEnv.appUrl) {
    return publicEnv.appUrl;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

async function getSignedInRole(defaultRole: UserRole): Promise<UserRole> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return defaultRole;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return defaultRole;
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: UserRole }>();

  return data?.role ?? defaultRole;
}

export async function loginAction(locale: Locale, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    authRedirect(locale, "login", "error", "missing-config");
  }

  const email = readText(formData, "email");
  const password = readText(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    authRedirect(locale, "login", "error", "invalid-credentials");
  }

  const role = await getSignedInRole("user");
  redirect(getRoleHomePath(role, locale));
}

export async function signupAction(locale: Locale, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    authRedirect(locale, "signup", "error", "missing-config");
  }

  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const displayName = readText(formData, "name");
  const requestedRole = readText(formData, "role");
  const role: Exclude<UserRole, "admin"> = requestedRole === "creator" ? "creator" : "user";
  const nextPath = localizedPath(role === "creator" ? "/creator" : "/dashboard", locale);
  const callbackPath = localizedPath("/auth/callback", locale);
  const emailRedirectTo = `${getAppUrl()}${callbackPath}?next=${encodeURIComponent(nextPath)}`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        display_name: displayName,
        role,
      },
    },
  });

  if (error) {
    authRedirect(locale, "signup", "error", "invalid-credentials");
  }

  authRedirect(locale, "signup", "status", "check-email");
}

export async function logoutAction(locale: Locale) {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect(localizedPath("/", locale));
}

"use server";

import { redirect } from "next/navigation";

import { getRoleHomePath, getUserHomePath } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { isInternalPath } from "@/lib/auth/internal-path";
import { localizedPath, stripLocalePrefix, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function authRedirect(
  locale: Locale,
  page: "login" | "signup" | "reset-password",
  key: "error" | "status",
  value: string,
): never {
  const path = localizedPath(`/auth/${page}`, locale);
  const params = new URLSearchParams({ [key]: value });
  redirect(`${path}?${params.toString()}`);
}

function isEmailSendFailure(error: { code?: string; message?: string; status?: number } | null) {
  if (!error) {
    return null;
  }

  const errorText = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();

  if (
    error.status === 429 ||
    errorText.includes("rate limit") ||
    errorText.includes("too many") ||
    errorText.includes("over_email_send_rate_limit") ||
    errorText.includes("email rate limit")
  ) {
    return "email-rate-limit";
  }

  if (
    (error.status && error.status >= 500) ||
    errorText.includes("smtp") ||
    errorText.includes("email provider") ||
    errorText.includes("send email") ||
    errorText.includes("failed to send")
  ) {
    return "email-send-failed";
  }

  return null;
}

function safeNextPath(value: string, locale: Locale) {
  if (!isInternalPath(value)) {
    return "";
  }

  const stripped = stripLocalePrefix(value);

  // Le retrait de /en peut transformer un chemin interne en URL commençant par //.
  if (!isInternalPath(stripped)) return "";

  if (stripped === "/code" || stripped.startsWith("/code/")) {
    return stripped;
  }

  if (locale === "en" && stripped === "/agenthub/dashboard") {
    return getUserHomePath(locale);
  }

  if (locale === "en" && stripped === "/agenthub/search") {
    return localizedPath("/search", locale);
  }

  if (locale === "en" && (stripped === "/agenthub/workspace" || stripped.startsWith("/agenthub/workspace/"))) {
    return localizedPath(stripped.replace("/agenthub", ""), locale);
  }

  return localizedPath(stripped, locale);
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
  const next = safeNextPath(readText(formData, "next"), locale);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    authRedirect(locale, "login", "error", "invalid-credentials");
  }

  const role = await getSignedInRole("user");
  if (next) {
    redirect(next);
  }

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

  if (!isStrongPassword(password)) {
    authRedirect(locale, "signup", "error", "password-policy");
  }

  const nextPath = role === "creator" ? "/code" : getUserHomePath(locale);
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
    const errorText = `${error.code ?? ""} ${error.message}`.toLowerCase();

    if (
      error.code === "weak_password" ||
      errorText.includes("password")
    ) {
      authRedirect(locale, "signup", "error", "password-policy");
    }

    if (
      error.code === "user_already_exists" ||
      error.status === 422 ||
      errorText.includes("already registered") ||
      errorText.includes("already exists") ||
      errorText.includes("already in use") ||
      errorText.includes("user already")
    ) {
      authRedirect(locale, "signup", "error", "email-used");
    }

    authRedirect(locale, "signup", "error", "invalid-credentials");
  }

  authRedirect(locale, "signup", "status", "check-email");
}

export async function requestPasswordResetAction(locale: Locale, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    authRedirect(locale, "login", "error", "missing-config");
  }

  const email = readText(formData, "email");

  if (!email) {
    authRedirect(locale, "login", "error", "invalid-credentials");
  }

  const callbackPath = localizedPath("/auth/callback", locale);
  const resetPath = localizedPath("/auth/reset-password", locale);
  const redirectTo = `${getAppUrl()}${callbackPath}?next=${encodeURIComponent(resetPath)}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  const emailSendFailure = isEmailSendFailure(error);
  if (emailSendFailure) {
    authRedirect(locale, "login", "error", emailSendFailure);
  }

  authRedirect(locale, "login", "status", "password-reset-email-sent");
}

export async function resendConfirmationEmailAction(locale: Locale, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    authRedirect(locale, "login", "error", "missing-config");
  }

  const email = readText(formData, "email");

  if (!email) {
    authRedirect(locale, "login", "error", "invalid-credentials");
  }

  const dashboardPath = getUserHomePath(locale);
  const callbackPath = localizedPath("/auth/callback", locale);
  const emailRedirectTo = `${getAppUrl()}${callbackPath}?next=${encodeURIComponent(dashboardPath)}`;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });

  const emailSendFailure = isEmailSendFailure(error);
  if (emailSendFailure) {
    authRedirect(locale, "login", "error", emailSendFailure);
  }

  authRedirect(locale, "login", "status", "confirmation-email-sent");
}

export async function updatePasswordAction(locale: Locale, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    authRedirect(locale, "reset-password", "error", "missing-config");
  }

  const password = readText(formData, "password");

  if (!isStrongPassword(password)) {
    authRedirect(locale, "reset-password", "error", "password-policy");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    authRedirect(locale, "login", "error", "session-expired");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    authRedirect(locale, "reset-password", "error", "invalid-credentials");
  }

  authRedirect(locale, "login", "status", "password-updated");
}

export async function logoutAction(locale: Locale) {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect(localizedPath("/", locale));
}

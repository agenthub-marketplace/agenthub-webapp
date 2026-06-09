import { NextResponse, type NextRequest } from "next/server";

import { getUserHomePath } from "@/lib/auth/session";
import { localizedPath, stripLocalePrefix, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, locale: Locale) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return getUserHomePath(locale);
  }

  const stripped = stripLocalePrefix(value);

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

export async function handleAuthCallback(request: NextRequest, locale: Locale) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"), locale);
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL(`${localizedPath("/auth/login", locale)}?error=callback`, request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`${localizedPath("/auth/login", locale)}?error=callback`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}

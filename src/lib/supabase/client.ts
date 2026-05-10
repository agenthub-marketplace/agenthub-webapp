"use client";

import { createBrowserClient } from "@supabase/ssr";

import { hasSupabasePublicConfig, publicEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!hasSupabasePublicConfig()) {
    return null;
  }

  return createBrowserClient(publicEnv.supabaseUrl!, publicEnv.supabaseAnonKey!);
}

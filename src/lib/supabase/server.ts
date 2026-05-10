import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { hasSupabasePublicConfig, publicEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!hasSupabasePublicConfig()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl!, publicEnv.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware or Route Handlers can.
        }
      },
    },
  });
}

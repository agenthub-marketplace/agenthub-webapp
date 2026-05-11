import type { ReactNode } from "react";

import { AppNav } from "@/components/app/app-nav";
import { getCurrentProfile } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

type AppShellProps = {
  children: ReactNode;
  locale?: Locale;
};

export async function AppShell({ children, locale = "fr" }: AppShellProps) {
  const profile = await getCurrentProfile();

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#181716]">
      <AppNav locale={locale} profile={profile} />
      <div className="mx-auto w-full max-w-7xl px-6 py-8 md:py-10">
        {children}
      </div>
    </main>
  );
}

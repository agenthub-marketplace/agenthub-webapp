import type { ReactNode } from "react";

import { AppNav } from "@/components/app/app-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#181716]">
      <AppNav />
      <div className="mx-auto w-full max-w-7xl px-6 py-8 md:py-10">
        {children}
      </div>
    </main>
  );
}

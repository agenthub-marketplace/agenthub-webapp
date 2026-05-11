"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, ShieldCheck, Sparkles, UserCog } from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import type { AuthProfile } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizedPath, switchLocalePath, type Locale } from "@/lib/i18n/config";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/marketplace",
    labelKey: "marketplace",
    icon: Search,
    activeFor: ["/marketplace", "/agents"],
  },
  {
    href: "/dashboard",
    labelKey: "dashboard",
    icon: LayoutDashboard,
    activeFor: ["/dashboard"],
  },
  {
    href: "/creator",
    labelKey: "creator",
    icon: UserCog,
    activeFor: ["/creator"],
  },
  {
    href: "/admin",
    labelKey: "admin",
    icon: ShieldCheck,
    activeFor: ["/admin"],
  },
] as const;

type AppNavProps = {
  locale: Locale;
  profile: AuthProfile | null;
};

export function AppNav({ locale, profile }: AppNavProps) {
  const pathname = usePathname();
  const t = getDictionary(locale);
  const logout = logoutAction.bind(null, locale);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4ddd2] bg-[#f8f7f4]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href={localizedPath("/", locale)} className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#181716] text-white">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            AgentHub
          </Link>
          <Link
            href={localizedPath(profile ? "/dashboard" : "/auth/login", locale)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-[#d7cec1] bg-white md:hidden",
            )}
          >
            {profile ? t.common.dashboard : t.common.login}
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-lg border border-[#e4ddd2] bg-white p-1 md:overflow-visible">
          {navItems.map((item) => {
            const isActive = item.activeFor.some((prefix) =>
              pathname.startsWith(localizedPath(prefix, locale)),
            );

            return (
              <Link
                key={item.href}
                href={localizedPath(item.href, locale)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#68615a] transition-colors hover:bg-[#f2eee8] hover:text-[#181716]",
                  isActive && "bg-[#181716] text-white hover:bg-[#181716] hover:text-white",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {t.common[item.labelKey]}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex rounded-lg border border-[#d7cec1] bg-white p-1">
            <Link
              href={switchLocalePath(pathname, "fr")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                locale === "fr" ? "bg-[#181716] text-white" : "text-[#68615a]",
              )}
            >
              FR
            </Link>
            <Link
              href={switchLocalePath(pathname, "en")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                locale === "en" ? "bg-[#181716] text-white" : "text-[#68615a]",
              )}
            >
              EN
            </Link>
          </div>
          {profile ? (
            <form action={logout}>
              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-[#68615a]",
                )}
              >
                {t.common.logout}
              </button>
            </form>
          ) : (
            <Link
              href={localizedPath("/auth/login", locale)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-[#68615a]",
              )}
            >
              {t.common.login}
            </Link>
          )}
          <Link
            href={localizedPath(profile ? "/dashboard" : "/auth/signup", locale)}
            className={cn(buttonVariants({ size: "sm" }), "bg-[#181716]")}
          >
            {profile ? profile.displayName ?? profile.email : t.common.signup}
          </Link>
        </div>
      </div>
    </header>
  );
}

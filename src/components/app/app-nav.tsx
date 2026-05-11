"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, ShieldCheck, Sparkles, UserCog } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: Search,
    activeFor: ["/marketplace", "/agents"],
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    activeFor: ["/dashboard"],
  },
  {
    href: "/creator",
    label: "Creator",
    icon: UserCog,
    activeFor: ["/creator"],
  },
  {
    href: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    activeFor: ["/admin"],
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4ddd2] bg-[#f8f7f4]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#181716] text-white">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            AgentHub
          </Link>
          <Link
            href="/auth/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-[#d7cec1] bg-white md:hidden",
            )}
          >
            Login
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-lg border border-[#e4ddd2] bg-white p-1 md:overflow-visible">
          {navItems.map((item) => {
            const isActive = item.activeFor.some((prefix) =>
              pathname.startsWith(prefix),
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#68615a] transition-colors hover:bg-[#f2eee8] hover:text-[#181716]",
                  isActive && "bg-[#181716] text-white hover:bg-[#181716] hover:text-white",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/auth/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-[#68615a]",
            )}
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className={cn(buttonVariants({ size: "sm" }), "bg-[#181716]")}
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

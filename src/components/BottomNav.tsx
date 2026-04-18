import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Settings } from "lucide-react";
import { CubeIcon } from "@/components/icons/CubeIcon";
import { TrendIcon } from "@/components/icons/TrendIcon";

const items = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { to: "/portefeuille", label: "Portefeuille", Icon: CubeIcon },
  { to: "/analyses", label: "Analyses", Icon: TrendIcon },
  { to: "/reglages", label: "Réglages", Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-surface border-t border-border h-16 flex items-stretch z-50"
      style={{ maxWidth: 393 }}
    >
      {items.map(({ to, label, Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            <Icon
              size={22}
              strokeWidth={1.75}
              className={active ? "text-foreground" : "text-muted-strong"}
            />
            <span
              className={`text-[10px] ${active ? "text-foreground font-medium" : "text-muted-strong"}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShellWithNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell pb-20">
      {children}
      <BottomNav />
    </div>
  );
}

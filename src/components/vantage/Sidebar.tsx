import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Crosshair,
  History,
  FileText,
  Network,
  Database,
  Settings,
  LogOut,
  Globe,
  CreditCard,
  Key,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DiscordIcon } from "@/components/vantage/DiscordGate";
import { isCurrentUserAdmin } from "@/lib/roles.functions";

const DISCORD_INVITE = "https://discord.gg/JqvvWBZJKr";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: { section?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/launch", label: "New Investigation", icon: Crosshair },
      { to: "/history", label: "History", icon: History },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { to: "/history", label: "Reports", icon: FileText },
      { to: "/dashboard", label: "Identity Graph", icon: Network },
      { to: "/dashboard", label: "Evidence Vault", icon: Database },
      { to: "/sites", label: "Site Catalog", icon: Globe },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/keys", label: "Access Keys", icon: Key },
      { to: "/billing", label: "Plans & Billing", icon: CreditCard },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];


export function Sidebar({ email }: { email?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const adminQ = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });
  const groups = adminQ.data?.admin
    ? [
        ...NAV,
        {
          section: "Admin",
          items: [{ to: "/admin", label: "Admin Console", icon: Shield }] as NavItem[],
        },
      ]
    : NAV;
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };


  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border/60 bg-background/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border/60">
        <div className="h-6 w-6 rounded-md iridescent animate-iridescent shadow-[0_0_16px_-2px_oklch(0.68_0.24_295/0.7)]" />
        <span className="font-display font-bold tracking-tight text-base">VANTAGE</span>
        <span className="ml-auto text-[9px] font-display uppercase tracking-widest text-primary/80 border border-primary/40 rounded-full px-2 py-0.5">
          OSINT
        </span>
      </div>

      <div className="px-3 py-3 border-b border-border/60">
        <div className="rounded-md bg-background/60 px-2.5 py-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-mono text-primary">
            {(email?.[0] ?? "V").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-mono truncate">{email ?? "operator"}</div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
              Analyst
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-5">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <div className="px-4 mb-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
                {group.section}
              </div>
            )}
            <div className="px-2 space-y-0.5">
              {group.items.map((item, i) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={`${gi}-${i}`}
                    to={item.to}
                    className={`flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "bg-primary/15 text-primary border border-primary/50 shadow-[0_0_18px_-6px_oklch(0.68_0.24_295/0.8)]"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border/60 space-y-1">
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <DiscordIcon className="h-3.5 w-3.5" />
          Discord community
        </a>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

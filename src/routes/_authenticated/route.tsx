import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/vantage/Sidebar";
import { Bell, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <div className="min-h-screen flex">
      <Sidebar email={user.email ?? undefined} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/60 bg-surface/40 backdrop-blur-xl sticky top-0 z-30 flex items-center px-4 gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="uppercase tracking-wider">Agent online</span>
          </div>
          <div className="flex-1 max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Quick search targets, reports, findings..."
              className="w-full rounded-md border border-border/60 bg-background/60 pl-9 pr-3 py-1.5 text-xs font-mono outline-none focus:border-primary"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground border border-border rounded px-1">
              ⌘K
            </span>
          </div>
          <button className="relative rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-elevated">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

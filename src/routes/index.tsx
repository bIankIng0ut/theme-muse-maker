import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 md:px-10 py-5">
        <div className="font-mono text-sm tracking-tight">Vantage.osint</div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#coverage" className="hover:text-foreground transition">Coverage</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="pill px-4 py-2 text-sm border border-border bg-surface/60 hover:bg-surface-elevated transition"
          >
            Log in
          </Link>
          <Link
            to="/auth"
            className="pill px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center -mt-10">
        <h1 className="font-display font-black text-[clamp(3.5rem,14vw,12rem)] leading-[0.9] tracking-[-0.05em] animate-fade-in">
          VANTAGE<span className="text-muted-foreground/50">.OSINT</span>
        </h1>
        <p className="mt-8 max-w-xl text-muted-foreground text-base md:text-lg leading-relaxed">
          Autonomous multi-agent investigations. Look up identities, breach dumps,
          and 60+ OSINT modules from one defensible, evidence-chained workspace.
        </p>
        <div className="mt-10 flex items-center gap-6">
          <Link
            to="/auth"
            className="pill inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            Get started <ArrowUpRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Documentation
          </a>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-6 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        <span>v1.0 · built for defense</span>
        <span className="hidden md:inline">calibrated for truth</span>
      </footer>
    </div>
  );
}

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Crosshair, Radar, Network, Shield } from "lucide-react";
import { DiscordIcon } from "@/components/vantage/DiscordGate";

const DISCORD_INVITE = "https://discord.gg/JqvvWBZJKr";

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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Ambient violet glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/15 blur-[140px]" />
      </div>

      <header className="flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-2 font-mono text-sm tracking-tight">
          <Radar className="h-4 w-4 text-primary" />
          <span className="font-bold tracking-widest">VANTAGE</span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <Link to="/billing" className="hover:text-foreground transition">Pricing</Link>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="hover:text-foreground transition inline-flex items-center gap-1.5">
            <DiscordIcon className="h-3.5 w-3.5" /> Discord
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-full px-4 py-2 text-sm border border-border bg-surface/60 hover:bg-surface-elevated transition"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center -mt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 backdrop-blur-xl px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-8 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Autonomous OSINT · Multi-agent runtime
        </div>
        <h1 className="font-display font-black text-[clamp(3rem,12vw,9rem)] leading-[0.9] tracking-[-0.05em] animate-fade-in">
          Hunt with <span className="bg-gradient-to-br from-primary via-pink to-primary bg-clip-text text-transparent">Vantage</span>
        </h1>
        <p className="mt-8 max-w-xl text-muted-foreground text-base md:text-lg leading-relaxed">
          Drop in an email, handle, or phone — Vantage spins up a swarm of agents,
          cross-references 5,000+ surfaces, and renders a defensible identity graph
          you can act on.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/billing"
            className="rounded-full inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground text-base font-semibold hover:opacity-90 transition shadow-lg shadow-primary/30"
          >
            <Crosshair className="h-4 w-4" />
            Start Hunting
          </Link>
          <Link
            to="/auth"
            className="rounded-full inline-flex items-center gap-2 px-7 py-3.5 border border-border bg-surface/60 text-sm hover:bg-surface-elevated transition"
          >
            I have an access key
          </Link>
        </div>

        <div id="features" className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl w-full">
          {[
            { icon: Crosshair, title: "5,000+ surfaces", desc: "Mainstream, regional, and long-tail platforms scanned in parallel." },
            { icon: Network, title: "Identity graph", desc: "Every finding ties back to a node — pivot from email to handle to phone." },
            { icon: Shield, title: "Defensible chain", desc: "Evidence vault, screenshots, source URLs — built for analyst rigor." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-5 text-left">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold">{f.title}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 md:px-10 py-6 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        <span>v1.0 · built for defense</span>
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
          <DiscordIcon className="h-3.5 w-3.5" /> Join the community
        </a>
      </footer>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";
import { toast } from "sonner";
import { Sparkles, Moon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const get = useServerFn(getSettings);
  const q = useQuery({ queryKey: ["settings"], queryFn: () => get() });

  const plan = q.data?.plan ?? "free";
  const quota = q.data?.quota;
  const pct = quota ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Profile</div>
        <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Plan and daily quota. Vantage AI is built-in — no API keys to manage.</p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Plan
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-semibold tracking-tight capitalize">{plan}</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-xs">
                {plan === "ultra"
                  ? "Ultra Pro: unlimited investigations, no rate caps."
                  : plan === "pro"
                    ? "Pro: unlimited investigations powered by Vantage AI."
                    : "Free tier: limited daily investigations. Upgrade to Pro for unlimited usage."}
              </div>
            </div>
            {plan === "free" && (
              <button
                onClick={() => toast.info("Pro tier opens soon — contact ops.")}
                className="rounded-full bg-foreground text-background text-xs px-3 py-1.5 hover:opacity-90 transition"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Moon className="h-3.5 w-3.5" /> Daily quota
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{quota?.used ?? 0}</span>
            <span className="text-xs text-muted-foreground">/ {quota?.limit ?? 15}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] font-mono text-muted-foreground">
            Resets {quota ? new Date(quota.resetsAt).toLocaleString() : "—"}
          </div>
        </div>
      </section>
    </div>
  );
}

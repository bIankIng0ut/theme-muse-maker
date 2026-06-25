import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHistory } from "@/lib/investigations.functions";
import { getSettings } from "@/lib/settings.functions";
import { StatusBadge } from "@/components/vantage/StatusBadge";
import { ArrowUpRight, Plus, Moon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function Sparkline({ points }: { points: number[] }) {
  const w = 220;
  const h = 56;
  const data = points.length < 2 ? [0, 0] : points;
  const max = Math.max(1, ...data);
  const step = w / (data.length - 1);
  const d = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(h - (p / max) * (h - 6) - 3).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14 overflow-visible">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.98 0 0)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.98 0 0)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#spark)" />
      <path d={d} fill="none" stroke="oklch(0.98 0 0)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DashboardPage() {
  const list = useServerFn(listHistory);
  const get = useServerFn(getSettings);
  const q = useQuery({ queryKey: ["history"], queryFn: () => list({ data: { limit: 50 } }) });
  const s = useQuery({ queryKey: ["settings"], queryFn: () => get() });

  const rows = q.data ?? [];
  const total = rows.length;
  const done = rows.filter((r) => r.status === "done").length;

  const buckets = new Array(14).fill(0) as number[];
  const now = Date.now();
  for (const r of rows) {
    const days = Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000);
    if (days >= 0 && days < 14) buckets[13 - days] += 1;
  }

  const quota = s.data?.quota;
  const pct = quota ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap animate-fade-up">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Operator console</div>
          <h1 className="text-4xl font-semibold mt-1 tracking-tight">Good hunting.</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {total === 0 ? "No investigations on the board yet." : `${done} of ${total} dossiers complete.`}
          </p>
        </div>
        <Link
          to="/launch"
          className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
          New investigation
        </Link>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-2 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Activity · 14 days</div>
            <div className="text-xs text-muted-foreground tabular-nums">{total} total</div>
          </div>
          <div className="mt-4">
            <Sparkline points={buckets} />
          </div>
        </div>

        <Link
          to="/settings"
          className="glass rounded-2xl p-5 group animate-fade-up hover:bg-surface-elevated/40 transition"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Moon className="h-3.5 w-3.5" /> Nightly quota
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tabular-nums">{quota?.remaining ?? 15}</span>
            <span className="text-xs text-muted-foreground">left of {quota?.limit ?? 15}</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-background/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] font-mono text-muted-foreground group-hover:text-foreground/80 transition">
            Manage credentials →
          </div>
        </Link>
      </section>

      <section className="glass rounded-2xl overflow-hidden animate-fade-up" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-medium tracking-tight">Recent investigations</h2>
          <Link to="/history" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border/40">
          {q.isLoading && (
            <div className="px-5 py-10 text-center text-xs font-mono text-muted-foreground">Loading…</div>
          )}
          {!q.isLoading && rows.length === 0 && (
            <div className="px-5 py-14 text-center">
              <div className="text-sm text-muted-foreground">Nothing in the queue.</div>
              <Link to="/launch" className="mt-3 inline-flex items-center gap-1 text-xs text-foreground hover:underline">
                Launch your first <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          {rows.slice(0, 6).map((r, i) => (
            <Link
              key={r.id}
              to="/investigate/$id"
              params={{ id: r.id }}
              className="flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated/40 transition animate-fade-up"
              style={{ animationDelay: `${240 + i * 40}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{r.target}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                  {r.target_type} · {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

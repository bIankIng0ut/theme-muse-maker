import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInvestigation, tickInvestigation } from "@/lib/investigations.functions";
import { StatusBadge } from "@/components/vantage/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, ExternalLink, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";


export const Route = createFileRoute("/_authenticated/investigate/$id")({
  component: InvestigatePage,
});

function InvestigatePage() {
  const { id } = Route.useParams();
  const get = useServerFn(getInvestigation);
  const tick = useServerFn(tickInvestigation);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["investigation", id],
    queryFn: () => get({ data: { id } }),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`inv-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_steps", filter: `investigation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["investigation", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "findings", filter: `investigation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["investigation", id] }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "investigations", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["investigation", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  // Drive the runner forward: one phase per tick. Each tick is a short
  // request — the worker doesn't time out, and progress is incremental.
  const tickingRef = useRef(false);
  const status = q.data?.investigation.status as string | undefined;
  useEffect(() => {
    if (!status || status === "done" || status === "error") return;
    let cancelled = false;
    const loop = async () => {
      if (cancelled || tickingRef.current) return;
      tickingRef.current = true;
      try {
        await tick({ data: { id } });
        qc.invalidateQueries({ queryKey: ["investigation", id] });
      } catch {
        // swallow; the next tick will retry, or we'll surface via status=error
      } finally {
        tickingRef.current = false;
      }
    };
    void loop();
    const interval = setInterval(loop, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, id, tick, qc]);

  if (q.isLoading) {
    return <div className="text-sm text-muted-foreground font-mono">Loading...</div>;
  }
  if (q.isError || !q.data) {
    return <div className="text-sm text-destructive font-mono">Not found</div>;
  }

  const { investigation, findings, steps, report } = q.data;
  const TERMINAL = new Set(["done", "error"]);
  const live = !TERMINAL.has(investigation.status);

  const STAGE_BASE: Record<string, number> = {
    queued: 2,
    triage: 10,
    enumerate: 22,
    evidence: 36,
    correlate: 52,
    dorks: 66,
    filter: 80,
    report: 90,
    done: 100,
    error: 100,
  };
  const STAGE_CAP: Record<string, number> = {
    queued: 9,
    triage: 21,
    enumerate: 35,
    evidence: 51,
    correlate: 65,
    dorks: 79,
    filter: 89,
    report: 99,
    done: 100,
    error: 100,
  };
  const targetPct = useMemo(() => {
    const base = STAGE_BASE[investigation.status] ?? 0;
    const cap = STAGE_CAP[investigation.status] ?? 100;
    const span = cap - base;
    const grow = span * (1 - Math.exp(-steps.length / 4));
    return Math.min(cap, Math.round(base + grow));
  }, [investigation.status, steps.length]);

  const [displayPct, setDisplayPct] = useState(targetPct);
  useEffect(() => {
    let raf: number;
    const tick = () => {
      setDisplayPct((cur) => {
        if (cur < targetPct) return Math.min(targetPct, cur + Math.max(0.3, (targetPct - cur) * 0.08));
        if (live && cur < (STAGE_CAP[investigation.status] ?? 100)) {
          return Math.min(STAGE_CAP[investigation.status] ?? 100, cur + 0.05);
        }
        return cur;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetPct, live, investigation.status]);

  const pct = Math.round(displayPct);



  return (
    <div className="space-y-8 relative">
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-[60%] opacity-70 -z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 30% 30%, oklch(0.65 0.28 305 / 0.55), transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="pointer-events-none absolute -top-16 right-0 h-80 w-[50%] opacity-60 -z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 70% 40%, oklch(0.70 0.24 30 / 0.4), transparent 72%)",
          filter: "blur(70px)",
        }}
      />

      <header className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] font-display uppercase tracking-[0.25em] text-muted-foreground/80">
            Investigating
          </div>
          <h1 className="mt-2 text-4xl md:text-5xl font-display font-bold tracking-[-0.055em] leading-[0.95] gradient-text break-all">
            {investigation.target}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-display uppercase tracking-widest text-muted-foreground">
            <span className="tag-pill tag-neutral">{investigation.target_type}</span>
            <span className="opacity-60">·</span>
            <span>{new Date(investigation.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={investigation.status} />
          {report && (
            <Link
              to="/report/$id"
              params={{ id }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/50 px-4 py-2 text-[11px] font-display uppercase tracking-widest text-primary hover:bg-primary/25 shadow-[0_0_24px_-6px_oklch(0.68_0.24_295/0.8)] transition"
            >
              <FileText className="h-3.5 w-3.5" />
              Open dossier
            </Link>
          )}
        </div>
      </header>

      <div className="relative neon-card p-5">
        <div className="flex items-center justify-between mb-3 text-[10px] font-display uppercase tracking-[0.25em]">
          <span className="text-muted-foreground">
            {(() => {
              const labels: Record<string, string> = {
                done: "Investigation complete",
                error: "Run halted",
                queued: "Queued — warming up agent",
                triage: "Triage — classifying target",
                enumerate: "Enumerating sources",
                evidence: "Collecting evidence",
                correlate: "Correlating identities",
                dorks: "Generating intelligence queries",
                filter: "Filtering — scoring findings",
                report: "Compiling dossier",
              };
              return labels[investigation.status] ?? investigation.status;
            })()}
          </span>
          <span className="iridescent-text font-display font-bold text-base tabular-nums tracking-tight">
            {pct}%
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              investigation.status === "error"
                ? "bg-destructive"
                : "iridescent animate-iridescent shadow-[0_0_18px_-2px_oklch(0.68_0.24_295/0.9)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {live && (
          <div className="mt-3 text-[10px] font-display uppercase tracking-widest text-muted-foreground/70">
            Live progress · this can take a few minutes depending on options.
          </div>
        )}
      </div>

      {investigation.error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs font-mono text-destructive">
          {investigation.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2 neon-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-primary/20 px-5 py-3">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-[10px] font-display uppercase tracking-[0.25em]">Agent Feed</h2>
            {live && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-display uppercase tracking-widest text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_oklch(0.68_0.24_295)]" />
                live
              </span>
            )}
          </div>
          <div className="max-h-[600px] overflow-y-auto p-4 space-y-2 font-mono text-xs">
            {steps.length === 0 && (
              <div className="text-muted-foreground/60 py-8 text-center font-display uppercase tracking-widest text-[10px]">
                Awaiting agent...
              </div>
            )}
            {steps.map((s: any) => (
              <div key={s.id} className="flex gap-3 items-start group">
                <span className="text-muted-foreground/50 w-6 text-right shrink-0 tabular-nums">
                  {String(s.step_index).padStart(2, "0")}
                </span>
                <span
                  className={`shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full ${
                    s.status === "error"
                      ? "bg-destructive shadow-[0_0_8px_oklch(0.62_0.22_25)]"
                      : s.status === "running"
                        ? "bg-primary animate-pulse shadow-[0_0_10px_oklch(0.68_0.24_295)]"
                        : s.status === "skipped"
                          ? "bg-muted-foreground"
                          : "bg-success shadow-[0_0_8px_oklch(0.72_0.20_150)]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  {s.tool_name && (
                    <span className="iridescent-text font-semibold">{s.tool_name}</span>
                  )}
                  <div className="text-foreground/85 break-words leading-relaxed">{s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-3 neon-card neon-card-pink overflow-hidden">
          <div className="flex items-center gap-2 border-b border-pink/20 px-5 py-3">
            <h2 className="text-[10px] font-display uppercase tracking-[0.25em]">
              Findings <span className="text-muted-foreground/60">({findings.length})</span>
            </h2>
          </div>
          <div className="p-4 space-y-2.5">
            {findings.length === 0 && (
              <div className="text-xs text-muted-foreground/60 py-12 text-center font-display uppercase tracking-widest">
                No findings yet
              </div>
            )}
            {findings.map((f: any) => (
              <div
                key={f.id}
                className="rounded-xl border border-white/5 bg-black/40 hover:border-primary/40 hover:bg-black/60 transition p-3.5 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-display font-semibold uppercase tracking-[0.2em] iridescent-text">
                      {f.platform ?? f.tool_name}
                    </span>
                    <StatusBadge status={f.confidence} />
                    {f.is_false_positive && (
                      <span className="tag-pill bg-destructive/15 text-destructive border border-destructive/40 uppercase tracking-wider">
                        filtered
                      </span>
                    )}
                  </div>
                  {f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-foreground/80 hover:text-primary break-all transition"
                    >
                      {f.url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

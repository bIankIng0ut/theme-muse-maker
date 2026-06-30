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
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Investigating
          </div>
          <h1 className="text-2xl font-bold font-mono mt-0.5">{investigation.target}</h1>
          <div className="mt-1 text-xs text-muted-foreground font-mono uppercase">
            {investigation.target_type} · {new Date(investigation.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={investigation.status} />
          {report && (
            <Link
              to="/report/$id"
              params={{ id }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-primary-foreground hover:opacity-90"
            >
              <FileText className="h-3.5 w-3.5" />
              Open dossier
            </Link>
          )}
        </div>
      </header>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-2 text-[10px] font-mono uppercase tracking-wider">
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
          <span className="text-primary tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className={investigation.status === "error" ? "[&>div]:bg-destructive" : ""} />
        {live && (
          <div className="mt-2 text-[10px] font-mono text-muted-foreground">
            Live progress · this can take a few minutes depending on options.
          </div>
        )}
      </div>



      {investigation.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs font-mono text-destructive">
          {investigation.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2 rounded-lg border border-border bg-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-[10px] font-mono uppercase tracking-wider">Agent Feed</h2>
            {live && (
              <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-primary animate-pulse">
                ● live
              </span>
            )}
          </div>
          <div className="max-h-[600px] overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
            {steps.length === 0 && (
              <div className="text-muted-foreground py-4 text-center">Awaiting agent...</div>
            )}
            {steps.map((s: any) => (
              <div key={s.id} className="flex gap-2 items-start">
                <span className="text-muted-foreground w-6 text-right shrink-0">
                  {String(s.step_index).padStart(2, "0")}
                </span>
                <span
                  className={`shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full ${
                    s.status === "error"
                      ? "bg-destructive"
                      : s.status === "running"
                        ? "bg-primary animate-pulse"
                        : s.status === "skipped"
                          ? "bg-muted-foreground"
                          : "bg-success"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  {s.tool_name && (
                    <span className="text-primary">{s.tool_name}</span>
                  )}
                  <div className="text-foreground/90 break-words">{s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-3 rounded-lg border border-border bg-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
            <h2 className="text-[10px] font-mono uppercase tracking-wider">
              Findings ({findings.length})
            </h2>
          </div>
          <div className="p-3 space-y-2">
            {findings.length === 0 && (
              <div className="text-xs text-muted-foreground py-8 text-center font-mono">
                No findings yet. OSINT adapters will populate this list once configured.
              </div>
            )}
            {findings.map((f: any) => (
              <div
                key={f.id}
                className="rounded border border-border bg-background p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-primary uppercase">
                      {f.platform ?? f.tool_name}
                    </span>
                    <StatusBadge status={f.confidence} />
                    {f.is_false_positive && (
                      <span className="text-[10px] font-mono uppercase text-destructive">
                        filtered
                      </span>
                    )}
                  </div>
                  {f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono text-foreground/90 hover:text-primary break-all"
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

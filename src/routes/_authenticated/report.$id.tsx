import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getInvestigation } from "@/lib/investigations.functions";
import { StatusBadge } from "@/components/vantage/StatusBadge";
import { IdentityGraph } from "@/components/vantage/IdentityGraph";
import { ArrowLeft, Copy, Printer, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type GraphNode = { id: string; label?: string; type?: string };
type GraphEdge = { source: string; target: string; label?: string };

type Finding = {
  id: string;
  platform: string | null;
  url: string | null;
  username: string | null;
  confidence: string | null;
  tool_name: string | null;
  is_false_positive?: boolean | null;
};

function buildFallbackGraph(
  target: string,
  findings: Finding[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [{ id: "root", label: target, type: "target" }];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const f of findings.slice(0, 18)) {
    const label = f.username || f.platform || f.url;
    if (!label) continue;
    const id = `${f.platform ?? "src"}:${label}`;
    if (seen.has(id)) continue;
    seen.add(id);
    nodes.push({ id, label, type: f.platform ?? undefined });
    edges.push({ source: "root", target: id, label: f.platform ?? undefined });
  }
  return { nodes, edges };
}

export const Route = createFileRoute("/_authenticated/report/$id")({
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getInvestigation);
  const q = useQuery({
    queryKey: ["investigation", id],
    queryFn: () => get({ data: { id } }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of (q.data?.findings ?? []) as Finding[]) {
      const key = f.platform ?? f.tool_name ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [q.data]);

  if (q.isLoading) {
    return <div className="text-sm text-muted-foreground font-mono">Loading...</div>;
  }
  if (q.isError || !q.data) {
    return <div className="text-sm text-destructive font-mono">Not found</div>;
  }
  const { investigation, report, findings } = q.data;

  const copy = async () => {
    if (!report?.markdown) return;
    await navigator.clipboard.writeText(report.markdown);
    toast.success("Markdown copied");
  };

  const printPdf = () => window.print();

  const ig = (report?.identity_graph ?? null) as
    | { nodes?: GraphNode[]; edges?: GraphEdge[] }
    | null;
  const graph = ig?.nodes?.length
    ? { nodes: ig.nodes, edges: ig.edges ?? [] }
    : buildFallbackGraph(investigation.target, findings as Finding[]);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-container { max-width: none !important; padding: 0 !important; }
          .print-card { border: 1px solid #ddd !important; background: white !important; box-shadow: none !important; break-inside: avoid; }
          a { color: #1d4ed8 !important; }
          pre { white-space: pre-wrap !important; word-break: break-word !important; }
        }
      `}</style>
      <div className="max-w-4xl mx-auto space-y-6 print-container">
        <div className="flex items-center justify-between no-print">
          <Link
            to="/investigate/$id"
            params={{ id }}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to live view
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              disabled={!report?.markdown}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-surface-elevated disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" /> Copy MD
            </button>
            <button
              onClick={printPdf}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-primary-foreground hover:opacity-90"
            >
              <Printer className="h-3.5 w-3.5" /> Download PDF
            </button>
          </div>
        </div>

        <header className="rounded-lg border border-border bg-surface p-6 print-card">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Vantage Dossier
          </div>
          <h1 className="mt-1 text-3xl font-bold font-mono">{investigation.target}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
            <StatusBadge status={investigation.status} />
            <span>{investigation.target_type.toUpperCase()}</span>
            <span>·</span>
            <span>{findings.length} findings</span>
            <span>·</span>
            <span>{grouped.length} platforms</span>
          </div>
          {report?.summary && (
            <p className="mt-4 text-sm text-foreground/90">{report.summary}</p>
          )}
        </header>

        <div className="print-card">
          <IdentityGraph nodes={graph.nodes} edges={graph.edges} />
        </div>

        <section className="rounded-lg border border-border bg-surface overflow-hidden print-card">
          <div className="border-b border-border bg-background px-4 py-2.5">
            <h2 className="text-[10px] font-mono uppercase tracking-wider">
              Findings by platform
            </h2>
          </div>
          <div className="divide-y divide-border">
            {grouped.length === 0 && (
              <div className="p-6 text-xs text-muted-foreground font-mono text-center">
                No findings recorded.
              </div>
            )}
            {grouped.map(([platform, items]) => (
              <div key={platform} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase text-primary">{platform}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {items.length} {items.length === 1 ? "hit" : "hits"}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((f) => (
                    <li key={f.id} className="text-xs font-mono flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0">
                        {f.confidence ?? "—"}
                      </span>
                      {f.url ? (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground/90 hover:text-primary break-all inline-flex items-center gap-1"
                        >
                          {f.username ? `${f.username} — ` : ""}
                          {f.url}
                          <ExternalLink className="h-3 w-3 shrink-0 no-print" />
                        </a>
                      ) : (
                        <span className="text-foreground/90">
                          {f.username ?? f.tool_name ?? "(no detail)"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {report?.markdown ? (
          <section className="rounded-lg border border-border bg-surface p-6 print-card">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
              Full dossier
            </div>
            <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {report.markdown}
            </pre>
          </section>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-sm text-muted-foreground font-mono">
              Dossier not yet generated.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

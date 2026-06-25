import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInvestigation } from "@/lib/investigations.functions";
import { StatusBadge } from "@/components/vantage/StatusBadge";
import { IdentityGraph } from "@/components/vantage/IdentityGraph";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";

type GraphNode = { id: string; label?: string; type?: string };
type GraphEdge = { source: string; target: string; label?: string };

function buildFallbackGraph(target: string, findings: { platform?: string | null; url?: string | null; username?: string | null }[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/investigate/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to live view
        </Link>
        <button
          onClick={copy}
          disabled={!report?.markdown}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-surface-elevated disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5" /> Copy MD
        </button>
      </div>

      <header className="rounded-lg border border-border bg-surface p-6">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Dossier
        </div>
        <h1 className="mt-1 text-3xl font-bold font-mono">{investigation.target}</h1>
        <div className="mt-3 flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <StatusBadge status={investigation.status} />
          <span>{investigation.target_type.toUpperCase()}</span>
          <span>·</span>
          <span>{findings.length} findings</span>
        </div>
        {report?.summary && (
          <p className="mt-4 text-sm text-foreground/90">{report.summary}</p>
        )}
      </header>

      {(() => {
        const ig = (report?.identity_graph ?? null) as { nodes?: GraphNode[]; edges?: GraphEdge[] } | null;
        const graph = ig?.nodes?.length
          ? { nodes: ig.nodes, edges: ig.edges ?? [] }
          : buildFallbackGraph(investigation.target, findings);
        return <IdentityGraph nodes={graph.nodes} edges={graph.edges} />;
      })()}

      {report?.markdown ? (
        <pre className="rounded-lg border border-border bg-surface p-6 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
          {report.markdown}
        </pre>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-sm text-muted-foreground font-mono">
            Dossier not yet generated.
          </p>
        </div>
      )}
    </div>
  );
}

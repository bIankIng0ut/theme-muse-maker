import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getSharedReport } from "@/lib/shares.functions";
import { IdentityGraph } from "@/components/vantage/IdentityGraph";
import { Shield, ExternalLink } from "lucide-react";

type GraphNode = { id: string; label?: string; type?: string };
type GraphEdge = { source: string; target: string; label?: string };

export const Route = createFileRoute("/r/$token")({
  loader: async ({ params }) => {
    const res = await getSharedReport({ data: { token: params.token } });
    if (!res.found) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.found ? `Dossier — ${loaderData.target}` : "Dossier expired" },
      {
        name: "description",
        content: loaderData?.found
          ? `Shared Vantage OSINT dossier on ${loaderData.target}`
          : "This shared dossier has expired or been revoked.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <div className="text-sm font-mono text-destructive">Share link invalid or expired.</div>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline">
          Go home
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <div className="text-sm font-mono">This dossier is no longer available.</div>
        <div className="text-xs text-muted-foreground">The link expired or was revoked by its owner.</div>
        <Link to="/" className="text-xs text-primary hover:opacity-80 underline">
          Try Vantage
        </Link>
      </div>
    </div>
  ),
  component: SharedReportPage,
});

function SharedReportPage() {
  const data = Route.useLoaderData();
  if (!data.found) return null;

  const ig = data.identity_graph as { nodes?: GraphNode[]; edges?: GraphEdge[] } | null;
  const graph = ig?.nodes?.length
    ? { nodes: ig.nodes, edges: ig.edges ?? [] }
    : { nodes: [{ id: "root", label: data.target, type: "target" }], edges: [] };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Vantage
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Shared dossier · read-only
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Vantage Dossier
          </div>
          <h1 className="mt-1 text-3xl font-bold font-mono">{data.target}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
            <span>{data.target_type.toUpperCase()}</span>
            <span>·</span>
            <span>{data.finding_count} findings</span>
            <span>·</span>
            <span>{new Date(data.created_at).toLocaleDateString()}</span>
          </div>
          {data.summary && <p className="mt-4 text-sm text-foreground/90">{data.summary}</p>}
        </div>

        <IdentityGraph nodes={graph.nodes} edges={graph.edges} />

        {data.markdown ? (
          <section className="rounded-lg border border-border bg-surface p-6">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
              Dossier
            </div>
            <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {data.markdown}
            </pre>
          </section>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground font-mono">
            No dossier content available.
          </div>
        )}

        <footer className="pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Powered by Vantage OSINT</span>
          <a
            href="/"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Run your own investigation
            <ExternalLink className="h-3 w-3" />
          </a>
        </footer>
      </main>
    </div>
  );
}

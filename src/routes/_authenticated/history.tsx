import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listHistory,
  deleteInvestigation,
  rerunInvestigation,
} from "@/lib/investigations.functions";
import { StatusBadge } from "@/components/vantage/StatusBadge";
import { Trash2, FileSearch, RotateCcw, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type Row = {
  id: string;
  target: string;
  target_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

const STATUS_OPTIONS = ["all", "queued", "running", "done", "error"] as const;

function toCsv(rows: Row[]): string {
  const header = ["id", "target", "target_type", "status", "created_at", "completed_at"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    header.join(","),
    ...rows.map((r) => header.map((h) => esc(String((r as any)[h] ?? ""))).join(",")),
  ].join("\n");
}

function HistoryPage() {
  const list = useServerFn(listHistory);
  const del = useServerFn(deleteInvestigation);
  const rerun = useServerFn(rerunInvestigation);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");

  const query = useQuery({
    queryKey: ["history"],
    queryFn: () => list({ data: { limit: 100 } }),
  });

  const rows: Row[] = (query.data ?? []) as Row[];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (needle && !r.target.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, status]);

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const rerunMut = useMutation({
    mutationFn: (id: string) => rerun({ data: { id } }),
    onSuccess: (res: { id: string }) => {
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Re-running investigation");
      navigate({ to: "/investigate/$id", params: { id: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Re-run failed"),
  });

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vantage-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-mono">Investigation History</h1>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-mono hover:bg-surface-elevated"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by target..."
            className="w-full rounded-md border border-border bg-surface pl-8 pr-3 py-2 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-mono uppercase ${
                status === s
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-surface-elevated"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left">Target</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left">Started</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            )}
            {!query.isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                {rows.length === 0 ? "No investigations yet" : "No matches for these filters"}
              </td></tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-elevated">
                <td className="px-4 py-2.5 font-mono">{row.target}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground uppercase">
                  {row.target_type}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      to="/investigate/$id"
                      params={{ id: row.id }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                    >
                      <FileSearch className="h-3 w-3" /> View
                    </Link>
                    <button
                      onClick={() => rerunMut.mutate(row.id)}
                      disabled={rerunMut.isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-50"
                      title="Re-run same target"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => remove.mutate(row.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

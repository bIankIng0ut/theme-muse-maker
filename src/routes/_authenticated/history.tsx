import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHistory, deleteInvestigation } from "@/lib/investigations.functions";
import { StatusBadge } from "@/components/vantage/StatusBadge";
import { Trash2, FileSearch } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const list = useServerFn(listHistory);
  const del = useServerFn(deleteInvestigation);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["history"],
    queryFn: () => list({ data: { limit: 100 } }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold font-mono mb-6">Investigation History</h1>
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
            {q.isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            )}
            {q.data && q.data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No investigations yet</td></tr>
            )}
            {q.data?.map((row) => (
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

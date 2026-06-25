import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAccessKeys,
  createAccessKey,
  revokeAccessKey,
} from "@/lib/access-keys.functions";
import { toast } from "sonner";
import { Copy, Key, Plus, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/keys")({
  component: KeysPage,
});

function KeysPage() {
  const list = useServerFn(listAccessKeys);
  const create = useServerFn(createAccessKey);
  const revoke = useServerFn(revokeAccessKey);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["access-keys"], queryFn: () => list() });
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => create({ data: { label: label || undefined } }),
    onSuccess: (r) => {
      setNewKey(r.key);
      setLabel("");
      qc.invalidateQueries({ queryKey: ["access-keys"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Key revoked");
      qc.invalidateQueries({ queryKey: ["access-keys"] });
    },
  });

  const copy = async (s: string) => {
    await navigator.clipboard.writeText(s);
    toast.success("Copied");
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Access</div>
        <h1 className="text-2xl font-semibold tracking-tight mt-0.5">Access Keys</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Use an access key to log in without your email/password. Keys are tier-scoped and
          expire automatically: Free <strong>14 days</strong> · Pro <strong>90 days</strong> ·
          Ultra <strong>365 days</strong>.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <Plus className="h-3.5 w-3.5" />
          Generate new key
        </div>
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional) — e.g. laptop"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createMut.isPending ? "..." : "Generate"}
          </button>
        </div>

        {newKey && (
          <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-warning text-xs font-mono uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5" />
              Save this key now — you will not see it again
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-background px-3 py-2 text-sm font-mono break-all">{newKey}</code>
              <button
                onClick={() => copy(newKey)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-xs hover:bg-surface-elevated"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={() => setNewKey(null)} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
              I've saved it — dismiss
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <Key className="h-3.5 w-3.5" />
          Your keys
        </div>
        {q.isLoading ? (
          <div className="p-5 text-xs text-muted-foreground">Loading...</div>
        ) : !q.data?.length ? (
          <div className="p-5 text-xs text-muted-foreground">No keys yet.</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {q.data.map((k) => {
              const expired = new Date(k.expires_at).getTime() < Date.now();
              const revoked = !!k.revoked_at;
              return (
                <li key={k.id} className="px-5 py-3 flex items-center gap-3">
                  <code className="text-sm font-mono">{k.key_prefix}…</code>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{k.label ?? "Unlabeled"}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {revoked
                        ? `Revoked ${new Date(k.revoked_at!).toLocaleDateString()}`
                        : expired
                          ? `Expired ${new Date(k.expires_at).toLocaleDateString()}`
                          : `Expires ${new Date(k.expires_at).toLocaleDateString()} · ${k.tier}`}
                    </div>
                  </div>
                  {!revoked && (
                    <button
                      onClick={() => revokeMut.mutate(k.id)}
                      className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:border-destructive/50 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

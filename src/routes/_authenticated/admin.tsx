import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview, isCurrentUserAdmin } from "@/lib/roles.functions";
import { StatusBadge } from "@/components/vantage/StatusBadge";
import { Shield, ShieldAlert, Activity, KeyRound, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const overview = useServerFn(adminOverview);
  const gate = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });
  const data = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overview(),
    enabled: gate.data?.admin === true,
    refetchInterval: 15000,
  });

  if (gate.isLoading) {
    return <div className="text-muted-foreground font-mono text-sm">Checking access…</div>;
  }
  if (!gate.data?.admin) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <span className="font-mono uppercase text-sm">Access denied</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This console is restricted to Vantage administrators.
        </p>
      </div>
    );
  }

  const o = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold font-mono">Admin Console</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Activity} label="Done (24h)" value={o?.statusCounts.done ?? 0} />
        <Stat icon={Activity} label="Running (24h)" value={o?.statusCounts.running ?? 0} />
        <Stat icon={Activity} label="Errors (24h)" value={o?.statusCounts.error ?? 0} />
        <Stat icon={KeyRound} label="Banned keys" value={o?.bannedKeys.length ?? 0} />
      </div>

      <Panel title="Recent investigations (all users)" icon={Activity}>
        <table className="w-full text-xs">
          <thead className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-1.5">Target</th>
              <th className="text-left py-1.5">Type</th>
              <th className="text-left py-1.5">Status</th>
              <th className="text-left py-1.5">Owner</th>
              <th className="text-left py-1.5">When</th>
            </tr>
          </thead>
          <tbody>
            {o?.recentInvestigations.map((r: any) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="py-1.5 font-mono truncate max-w-[240px]">{r.target}</td>
                <td className="py-1.5 font-mono text-muted-foreground uppercase text-[10px]">{r.target_type}</td>
                <td className="py-1.5"><StatusBadge status={r.status} /></td>
                <td className="py-1.5 font-mono text-muted-foreground text-[10px]">{String(r.owner_id).slice(0, 8)}…</td>
                <td className="py-1.5 text-muted-foreground text-[10px]">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Auto-banned keys" icon={KeyRound}>
        {o?.bannedKeys.length === 0 ? (
          <div className="text-xs text-muted-foreground">None.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-1.5">Prefix</th>
                <th className="text-left py-1.5">Tier</th>
                <th className="text-left py-1.5">Owner</th>
                <th className="text-left py-1.5">Revoked</th>
              </tr>
            </thead>
            <tbody>
              {o?.bannedKeys.map((k: any) => (
                <tr key={k.id} className="border-t border-border/60">
                  <td className="py-1.5 font-mono">{k.key_prefix}</td>
                  <td className="py-1.5 font-mono uppercase text-[10px]">{k.tier}</td>
                  <td className="py-1.5 font-mono text-muted-foreground text-[10px]">{String(k.user_id).slice(0, 8)}…</td>
                  <td className="py-1.5 text-muted-foreground text-[10px]">{k.revoked_at ? new Date(k.revoked_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Suspicious IP clusters (last hour, ≥2 distinct IPs / key)" icon={ShieldAlert}>
        {o?.ipClusters.length === 0 ? (
          <div className="text-xs text-muted-foreground">No abuse patterns right now.</div>
        ) : (
          <ul className="text-xs font-mono space-y-1">
            {o?.ipClusters.map((c: any) => (
              <li key={c.key_id} className="flex justify-between">
                <span>key {String(c.key_id).slice(0, 8)}…</span>
                <span className="text-warning">{c.distinct_ips} IPs</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Top quota consumers (current window)" icon={Users}>
        <table className="w-full text-xs">
          <thead className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-1.5">User</th>
              <th className="text-left py-1.5">Plan</th>
              <th className="text-left py-1.5">Used</th>
              <th className="text-left py-1.5">Window start</th>
            </tr>
          </thead>
          <tbody>
            {o?.topQuota.map((u: any) => (
              <tr key={u.user_id} className="border-t border-border/60">
                <td className="py-1.5 font-mono text-[10px]">{String(u.user_id).slice(0, 8)}…</td>
                <td className="py-1.5 font-mono uppercase text-[10px]">{u.plan}</td>
                <td className="py-1.5 font-mono">{u.nightly_count}</td>
                <td className="py-1.5 text-muted-foreground text-[10px]">{new Date(u.nightly_window_start).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-2xl font-mono font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      {children}
    </section>
  );
}

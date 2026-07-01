import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) return { admin: false };
    return { admin: Boolean(data) };
  });

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("forbidden");
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [invRecent, invStatus, keysBanned, keyUses, quotas] = await Promise.all([
      supabaseAdmin
        .from("investigations")
        .select("id, owner_id, target, target_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("investigations")
        .select("status")
        .gte("created_at", dayAgo),
      supabaseAdmin
        .from("access_keys")
        .select("id, key_prefix, user_id, tier, revoked_at, last_used_at, created_at")
        .not("revoked_at", "is", null)
        .order("revoked_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("access_key_uses")
        .select("key_id, ip_hash, used_at")
        .gte("used_at", hourAgo)
        .limit(500),
      supabaseAdmin
        .from("user_settings")
        .select("user_id, plan, nightly_count, nightly_window_start")
        .order("nightly_count", { ascending: false })
        .limit(20),
    ]);

    // Build IP clusters: keys hit by >=2 distinct IPs in last hour
    const perKey = new Map<string, Set<string>>();
    for (const u of keyUses.data ?? []) {
      if (!perKey.has(u.key_id)) perKey.set(u.key_id, new Set());
      perKey.get(u.key_id)!.add(u.ip_hash);
    }
    const clusters = Array.from(perKey.entries())
      .map(([key_id, ips]) => ({ key_id, distinct_ips: ips.size }))
      .filter((c) => c.distinct_ips >= 2)
      .sort((a, b) => b.distinct_ips - a.distinct_ips)
      .slice(0, 20);

    const statusCounts: Record<string, number> = {};
    for (const r of invStatus.data ?? []) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    }

    return {
      recentInvestigations: invRecent.data ?? [],
      statusCounts,
      bannedKeys: keysBanned.data ?? [],
      ipClusters: clusters,
      topQuota: quotas.data ?? [],
    };
  });

export const grantAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(["admin", "moderator", "user"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

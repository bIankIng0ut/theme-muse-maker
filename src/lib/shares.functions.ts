import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DAY = 24 * 60 * 60 * 1000;
const SHARE_DAILY_LIMIT = 20;
const DEFAULT_TTL_DAYS = 7;
const MAX_TTL_DAYS = 30;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // URL-safe base64
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const CreateInput = z.object({
  investigation_id: z.string().uuid(),
  ttl_days: z.number().int().min(1).max(MAX_TTL_DAYS).default(DEFAULT_TTL_DAYS),
});

export const createReportShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Rate limit: 20/day per user
    const since = new Date(Date.now() - DAY).toISOString();
    const { count, error: countErr } = await supabase
      .from("share_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .gte("created_at", since);
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) >= SHARE_DAILY_LIMIT) {
      throw new Error("share_rate_limit_reached");
    }

    // Ownership check via RLS
    const { data: inv, error: invErr } = await supabase
      .from("investigations")
      .select("id, status")
      .eq("id", data.investigation_id)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!inv) throw new Error("not_found");

    const token = randomToken();
    const token_hash = await sha256Hex(token);
    const expires_at = new Date(Date.now() + data.ttl_days * DAY).toISOString();

    const { data: row, error } = await supabase
      .from("report_shares")
      .insert({
        investigation_id: data.investigation_id,
        owner_id: userId,
        token_hash,
        expires_at,
      })
      .select("id, expires_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "insert_failed");

    await supabase.from("share_rate_limits").insert({ owner_id: userId });

    return { id: row.id, token, expires_at: row.expires_at };
  });

const ListInput = z.object({ investigation_id: z.string().uuid() });

export const listReportShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("report_shares")
      .select("id, expires_at, revoked_at, view_count, created_at")
      .eq("investigation_id", data.investigation_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const RevokeInput = z.object({ id: z.string().uuid() });

export const revokeReportShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RevokeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("report_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TokenInput = z.object({ token: z.string().min(8).max(64) });

export const getSharedReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => TokenInput.parse(data))
  .handler(async ({ data }) => {
    const token_hash = await sha256Hex(data.token);
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await client.rpc("get_shared_report", {
      _token_hash: token_hash,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { found: false as const };
    return {
      found: true as const,
      target: row.investigation_target as string,
      target_type: row.investigation_target_type as string,
      created_at: row.investigation_created_at as string,
      markdown: (row.report_markdown as string | null) ?? null,
      summary: (row.report_summary as string | null) ?? null,
      identity_graph: (row.report_identity_graph as unknown) ?? null,
      finding_count: Number(row.finding_count ?? 0),
    };
  });

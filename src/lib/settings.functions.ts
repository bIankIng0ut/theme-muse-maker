import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NIGHTLY_LIMIT = 15;
const WINDOW_MS = 24 * 60 * 60 * 1000;

async function ensureRow(supabase: any, userId: string) {
  const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: inserted, error } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return inserted;
}

function computeQuota(row: { nightly_count: number; nightly_window_start: string }) {
  const start = new Date(row.nightly_window_start).getTime();
  const expired = Date.now() - start > WINDOW_MS;
  const used = expired ? 0 : row.nightly_count;
  const resetsAt = new Date((expired ? Date.now() : start) + WINDOW_MS).toISOString();
  return { used, limit: NIGHTLY_LIMIT, remaining: Math.max(0, NIGHTLY_LIMIT - used), resetsAt };
}

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const row = await ensureRow(supabase, userId);
    return {
      plan: row.plan as "free" | "pro" | "ultra",
      quota: computeQuota(row),
    };
  });

export async function consumeQuotaOrThrow(supabase: any, userId: string) {
  const row = await ensureRow(supabase, userId);
  if (row.plan === "pro" || row.plan === "ultra") return;
  const q = computeQuota(row);
  if (q.remaining <= 0) {
    throw new Error("nightly_limit_reached");
  }
  const start = new Date(row.nightly_window_start).getTime();
  const expired = Date.now() - start > WINDOW_MS;
  const { error } = await supabase
    .from("user_settings")
    .update({
      nightly_count: expired ? 1 : row.nightly_count + 1,
      nightly_window_start: expired ? new Date().toISOString() : row.nightly_window_start,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

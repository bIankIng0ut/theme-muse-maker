import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NIGHTLY_LIMIT = 15;
const WINDOW_MS = 24 * 60 * 60 * 1000;

const ByoKeysSchema = z.object({
  openai: z.string().trim().max(256).optional().default(""),
  anthropic: z.string().trim().max(256).optional().default(""),
  gemini: z.string().trim().max(256).optional().default(""),
  openrouter: z.string().trim().max(256).optional().default(""),
  openrouter_model: z.string().trim().max(128).optional().default(""),
  scrapingant: z.string().trim().max(256).optional().default(""),
  hibp: z.string().trim().max(256).optional().default(""),
  serpapi: z.string().trim().max(256).optional().default(""),
});
export type ByoKeys = z.infer<typeof ByoKeysSchema>;

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
    const keys = ByoKeysSchema.parse(row.byo_keys ?? {});
    const masked = Object.fromEntries(
      Object.entries(keys).map(([k, v]) => [k, v ? `${"•".repeat(Math.min(20, Math.max(0, v.length - 4)))}${v.slice(-4)}` : ""]),
    ) as ByoKeys;
    return {
      plan: row.plan as "free" | "pro",
      keys: masked,
      hasAnyKey: Object.values(keys).some((v) => v && v.length > 0),
      quota: computeQuota(row),
    };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ keys: ByoKeysSchema.partial() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = await ensureRow(supabase, userId);
    const current = ByoKeysSchema.parse(row.byo_keys ?? {});
    const merged: ByoKeys = { ...current };
    for (const [k, v] of Object.entries(data.keys)) {
      if (typeof v === "string" && !v.startsWith("•")) {
        (merged as Record<string, string>)[k] = v.trim();
      }
    }
    const { error } = await supabase
      .from("user_settings")
      .update({ byo_keys: merged as never })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export async function consumeQuotaOrThrow(supabase: any, userId: string) {
  const row = await ensureRow(supabase, userId);
  if (row.plan === "pro") return;
  const keys = ByoKeysSchema.parse(row.byo_keys ?? {});
  const hasKey = Object.values(keys).some((v) => v && v.length > 0);
  if (!hasKey) {
    throw new Error("byo_key_required");
  }
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

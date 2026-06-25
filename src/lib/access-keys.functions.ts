import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Tier = "free" | "pro" | "ultra";

const DAYS: Record<Tier, number> = { free: 14, pro: 90, ultra: 365 };

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `vk_${out.slice(0, 8)}_${out.slice(8, 16)}_${out.slice(16, 24)}`;
}

export const listAccessKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("access_keys")
      .select("id, key_prefix, label, tier, expires_at, revoked_at, last_used_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAccessKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ label: z.string().trim().max(80).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const settings = await supabase.from("user_settings").select("plan").eq("user_id", userId).maybeSingle();
    const tier = (settings.data?.plan ?? "free") as Tier;
    const days = DAYS[tier] ?? DAYS.free;
    const key = randomKey();
    const key_hash = await sha256(key);
    const key_prefix = key.slice(0, 11);
    const expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("access_keys").insert({
      user_id: userId,
      key_hash,
      key_prefix,
      label: data.label ?? null,
      tier,
      expires_at,
    });
    if (error) throw new Error(error.message);
    return { key, expires_at, tier };
  });

export const revokeAccessKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("access_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const loginWithAccessKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ key: z.string().trim().min(10).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key_hash = await sha256(data.key);
    const { data: row, error } = await supabaseAdmin
      .from("access_keys")
      .select("id, user_id, expires_at, revoked_at")
      .eq("key_hash", key_hash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Invalid access key");
    if (row.revoked_at) throw new Error("This key has been revoked");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("This key has expired");

    const userRes = await supabaseAdmin.auth.admin.getUserById(row.user_id);
    if (userRes.error || !userRes.data.user?.email) throw new Error("User not available");

    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userRes.data.user.email,
    });
    if (linkRes.error || !linkRes.data?.properties?.action_link) {
      throw new Error(linkRes.error?.message ?? "Could not mint session");
    }
    await supabaseAdmin
      .from("access_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id);
    return { actionLink: linkRes.data.properties.action_link };
  });

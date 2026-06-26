import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const markVaultcordVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) {
      await supabase.from("user_settings").insert({ user_id: userId });
    }
    const { error } = await supabase
      .from("user_settings")
      .update({
        discord_username: "vaultcord-verified",
        discord_verified_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

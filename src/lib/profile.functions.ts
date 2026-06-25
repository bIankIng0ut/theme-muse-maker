import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data } = await supabase
      .from("user_settings")
      .select("plan, discord_id, discord_username, discord_verified_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) {
      const inserted = await supabase.from("user_settings").insert({ user_id: userId }).select("plan, discord_id, discord_username, discord_verified_at").single();
      data = inserted.data;
    }
    return {
      userId,
      plan: (data?.plan ?? "free") as "free" | "pro" | "ultra",
      discord: {
        id: data?.discord_id ?? null,
        username: data?.discord_username ?? null,
        verifiedAt: data?.discord_verified_at ?? null,
      },
    };
  });

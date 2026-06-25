import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!clientId || !clientSecret || !guildId) {
          return new Response("Discord not configured", { status: 500 });
        }
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return new Response("Missing code", { status: 400 });

        let userId: string;
        try {
          userId = JSON.parse(atob(state)).userId;
          if (typeof userId !== "string") throw new Error();
        } catch {
          return new Response("Bad state", { status: 400 });
        }

        const redirect_uri = `${url.origin}/api/public/discord/callback`;
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri,
          }),
        });
        if (!tokenRes.ok) {
          return Response.redirect(`${url.origin}/dashboard?discord=token_failed`, 302);
        }
        const token = (await tokenRes.json()) as { access_token: string };

        const [meRes, guildsRes] = await Promise.all([
          fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` } }),
          fetch("https://discord.com/api/users/@me/guilds", { headers: { Authorization: `Bearer ${token.access_token}` } }),
        ]);
        if (!meRes.ok || !guildsRes.ok) {
          return Response.redirect(`${url.origin}/dashboard?discord=lookup_failed`, 302);
        }
        const me = (await meRes.json()) as { id: string; username: string };
        const guilds = (await guildsRes.json()) as Array<{ id: string }>;
        const isMember = guilds.some((g) => g.id === guildId);
        if (!isMember) {
          return Response.redirect(`${url.origin}/dashboard?discord=not_member`, 302);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // ensure row exists
        const { data: existing } = await supabaseAdmin
          .from("user_settings")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!existing) {
          await supabaseAdmin.from("user_settings").insert({ user_id: userId });
        }
        const { error } = await supabaseAdmin
          .from("user_settings")
          .update({
            discord_id: me.id,
            discord_username: me.username,
            discord_verified_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (error) {
          return Response.redirect(`${url.origin}/dashboard?discord=save_failed`, 302);
        }
        return Response.redirect(`${url.origin}/dashboard?discord=verified`, 302);
      },
    },
  },
});

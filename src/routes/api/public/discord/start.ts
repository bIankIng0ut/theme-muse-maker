import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/discord/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.DISCORD_CLIENT_ID;
        if (!clientId) return new Response("Discord not configured", { status: 500 });
        const url = new URL(request.url);
        const userId = url.searchParams.get("u");
        if (!userId) return new Response("Missing user", { status: 400 });
        const origin = url.origin;
        const redirect = `${origin}/api/public/discord/callback`;
        const state = btoa(JSON.stringify({ userId, nonce: crypto.randomUUID() }));
        const authUrl = new URL("https://discord.com/oauth2/authorize");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "identify guilds");
        authUrl.searchParams.set("redirect_uri", redirect);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("prompt", "consent");
        return Response.redirect(authUrl.toString(), 302);
      },
    },
  },
});

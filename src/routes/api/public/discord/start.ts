import { createFileRoute } from "@tanstack/react-router";

function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signState(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

export const Route = createFileRoute("/api/public/discord/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const stateSecret = process.env.DISCORD_OAUTH_STATE_SECRET;
        if (!clientId || !stateSecret) return new Response("Discord not configured", { status: 500 });
        const url = new URL(request.url);
        const userId = url.searchParams.get("u");
        if (!userId) return new Response("Missing user", { status: 400 });

        const nonceBytes = new Uint8Array(16);
        crypto.getRandomValues(nonceBytes);
        const payload = btoa(JSON.stringify({ userId, nonce: b64url(nonceBytes), ts: Date.now() }))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const sig = await signState(payload, stateSecret);
        const state = `${payload}.${sig}`;

        const origin = url.origin;
        const redirect = `${origin}/api/public/discord/callback`;
        const authUrl = new URL("https://discord.com/oauth2/authorize");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "identify guilds guilds.members.read");
        authUrl.searchParams.set("redirect_uri", redirect);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("prompt", "consent");
        return Response.redirect(authUrl.toString(), 302);
      },
    },
  },
});

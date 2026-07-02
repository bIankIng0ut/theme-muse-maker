// Discord DM notifications for terminal investigation states.
// Silently no-ops when the bot token is missing or the user's DMs are closed —
// notifications are best-effort, never runner-blocking.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function fetchWithTimeout(url: string, ms = 6000, init?: RequestInit) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function openDmChannel(botToken: string, recipientId: string): Promise<string | null> {
  const r = await fetchWithTimeout("https://discord.com/api/v10/users/@me/channels", 6000, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: recipientId }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { id?: string };
  return j.id ?? null;
}

async function sendMessage(botToken: string, channelId: string, payload: unknown): Promise<boolean> {
  const r = await fetchWithTimeout(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    6000,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return r.ok;
}

export async function notifyInvestigationComplete(args: {
  investigationId: string;
  ownerId: string;
  target: string;
  targetType: string;
  status: "done" | "error";
  findingCount: number;
  errorMessage?: string | null;
}): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return;

  try {
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("discord_id")
      .eq("user_id", args.ownerId)
      .maybeSingle();
    const discordId = settings?.discord_id;
    if (!discordId) return;

    const channelId = await openDmChannel(token, discordId);
    if (!channelId) return;

    const success = args.status === "done";
    const embed = {
      title: success ? "Investigation complete" : "Investigation halted",
      description: `**Target:** \`${args.target}\`\n**Type:** \`${args.targetType}\`\n**Findings:** ${args.findingCount}${
        args.errorMessage ? `\n\n> ${args.errorMessage.slice(0, 300)}` : ""
      }`,
      color: success ? 0x22c55e : 0xef4444,
      timestamp: new Date().toISOString(),
      footer: { text: "Vantage OSINT" },
    };

    await sendMessage(token, channelId, {
      content: success ? "Your Vantage dossier is ready." : "Vantage stopped early on your run.",
      embeds: [embed],
    });
  } catch (e) {
    console.error("[notify]", e instanceof Error ? e.message : String(e));
  }
}

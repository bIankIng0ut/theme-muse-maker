import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PROFILE_TEMPLATES, isValidUsername } from "./profile-templates.server";
import { callLlm } from "./llm.server";

export type ToolHandler = (
  input: Record<string, unknown>,
  ctx: { investigationId: string; ownerId: string },
) => Promise<{ status: "ok" | "not_implemented" | "error"; data?: unknown; note?: string }>;

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: ToolHandler;
};

const UA = "Mozilla/5.0 (compatible; VantageOSINT/1.0; +https://vantage.osint)";

async function fetchWithTimeout(url: string, ms = 8000, init?: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      redirect: "follow",
      signal: ctl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/json,*/*",
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

async function insertFinding(args: {
  investigationId: string;
  toolName: string;
  platform?: string | null;
  url?: string | null;
  username?: string | null;
  confidence?: "high" | "medium" | "low";
  raw?: unknown;
}) {
  const { error } = await supabaseAdmin.from("findings").insert({
    investigation_id: args.investigationId,
    tool_name: args.toolName,
    platform: args.platform ?? null,
    url: args.url ?? null,
    username: args.username ?? null,
    confidence: args.confidence ?? "medium",
    raw_data: (args.raw ?? null) as never,
  });
  if (error) console.error("[findings.insert]", error.message);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const buf = await crypto.subtle.digest("SHA-256", ab);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --------------------------- handlers ---------------------------

const searchUsernameHandler: ToolHandler = async (input, ctx) => {
  const username = String(input.username ?? "").trim();
  if (!isValidUsername(username)) return { status: "error", note: "invalid_username" };
  const max = Math.min(Number(input.max_sites ?? PROFILE_TEMPLATES.length), PROFILE_TEMPLATES.length);
  const list = PROFILE_TEMPLATES.slice(0, max);

  let hits = 0;
  await Promise.all(
    list.map(async (tpl) => {
      const url = tpl.url.replace("{u}", encodeURIComponent(username));
      try {
        const res = await fetchWithTimeout(url, 7000);
        if (tpl.notFoundStatus?.includes(res.status)) return;
        if (res.status >= 400) return;
        if (tpl.notFoundText && tpl.notFoundText.length) {
          const body = (await res.text()).toLowerCase();
          if (tpl.notFoundText.some((s) => body.includes(s))) return;
        }
        hits++;
        await insertFinding({
          investigationId: ctx.investigationId,
          toolName: "search_username",
          platform: tpl.platform,
          url,
          username,
          confidence: "medium",
          raw: { status: res.status },
        });
      } catch {
        /* ignore */
      }
    }),
  );
  return { status: "ok", data: { checked: list.length, hits } };
};

const scrapeUrlHandler: ToolHandler = async (input, ctx) => {
  const url = String(input.url ?? "");
  if (!/^https?:\/\//.test(url)) return { status: "error", note: "invalid_url" };
  try {
    const res = await fetchWithTimeout(url, 12000);
    const text = (await res.text()).slice(0, 4000);
    const title = /<title[^>]*>([^<]+)<\/title>/i.exec(text)?.[1]?.trim() ?? null;
    await insertFinding({
      investigationId: ctx.investigationId,
      toolName: "scrape_url",
      url,
      platform: new URL(url).hostname,
      confidence: "low",
      raw: { status: res.status, title, snippet: text.replace(/<[^>]+>/g, " ").slice(0, 500) },
    });
    return { status: "ok", data: { status: res.status, title } };
  } catch (e) {
    return { status: "error", note: e instanceof Error ? e.message : "fetch_failed" };
  }
};

const lookupRobloxHandler: ToolHandler = async (input, ctx) => {
  const username = input.roblox_username ? String(input.roblox_username) : null;
  const userId = input.roblox_id ? Number(input.roblox_id) : null;
  try {
    let id = userId;
    let profile: { id: number; name: string; displayName?: string; description?: string } | null = null;
    if (!id && username) {
      const res = await fetchWithTimeout("https://users.roblox.com/v1/usernames/users", 8000, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      });
      const json = (await res.json()) as { data?: Array<{ id: number; name: string; displayName: string }> };
      if (json.data && json.data[0]) {
        profile = json.data[0];
        id = profile.id;
      }
    }
    if (id) {
      const res = await fetchWithTimeout(`https://users.roblox.com/v1/users/${id}`, 8000);
      if (res.ok) profile = (await res.json()) as typeof profile;
    }
    if (!profile || !id) return { status: "ok", data: { found: false } };

    // grab thumbnail too
    let avatarUrl: string | null = null;
    try {
      const tr = await fetchWithTimeout(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png`,
        6000,
      );
      const tj = (await tr.json()) as { data?: Array<{ imageUrl?: string }> };
      avatarUrl = tj.data?.[0]?.imageUrl ?? null;
    } catch {
      /* ignore */
    }

    await insertFinding({
      investigationId: ctx.investigationId,
      toolName: "lookup_roblox",
      platform: "Roblox",
      url: `https://www.roblox.com/users/${id}/profile`,
      username: profile.name,
      confidence: "high",
      raw: { ...profile, avatarUrl, robloxId: id },
    });
    return { status: "ok", data: { found: true, id, name: profile.name, avatarUrl } };
  } catch (e) {
    return { status: "error", note: e instanceof Error ? e.message : "roblox_failed" };
  }
};

const lookupDiscordHandler: ToolHandler = async (input, ctx) => {
  const id = String(input.discord_id ?? "");
  if (!/^\d{5,30}$/.test(id)) return { status: "error", note: "invalid_discord_id" };
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { status: "not_implemented", note: "DISCORD_BOT_TOKEN not configured" };
  try {
    const res = await fetchWithTimeout(`https://discord.com/api/v10/users/${id}`, 8000, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (res.status === 404) return { status: "ok", data: { found: false } };
    if (!res.ok) return { status: "error", note: `discord_${res.status}` };
    const user = (await res.json()) as {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
    };
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
      : null;
    await insertFinding({
      investigationId: ctx.investigationId,
      toolName: "lookup_discord",
      platform: "Discord",
      url: `https://discord.com/users/${user.id}`,
      username: user.global_name ?? user.username,
      confidence: "high",
      raw: { ...user, avatarUrl },
    });
    return { status: "ok", data: { found: true, username: user.username, avatarUrl } };
  } catch (e) {
    return { status: "error", note: e instanceof Error ? e.message : "discord_failed" };
  }
};

const generateDorksHandler: ToolHandler = async (input, ctx) => {
  const target = String(input.target_name ?? "");
  if (!target) return { status: "error", note: "missing_target" };
  try {
    const r = await callLlm(ctx.ownerId, [
      {
        role: "system",
        content:
          "You are an OSINT analyst. Output 8 Google dork queries (one per line, no numbering, no commentary) that would surface profiles, leaks, or mentions of the given target. Each query must be a single line of valid Google search syntax.",
      },
      { role: "user", content: `Target: ${target}` },
    ]);
    const dorks = r.text
      .split("\n")
      .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
      .filter((l) => l.length > 4 && l.length < 200)
      .slice(0, 8);
    for (const d of dorks) {
      await insertFinding({
        investigationId: ctx.investigationId,
        toolName: "generate_dorks",
        platform: "Google Dork",
        url: `https://www.google.com/search?q=${encodeURIComponent(d)}`,
        confidence: "low",
        raw: { query: d },
      });
    }
    return { status: "ok", data: { count: dorks.length, dorks } };
  } catch (e) {
    return { status: "error", note: e instanceof Error ? e.message : "dorks_failed" };
  }
};

// --- Cross-platform correlation ---

const DISCORD_PATTERNS = [
  /discord(?:app)?\.com\/users\/(\d{5,30})/i,
  /discord\.gg\/([a-z0-9-]{2,20})/i,
  /(?:discord|dc)\s*[:=#-]\s*([a-z0-9._]{2,32})/i,
];

const robloxToDiscordHandler: ToolHandler = async (input, ctx) => {
  const id = Number(input.roblox_id);
  if (!Number.isFinite(id) || id <= 0) return { status: "error", note: "invalid_roblox_id" };
  try {
    const res = await fetchWithTimeout(`https://users.roblox.com/v1/users/${id}`, 8000);
    if (!res.ok) return { status: "ok", data: { found: false } };
    const profile = (await res.json()) as { description?: string; name?: string };
    const desc = profile.description ?? "";
    const matches: string[] = [];
    for (const re of DISCORD_PATTERNS) {
      const m = desc.match(re);
      if (m) matches.push(m[1]);
    }
    if (matches.length === 0) return { status: "ok", data: { found: false } };
    for (const handle of matches) {
      await insertFinding({
        investigationId: ctx.investigationId,
        toolName: "roblox_to_discord",
        platform: "Discord (linked)",
        url: /^\d+$/.test(handle) ? `https://discord.com/users/${handle}` : null,
        username: handle,
        confidence: "medium",
        raw: { source: "roblox_profile_description", robloxId: id, handle },
      });
    }
    return { status: "ok", data: { found: true, matches } };
  } catch (e) {
    return { status: "error", note: e instanceof Error ? e.message : "correlate_failed" };
  }
};

const discordToRobloxHandler: ToolHandler = async (input, ctx) => {
  const id = String(input.discord_id ?? "");
  if (!/^\d{5,30}$/.test(id)) return { status: "error", note: "invalid_discord_id" };
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { status: "not_implemented", note: "DISCORD_BOT_TOKEN not configured" };
  try {
    const ures = await fetchWithTimeout(`https://discord.com/api/v10/users/${id}`, 8000, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!ures.ok) return { status: "ok", data: { found: false } };
    const user = (await ures.json()) as { username: string; global_name?: string };
    const candidates = [user.username, user.global_name].filter(Boolean) as string[];
    const hits: { username: string; robloxId: number }[] = [];
    for (const u of candidates) {
      const r = await fetchWithTimeout("https://users.roblox.com/v1/usernames/users", 8000, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [u], excludeBannedUsers: false }),
      });
      const j = (await r.json()) as { data?: Array<{ id: number; name: string }> };
      if (j.data?.[0]) hits.push({ username: j.data[0].name, robloxId: j.data[0].id });
    }
    if (hits.length === 0) return { status: "ok", data: { found: false } };
    for (const h of hits) {
      await insertFinding({
        investigationId: ctx.investigationId,
        toolName: "discord_to_roblox",
        platform: "Roblox (name match)",
        url: `https://www.roblox.com/users/${h.robloxId}/profile`,
        username: h.username,
        confidence: "medium",
        raw: { source: "discord_username_match", discordId: id, ...h },
      });
    }
    return { status: "ok", data: { found: true, hits } };
  } catch (e) {
    return { status: "error", note: e instanceof Error ? e.message : "correlate_failed" };
  }
};

const hashAvatarHandler: ToolHandler = async (input, ctx) => {
  const url = String(input.image_url ?? "");
  if (!/^https?:\/\//.test(url)) return { status: "error", note: "invalid_url" };
  try {
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return { status: "error", note: `fetch_${res.status}` };
    const bytes = new Uint8Array(await res.arrayBuffer());
    const hash = await sha256Hex(bytes);
    const short = hash.slice(0, 16);
    await insertFinding({
      investigationId: ctx.investigationId,
      toolName: "hash_avatar",
      platform: "Avatar Hash",
      url,
      username: short,
      confidence: "low",
      raw: { url, sha256: hash, bytes: bytes.length },
    });
    return { status: "ok", data: { sha256: hash, short } };
  } catch (e) {
    return { status: "error", note: e instanceof Error ? e.message : "hash_failed" };
  }
};

// --- Email intel: gravatar + disposable domain + MX via DoH ---

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","tempmail.com","10minutemail.com","guerrillamail.com","yopmail.com",
  "trashmail.com","throwawaymail.com","fakeinbox.com","getnada.com","maildrop.cc",
  "sharklasers.com","dispostable.com","mintemail.com","emailondeck.com","tempr.email",
  "spam4.me","mohmal.com","tempinbox.com","mytemp.email","mailnesia.com",
]);

async function md5Hex(text: string): Promise<string> {
  // Web Crypto has no MD5, tiny inline impl (RFC 1321) — used only for gravatar.
  function toHex(n: number) { return ("00000000" + (n >>> 0).toString(16)).slice(-8).match(/../g)!.reverse().join(""); }
  function add32(a: number, b: number) { return (a + b) & 0xffffffff; }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  const bytes = new TextEncoder().encode(text);
  const nBits = bytes.length * 8;
  const withPad = new Uint8Array(((bytes.length + 8) >> 6 << 6) + 64);
  withPad.set(bytes);
  withPad[bytes.length] = 0x80;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 8, nBits >>> 0, true);
  dv.setUint32(withPad.length - 4, Math.floor(nBits / 0x100000000), true);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < withPad.length; i += 64) {
    const x = new Array(16);
    for (let j = 0; j < 16; j++) x[j] = dv.getInt32(i + j * 4, true);
    const [aa, bb, cc, dd] = [a, b, c, d];
    a = ff(a, b, c, d, x[0], 7, -680876936); d = ff(d, a, b, c, x[1], 12, -389564586); c = ff(c, d, a, b, x[2], 17, 606105819); b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897); d = ff(d, a, b, c, x[5], 12, 1200080426); c = ff(c, d, a, b, x[6], 17, -1473231341); b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416); d = ff(d, a, b, c, x[9], 12, -1958414417); c = ff(c, d, a, b, x[10], 17, -42063); b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682); d = ff(d, a, b, c, x[13], 12, -40341101); c = ff(c, d, a, b, x[14], 17, -1502002290); b = ff(b, c, d, a, x[15], 22, 1236535329);
    a = gg(a, b, c, d, x[1], 5, -165796510); d = gg(d, a, b, c, x[6], 9, -1069501632); c = gg(c, d, a, b, x[11], 14, 643717713); b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691); d = gg(d, a, b, c, x[10], 9, 38016083); c = gg(c, d, a, b, x[15], 14, -660478335); b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438); d = gg(d, a, b, c, x[14], 9, -1019803690); c = gg(c, d, a, b, x[3], 14, -187363961); b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467); d = gg(d, a, b, c, x[2], 9, -51403784); c = gg(c, d, a, b, x[7], 14, 1735328473); b = gg(b, c, d, a, x[12], 20, -1926607734);
    a = hh(a, b, c, d, x[5], 4, -378558); d = hh(d, a, b, c, x[8], 11, -2022574463); c = hh(c, d, a, b, x[11], 16, 1839030562); b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060); d = hh(d, a, b, c, x[4], 11, 1272893353); c = hh(c, d, a, b, x[7], 16, -155497632); b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174); d = hh(d, a, b, c, x[0], 11, -358537222); c = hh(c, d, a, b, x[3], 16, -722521979); b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487); d = hh(d, a, b, c, x[12], 11, -421815835); c = hh(c, d, a, b, x[15], 16, 530742520); b = hh(b, c, d, a, x[2], 23, -995338651);
    a = ii(a, b, c, d, x[0], 6, -198630844); d = ii(d, a, b, c, x[7], 10, 1126891415); c = ii(c, d, a, b, x[14], 15, -1416354905); b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571); d = ii(d, a, b, c, x[3], 10, -1894986606); c = ii(c, d, a, b, x[10], 15, -1051523); b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359); d = ii(d, a, b, c, x[15], 10, -30611744); c = ii(c, d, a, b, x[6], 15, -1560198380); b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070); d = ii(d, a, b, c, x[11], 10, -1120210379); c = ii(c, d, a, b, x[2], 15, 718787259); b = ii(b, c, d, a, x[9], 21, -343485551);
    a = add32(a, aa); b = add32(b, bb); c = add32(c, cc); d = add32(d, dd);
  }
  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

const checkBreachHandler: ToolHandler = async (input, ctx) => {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", note: "invalid_email" };
  const domain = email.split("@")[1];
  const disposable = DISPOSABLE_DOMAINS.has(domain);

  // Gravatar
  const gravHash = await md5Hex(email);
  let hasGravatar = false;
  let gravatarUrl: string | null = null;
  try {
    const gRes = await fetchWithTimeout(`https://www.gravatar.com/avatar/${gravHash}?d=404`, 6000);
    if (gRes.ok) {
      hasGravatar = true;
      gravatarUrl = `https://www.gravatar.com/avatar/${gravHash}?s=256`;
    }
  } catch { /* ignore */ }

  // MX via Cloudflare DoH
  let mxRecords: string[] = [];
  try {
    const dRes = await fetchWithTimeout(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      6000,
      { headers: { Accept: "application/dns-json" } },
    );
    if (dRes.ok) {
      const dj = (await dRes.json()) as { Answer?: Array<{ data: string }> };
      mxRecords = (dj.Answer ?? []).map((a) => a.data).slice(0, 5);
    }
  } catch { /* ignore */ }
  const deliverable = mxRecords.length > 0;

  await insertFinding({
    investigationId: ctx.investigationId,
    toolName: "check_breach",
    platform: "Email Intel",
    url: gravatarUrl,
    username: email,
    confidence: hasGravatar ? "high" : deliverable ? "medium" : "low",
    raw: { email, domain, disposable, deliverable, hasGravatar, gravatarUrl, mxRecords, gravHash },
  });

  if (hasGravatar && gravatarUrl) {
    await insertFinding({
      investigationId: ctx.investigationId,
      toolName: "check_breach",
      platform: "Gravatar",
      url: `https://gravatar.com/${gravHash}`,
      username: email,
      confidence: "high",
      raw: { avatarUrl: gravatarUrl, gravHash },
    });
  }

  return { status: "ok", data: { disposable, deliverable, hasGravatar, mxRecords } };
};


const notImplemented =
  (name: string): ToolHandler =>
  async () => ({
    status: "not_implemented",
    note: `tool ${name} is registered but no adapter is configured yet`,
  });

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  search_username: {
    name: "search_username",
    description: "Enumerate a username across known profile sites.",
    inputSchema: z.object({
      username: z.string().min(1),
      max_sites: z.number().int().min(1).max(5000).default(PROFILE_TEMPLATES.length),
    }),
    handler: searchUsernameHandler,
  },
  check_breach: {
    name: "check_breach",
    description: "Check email intel: gravatar presence, disposable domain, MX records.",
    inputSchema: z.object({ email: z.string().email() }),
    handler: checkBreachHandler,
  },

  lookup_discord: {
    name: "lookup_discord",
    description: "Look up a Discord user by ID.",
    inputSchema: z.object({ discord_id: z.string().regex(/^\d{5,30}$/) }),
    handler: lookupDiscordHandler,
  },
  lookup_roblox: {
    name: "lookup_roblox",
    description: "Look up a Roblox user by username or ID.",
    inputSchema: z.object({
      roblox_username: z.string().optional(),
      roblox_id: z.number().int().positive().optional(),
    }),
    handler: lookupRobloxHandler,
  },
  roblox_to_discord: {
    name: "roblox_to_discord",
    description: "Cross-reference a Roblox user to a Discord ID via profile description.",
    inputSchema: z.object({ roblox_id: z.number().int().positive() }),
    handler: robloxToDiscordHandler,
  },
  discord_to_roblox: {
    name: "discord_to_roblox",
    description: "Cross-reference a Discord ID to a Roblox user by username match.",
    inputSchema: z.object({ discord_id: z.string().regex(/^\d{5,30}$/) }),
    handler: discordToRobloxHandler,
  },
  scrape_url: {
    name: "scrape_url",
    description: "Fetch a URL and extract title + text snippet.",
    inputSchema: z.object({
      url: z.string().url(),
      proxy_country: z.string().default("us"),
      take_screenshot: z.boolean().default(false),
    }),
    handler: scrapeUrlHandler,
  },
  generate_dorks: {
    name: "generate_dorks",
    description: "Generate targeted Google dork queries for a target.",
    inputSchema: z.object({
      target_name: z.string().min(1),
      known_platforms: z.array(z.string()).optional(),
    }),
    handler: generateDorksHandler,
  },
  execute_dork: {
    name: "execute_dork",
    description: "Execute a Google dork query and return result URLs.",
    inputSchema: z.object({ dork_query: z.string().min(1) }),
    handler: notImplemented("execute_dork"),
  },
  hash_avatar: {
    name: "hash_avatar",
    description: "SHA-256 hash an avatar image for exact cross-platform matching.",
    inputSchema: z.object({ image_url: z.string().url() }),
    handler: hashAvatarHandler,
  },
  generate_report: {
    name: "generate_report",
    description: "Compile findings into a structured intelligence dossier.",
    inputSchema: z.object({
      investigation_id: z.string().uuid(),
      format: z.enum(["markdown", "pdf", "both"]).default("both"),
    }),
    handler: notImplemented("generate_report"),
  },
};

export function listTools(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY);
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY[name];
}

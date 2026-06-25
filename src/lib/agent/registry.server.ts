import { z } from "zod";

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

const notImplemented =
  (name: string): ToolHandler =>
  async () => ({
    status: "not_implemented",
    note: `tool ${name} is registered but no adapter is configured yet`,
  });

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  search_username: {
    name: "search_username",
    description:
      "Enumerate a username across 3000+ sites. Returns found profiles with URLs.",
    inputSchema: z.object({
      username: z.string().min(1),
      max_sites: z.number().int().min(1).max(5000).default(5000),
    }),
    handler: notImplemented("search_username"),
  },
  check_breach: {
    name: "check_breach",
    description: "Check if an email appears in known data breaches.",
    inputSchema: z.object({ email: z.string().email() }),
    handler: notImplemented("check_breach"),
  },
  lookup_discord: {
    name: "lookup_discord",
    description: "Look up a Discord user by ID.",
    inputSchema: z.object({ discord_id: z.string().regex(/^\d{5,30}$/) }),
    handler: notImplemented("lookup_discord"),
  },
  lookup_roblox: {
    name: "lookup_roblox",
    description: "Look up a Roblox user by username or ID.",
    inputSchema: z.object({
      roblox_username: z.string().optional(),
      roblox_id: z.number().int().positive().optional(),
    }),
    handler: notImplemented("lookup_roblox"),
  },
  roblox_to_discord: {
    name: "roblox_to_discord",
    description: "Cross-reference a Roblox user to a Discord ID.",
    inputSchema: z.object({ roblox_id: z.number().int().positive() }),
    handler: notImplemented("roblox_to_discord"),
  },
  discord_to_roblox: {
    name: "discord_to_roblox",
    description: "Cross-reference a Discord ID to a Roblox user.",
    inputSchema: z.object({ discord_id: z.string().regex(/^\d{5,30}$/) }),
    handler: notImplemented("discord_to_roblox"),
  },
  scrape_url: {
    name: "scrape_url",
    description: "Fetch a URL through residential proxies and extract content.",
    inputSchema: z.object({
      url: z.string().url(),
      proxy_country: z.string().default("us"),
      take_screenshot: z.boolean().default(true),
    }),
    handler: notImplemented("scrape_url"),
  },
  generate_dorks: {
    name: "generate_dorks",
    description: "Generate targeted Google dork queries for a target.",
    inputSchema: z.object({
      target_name: z.string().min(1),
      known_platforms: z.array(z.string()).optional(),
    }),
    handler: notImplemented("generate_dorks"),
  },
  execute_dork: {
    name: "execute_dork",
    description: "Execute a Google dork query and return result URLs.",
    inputSchema: z.object({ dork_query: z.string().min(1) }),
    handler: notImplemented("execute_dork"),
  },
  hash_avatar: {
    name: "hash_avatar",
    description: "Compute a perceptual hash of an avatar image for cross-platform matching.",
    inputSchema: z.object({ image_url: z.string().url() }),
    handler: notImplemented("hash_avatar"),
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

import { z } from "zod";

export const TargetTypeSchema = z.enum([
  "auto",
  "username",
  "email",
  "discord_id",
  "roblox_id",
]);
export type TargetType = z.infer<typeof TargetTypeSchema>;

export const InvestigationOptionsSchema = z.object({
  strict_mode: z.boolean().default(true),
  ai_filter: z.boolean().default(true),
  max_sites: z.number().int().min(1).max(5000).default(5000),
  take_screenshots: z.boolean().default(true),
  run_dorks: z.boolean().default(true),
  check_breaches: z.boolean().default(true),
  cross_reference: z.boolean().default(true),
  proxy_country: z.string().min(2).max(8).default("us"),
});
export type InvestigationOptions = z.infer<typeof InvestigationOptionsSchema>;

export const InvestigationCreateSchema = z.object({
  target: z.string().trim().min(1).max(256),
  target_type: TargetTypeSchema.default("auto"),
  options: InvestigationOptionsSchema.partial().optional(),
});
export type InvestigationCreate = z.infer<typeof InvestigationCreateSchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const FindingSchema = z.object({
  id: z.string().uuid(),
  investigation_id: z.string().uuid(),
  tool_name: z.string(),
  platform: z.string().nullable(),
  url: z.string().nullable(),
  username: z.string().nullable(),
  confidence: ConfidenceSchema,
  raw_data: z.unknown().nullable(),
  screenshot_url: z.string().nullable(),
  is_false_positive: z.boolean(),
  filter_reason: z.string().nullable(),
  created_at: z.string(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const InvestigationStatusSchema = z.enum([
  "queued",
  "running",
  "filtering",
  "reporting",
  "done",
  "error",
]);
export type InvestigationStatus = z.infer<typeof InvestigationStatusSchema>;

export const AgentStepSchema = z.object({
  id: z.string().uuid(),
  investigation_id: z.string().uuid(),
  step_index: z.number().int(),
  tool_name: z.string().nullable(),
  tool_input: z.unknown().nullable(),
  tool_output: z.unknown().nullable(),
  note: z.string().nullable(),
  status: z.string().nullable(),
  created_at: z.string(),
});
export type AgentStep = z.infer<typeof AgentStepSchema>;

export const InvestigationSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  target: z.string(),
  target_type: TargetTypeSchema,
  options: z.record(z.string(), z.unknown()),
  status: InvestigationStatusSchema,
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().nullable(),
});
export type Investigation = z.infer<typeof InvestigationSchema>;

export const InvestigationResponseSchema = z.object({
  investigation: InvestigationSchema,
  findings: z.array(FindingSchema),
  steps: z.array(AgentStepSchema),
});
export type InvestigationResponse = z.infer<typeof InvestigationResponseSchema>;

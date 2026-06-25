import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  InvestigationCreateSchema,
  InvestigationOptionsSchema,
} from "@/lib/schemas/investigation";
import { consumeQuotaOrThrow } from "@/lib/settings.functions";
import { z } from "zod";

export const createInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InvestigationCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await consumeQuotaOrThrow(supabase, userId);
    const options = InvestigationOptionsSchema.parse(data.options ?? {});

    const { data: row, error } = await supabase
      .from("investigations")
      .insert({
        owner_id: userId,
        target: data.target,
        target_type: data.target_type,
        options: options as never,
        status: "queued",
      })
      .select("id, status")
      .single();

    if (error || !row) throw new Error(error?.message ?? "insert_failed");

    const { runInvestigation } = await import("@/lib/agent/runner.server");
    void runInvestigation(row.id, userId).catch((err) => {
      console.error("runner_unhandled", err instanceof Error ? err.message : err);
    });

    return { id: row.id, status: row.status };
  });

const IdInput = z.object({ id: z.string().uuid() });

export const getInvestigation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [inv, findings, steps, report] = await Promise.all([
      supabase.from("investigations").select("*").eq("id", data.id).maybeSingle(),
      supabase
        .from("findings")
        .select("*")
        .eq("investigation_id", data.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("agent_steps")
        .select("*")
        .eq("investigation_id", data.id)
        .order("step_index", { ascending: true })
        .limit(200),
      supabase.from("reports").select("*").eq("investigation_id", data.id).maybeSingle(),
    ]);
    if (inv.error) throw new Error(inv.error.message);
    if (!inv.data) throw new Error("not_found");

    return {
      investigation: inv.data,
      findings: findings.data ?? [],
      steps: steps.data ?? [],
      report: report.data ?? null,
    };
  });

const ListInput = z
  .object({ limit: z.number().int().min(1).max(100).default(50) })
  .default({ limit: 50 });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("investigations")
      .select("id, target, target_type, status, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("investigations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

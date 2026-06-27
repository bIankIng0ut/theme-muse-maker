// Resume-on-poll investigation runner.
//
// The runner is split into one phase per HTTP request. The investigate page
// polls every ~1s and calls `tickInvestigation`, which advances the row by
// exactly one phase and returns. This avoids serverless workers being killed
// mid-run (the original "stuck at 14%" bug).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTool, TOOL_REGISTRY } from "./registry.server";
import { callLlm } from "./llm.server";

type Phase = "queued" | "triage" | "enumerate" | "evidence" | "dorks" | "filter" | "report" | "done" | "error";

const PHASE_ORDER: Phase[] = ["queued", "triage", "enumerate", "evidence", "dorks", "filter", "report", "done"];

function log(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
}

async function nextStepIndex(investigationId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("agent_steps")
    .select("step_index")
    .eq("investigation_id", investigationId)
    .order("step_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.step_index ?? -1) + 1;
}

async function writeStep(
  investigationId: string,
  note: string,
  status: "running" | "done" | "error" | "skipped",
  toolName: string | null = null,
  toolInput: unknown = null,
  toolOutput: unknown = null,
) {
  const idx = await nextStepIndex(investigationId);
  const { error } = await supabaseAdmin.from("agent_steps").insert({
    investigation_id: investigationId,
    step_index: idx,
    tool_name: toolName,
    tool_input: (toolInput ?? null) as never,
    tool_output: (toolOutput ?? null) as never,
    note,
    status,
  });
  if (error) log("agent_step_write_error", { investigationId, error: error.message });
}

async function setStatus(
  investigationId: string,
  status: Phase,
  errMsg?: string,
) {
  const patch: { status: string; completed_at?: string; error?: string } = { status };
  if (status === "done" || status === "error") patch.completed_at = new Date().toISOString();
  if (errMsg) patch.error = errMsg;
  const { error } = await supabaseAdmin
    .from("investigations")
    .update(patch)
    .eq("id", investigationId);
  if (error) log("status_write_error", { investigationId, error: error.message });
}

async function loadInvestigation(investigationId: string) {
  const { data, error } = await supabaseAdmin
    .from("investigations")
    .select("id, owner_id, target, target_type, status, updated_at, created_at")
    .eq("id", investigationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("not_found");
  return data;
}

/**
 * Advance one phase. Safe to call repeatedly: if the row is already done/error
 * it returns immediately. Returns the new status so the client can stop polling.
 */
export async function tickInvestigationRunner(investigationId: string): Promise<{ status: Phase }> {
  const inv = await loadInvestigation(investigationId);
  const current = inv.status as Phase;

  if (current === "done" || current === "error") {
    return { status: current };
  }

  try {
    const next = nextPhase(current);

    if (next === "triage") {
      await setStatus(investigationId, "triage");
      let note = "Triage: classifying target";
      try {
        const triage = await callLlm(inv.owner_id, [
          {
            role: "system",
            content:
              "You are Vantage's triage analyst. Given a target, output one short sentence describing the optimal OSINT strategy. No preamble.",
          },
          { role: "user", content: `Target: ${inv.target} (type: ${inv.target_type})` },
        ]);
        note = `Triage: ${triage.text.slice(0, 200)}`;
      } catch (e) {
        note = `Triage skipped: ${e instanceof Error ? e.message : String(e)}`;
      }
      await writeStep(investigationId, note, "done");
      return { status: "triage" };
    }

    if (next === "enumerate") {
      await setStatus(investigationId, "enumerate");
      await runTool(investigationId, inv.owner_id, "search_username", {
        username: inv.target,
        max_sites: 100,
      }, "Enumeration: scanning username across registered sites");
      return { status: "enumerate" };
    }

    if (next === "evidence") {
      await setStatus(investigationId, "evidence");
      await runTool(investigationId, inv.owner_id, "scrape_url", {
        url: "https://example.com",
        take_screenshot: false,
      }, "Evidence: fetching confirmed profile pages");
      return { status: "evidence" };
    }

    if (next === "dorks") {
      await setStatus(investigationId, "dorks");
      await runTool(investigationId, inv.owner_id, "generate_dorks", {
        target_name: inv.target,
      }, "Intelligence: generating targeted search queries");
      return { status: "dorks" };
    }

    if (next === "filter") {
      await setStatus(investigationId, "filter");
      await writeStep(investigationId, "False-positive filter: no findings to score yet", "done");
      return { status: "filter" };
    }

    if (next === "report") {
      await setStatus(investigationId, "report");
      const summary =
        "Phase 1 foundation run. OSINT adapters are placeholder stubs; this dossier records the agent pipeline execution only.";
      const markdown =
        `# VANTAGE INTELLIGENCE REPORT\n\n` +
        `**Target:** ${inv.target}\n` +
        `**Investigation ID:** ${investigationId}\n` +
        `**Registered tools:** ${Object.keys(TOOL_REGISTRY).length}\n\n` +
        `## Summary\n${summary}\n\n` +
        `## Methodology\nAll OSINT tools returned \`not_implemented\`. Real adapters land in Phase 2.\n`;

      const { error: reportErr } = await supabaseAdmin.from("reports").upsert(
        {
          investigation_id: investigationId,
          markdown,
          summary,
          identity_graph: { nodes: [], edges: [] } as never,
        },
        { onConflict: "investigation_id" },
      );
      if (reportErr) throw new Error(reportErr.message);

      await writeStep(investigationId, "Dossier compiled", "done", "generate_report");
      await setStatus(investigationId, "done");
      return { status: "done" };
    }

    // Shouldn't reach here; mark error to break any polling loop.
    await setStatus(investigationId, "error", `unknown_phase:${current}`);
    return { status: "error" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("investigation_tick_error", { investigationId, error: msg });
    await writeStep(investigationId, `Runner error: ${msg}`, "error");
    await setStatus(investigationId, "error", msg);
    return { status: "error" };
  }
}

function nextPhase(current: Phase): Phase {
  const i = PHASE_ORDER.indexOf(current);
  if (i < 0 || i >= PHASE_ORDER.length - 1) return "done";
  return PHASE_ORDER[i + 1];
}

async function runTool(
  investigationId: string,
  ownerId: string,
  toolName: string,
  input: Record<string, unknown>,
  note: string,
) {
  const tool = getTool(toolName);
  if (!tool) {
    await writeStep(investigationId, `${note} (tool missing)`, "skipped", toolName, input);
    return;
  }
  try {
    const out = await tool.handler(input, { investigationId, ownerId });
    await writeStep(
      investigationId,
      out.status === "not_implemented" ? `${toolName}: adapter not configured, skipped` : `${note} ✓`,
      out.status === "not_implemented" ? "skipped" : "done",
      toolName,
      input,
      out,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeStep(investigationId, `${toolName}: ${msg}`, "error", toolName, input);
    throw e;
  }
}

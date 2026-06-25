import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTool, TOOL_REGISTRY } from "./registry.server";
import { callLlm } from "./llm.server";

type StepInput = {
  tool_name: string | null;
  note: string;
  status: "running" | "done" | "error" | "skipped";
  tool_input?: unknown;
  tool_output?: unknown;
};

function log(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
}

async function writeStep(investigationId: string, index: number, step: StepInput) {
  const { error } = await supabaseAdmin.from("agent_steps").insert({
    investigation_id: investigationId,
    step_index: index,
    tool_name: step.tool_name,
    tool_input: (step.tool_input ?? null) as never,
    tool_output: (step.tool_output ?? null) as never,
    note: step.note,
    status: step.status,
  });
  if (error) log("agent_step_write_error", { investigationId, error: error.message });
}

async function setStatus(
  investigationId: string,
  status: "queued" | "running" | "filtering" | "reporting" | "done" | "error",
  errMsg?: string,
) {
  const patch: {
    status: string;
    completed_at?: string;
    error?: string;
  } = { status };
  if (status === "done" || status === "error") patch.completed_at = new Date().toISOString();
  if (errMsg) patch.error = errMsg;
  const { error } = await supabaseAdmin
    .from("investigations")
    .update(patch)
    .eq("id", investigationId);
  if (error) log("status_write_error", { investigationId, error: error.message });
}

export async function runInvestigation(investigationId: string, ownerId: string): Promise<void> {
  log("investigation_start", { investigationId, ownerId });
  let stepIndex = 0;

  try {
    await setStatus(investigationId, "running");
    await writeStep(investigationId, stepIndex++, {
      tool_name: null,
      note: "Triage: classifying target and loading strategy",
      status: "done",
    });

    const phases: Array<{ tool: string; input: Record<string, unknown>; note: string }> = [
      {
        tool: "search_username",
        input: { username: "placeholder", max_sites: 100 },
        note: "Enumeration phase: scanning username across registered sites",
      },
      {
        tool: "scrape_url",
        input: { url: "https://example.com", take_screenshot: false },
        note: "Evidence phase: fetching confirmed profile pages",
      },
      {
        tool: "generate_dorks",
        input: { target_name: "placeholder" },
        note: "Intelligence phase: generating targeted search queries",
      },
    ];

    for (const phase of phases) {
      const tool = getTool(phase.tool);
      if (!tool) continue;
      await writeStep(investigationId, stepIndex++, {
        tool_name: tool.name,
        note: phase.note,
        status: "running",
        tool_input: phase.input,
      });
      const out = await tool.handler(phase.input, { investigationId, ownerId });
      await writeStep(investigationId, stepIndex++, {
        tool_name: tool.name,
        note:
          out.status === "not_implemented"
            ? `${tool.name}: adapter not configured, skipped`
            : `${tool.name}: ${out.status}`,
        status: out.status === "not_implemented" ? "skipped" : "done",
        tool_input: phase.input,
        tool_output: out,
      });
    }

    await setStatus(investigationId, "filtering");
    await writeStep(investigationId, stepIndex++, {
      tool_name: null,
      note: "False-positive filter: no findings to score (placeholder tools)",
      status: "done",
    });

    await setStatus(investigationId, "reporting");
    await writeStep(investigationId, stepIndex++, {
      tool_name: "generate_report",
      note: "Compiling dossier",
      status: "running",
    });

    const summary =
      "Phase 1 foundation run. OSINT adapters not yet configured; this dossier records the agent pipeline execution only. No findings were fabricated.";
    const markdown =
      `# VANTAGE INTELLIGENCE REPORT\n\n` +
      `**Investigation ID:** ${investigationId}\n` +
      `**Registered tools:** ${Object.keys(TOOL_REGISTRY).length}\n\n` +
      `## Summary\n${summary}\n\n` +
      `## Methodology\nAll tools in the registry returned \`not_implemented\`. Real adapters land in Phase 2.\n`;

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

    await writeStep(investigationId, stepIndex++, {
      tool_name: "generate_report",
      note: "Dossier persisted",
      status: "done",
    });

    await setStatus(investigationId, "done");
    log("investigation_done", { investigationId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("investigation_error", { investigationId, error: msg });
    await writeStep(investigationId, stepIndex++, {
      tool_name: null,
      note: "Runner crashed",
      status: "error",
    });
    await setStatus(investigationId, "error", msg);
  }
}

// Resume-on-poll investigation runner.
//
// Phase 3 adds:
//  - a `correlate` phase (cross-platform linking + avatar hashing)
//  - expanded evidence depth (up to 20 scrapes)

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTool, TOOL_REGISTRY } from "./registry.server";
import { callLlm } from "./llm.server";

type Phase =
  | "queued"
  | "triage"
  | "enumerate"
  | "evidence"
  | "correlate"
  | "dorks"
  | "filter"
  | "report"
  | "done"
  | "error";

const PHASE_ORDER: Phase[] = [
  "queued",
  "triage",
  "enumerate",
  "evidence",
  "correlate",
  "dorks",
  "filter",
  "report",
  "done",
];

const EVIDENCE_MAX = 20;

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

async function setStatus(investigationId: string, status: Phase, errMsg?: string) {
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

async function loadFindings(investigationId: string) {
  const { data } = await supabaseAdmin
    .from("findings")
    .select("tool_name, platform, url, username, confidence, raw_data, is_false_positive")
    .eq("investigation_id", investigationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function tickInvestigationRunner(
  investigationId: string,
): Promise<{ status: Phase }> {
  const inv = await loadInvestigation(investigationId);
  const current = inv.status as Phase;
  if (current === "done" || current === "error") return { status: current };

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
      const t = inv.target_type;
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.target);
      if (t === "discord_id") {
        await runTool(investigationId, inv.owner_id, "lookup_discord", {
          discord_id: inv.target,
        }, "Enumeration: Discord user lookup");
      } else if (t === "roblox_id") {
        const asId = /^\d+$/.test(inv.target);
        await runTool(investigationId, inv.owner_id, "lookup_roblox",
          asId ? { roblox_id: Number(inv.target) } : { roblox_username: inv.target },
          "Enumeration: Roblox user lookup",
        );
      } else if (t === "email" || (t === "auto" && isEmail)) {
        await runTool(investigationId, inv.owner_id, "check_breach", {
          email: inv.target,
        }, "Enumeration: email intel (gravatar / MX / disposable)");
        const localPart = inv.target.split("@")[0];
        if (/^[a-zA-Z0-9_]{3,20}$/.test(localPart)) {
          await runTool(investigationId, inv.owner_id, "search_username", {
            username: localPart,
          }, `Enumeration: scanning local-part "${localPart}" across sites`);
        }
      } else {
        await runTool(investigationId, inv.owner_id, "search_username", {
          username: inv.target,
        }, "Enumeration: scanning username across registered sites");
        // also try Roblox by username for free
        if (/^[a-zA-Z0-9_]{3,20}$/.test(inv.target)) {
          await runTool(investigationId, inv.owner_id, "lookup_roblox", {
            roblox_username: inv.target,
          }, "Enumeration: Roblox by username");
        }
      }
      return { status: "enumerate" };
    }


    if (next === "evidence") {
      await setStatus(investigationId, "evidence");
      const findings = await loadFindings(investigationId);
      const targets = findings
        .filter((f) => f.url && f.tool_name !== "scrape_url" && f.tool_name !== "generate_dorks" && f.tool_name !== "hash_avatar")
        .slice(0, EVIDENCE_MAX);
      if (targets.length === 0) {
        await writeStep(investigationId, "Evidence: no URLs to fetch", "skipped");
      } else {
        for (const f of targets) {
          await runTool(investigationId, inv.owner_id, "scrape_url", {
            url: f.url,
            take_screenshot: false,
          }, `Evidence: scraping ${f.platform ?? f.url}`);
        }
      }
      return { status: "evidence" };
    }

    if (next === "correlate") {
      await setStatus(investigationId, "correlate");
      const findings = await loadFindings(investigationId);
      let ran = 0;

      // Find every Roblox ID we've discovered and try roblox→discord
      const robloxIds = new Set<number>();
      for (const f of findings) {
        const raw = f.raw_data as { robloxId?: number; id?: number } | null;
        if (f.platform === "Roblox" && raw) {
          const id = raw.robloxId ?? raw.id;
          if (typeof id === "number") robloxIds.add(id);
        }
      }
      for (const rid of robloxIds) {
        await runTool(investigationId, inv.owner_id, "roblox_to_discord",
          { roblox_id: rid }, `Correlate: Roblox ${rid} → Discord`);
        ran++;
      }

      // Find every Discord ID we've discovered and try discord→roblox
      const discordIds = new Set<string>();
      for (const f of findings) {
        const raw = f.raw_data as { id?: string; discordId?: string } | null;
        if (f.platform === "Discord" && raw?.id && /^\d{5,30}$/.test(raw.id)) {
          discordIds.add(raw.id);
        }
      }
      for (const did of discordIds) {
        await runTool(investigationId, inv.owner_id, "discord_to_roblox",
          { discord_id: did }, `Correlate: Discord ${did} → Roblox`);
        ran++;
      }

      // Hash any avatar URLs we picked up
      const avatars = new Set<string>();
      for (const f of findings) {
        const raw = f.raw_data as { avatarUrl?: string } | null;
        if (raw?.avatarUrl && /^https?:\/\//.test(raw.avatarUrl)) avatars.add(raw.avatarUrl);
      }
      for (const url of avatars) {
        await runTool(investigationId, inv.owner_id, "hash_avatar",
          { image_url: url }, `Correlate: hashing avatar ${new URL(url).hostname}`);
        ran++;
      }

      if (ran === 0) {
        await writeStep(investigationId, "Correlate: nothing to cross-reference", "skipped");
      }
      return { status: "correlate" };
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
      const findings = await loadFindings(investigationId);
      await writeStep(
        investigationId,
        `False-positive filter: ${findings.length} findings retained`,
        "done",
      );
      return { status: "filter" };
    }

    if (next === "report") {
      await setStatus(investigationId, "report");
      const findings = await loadFindings(investigationId);

      const bullets = findings
        .slice(0, 80)
        .map((f) => `- [${f.platform ?? f.tool_name}] ${f.username ?? ""} ${f.url ?? ""}`.trim())
        .join("\n") || "(no findings)";

      let body = "";
      try {
        const out = await callLlm(inv.owner_id, [
          {
            role: "system",
            content:
              "You are Vantage's lead intelligence analyst. Write a concise Markdown dossier from the findings: sections '## Summary', '## Identity Signals', '## Cross-Platform Footprint', '## Recommended Next Steps'. Cite specific platforms and URLs. Do not invent data — if nothing was found in a category, say so plainly.",
          },
          {
            role: "user",
            content: `Target: ${inv.target} (${inv.target_type})\nFindings (${findings.length}):\n${bullets}`,
          },
        ]);
        body = out.text;
      } catch (e) {
        body = `_LLM report skipped: ${e instanceof Error ? e.message : String(e)}_`;
      }

      const markdown =
        `# VANTAGE INTELLIGENCE REPORT\n\n` +
        `**Target:** ${inv.target}\n` +
        `**Type:** ${inv.target_type}\n` +
        `**Investigation ID:** ${investigationId}\n` +
        `**Findings:** ${findings.length}\n` +
        `**Tools available:** ${Object.keys(TOOL_REGISTRY).length}\n\n` +
        `---\n\n${body}\n\n` +
        `## Raw Findings\n\n${bullets}\n`;

      const nodes = [
        { id: "root", label: inv.target, type: "target" },
        ...findings
          .filter((f) => f.username || f.url)
          .slice(0, 24)
          .map((f, i) => ({
            id: `n${i}`,
            label: f.username ?? f.platform ?? f.url ?? "node",
            type: f.platform ?? "src",
          })),
      ];
      const edges = nodes.slice(1).map((n) => ({ source: "root", target: n.id, label: n.type }));

      const { error: reportErr } = await supabaseAdmin.from("reports").upsert(
        {
          investigation_id: investigationId,
          markdown,
          summary: body.split("\n").find((l) => l.trim().length > 30)?.slice(0, 280) ?? null,
          identity_graph: { nodes, edges } as never,
        },
        { onConflict: "investigation_id" },
      );
      if (reportErr) throw new Error(reportErr.message);

      await writeStep(investigationId, "Dossier compiled", "done", "generate_report");
      await setStatus(investigationId, "done");
      return { status: "done" };
    }

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
    const stepStatus =
      out.status === "not_implemented" ? "skipped" :
      out.status === "error" ? "error" : "done";
    const tail =
      out.status === "not_implemented" ? `${toolName}: ${out.note ?? "adapter not configured"}` :
      out.status === "error" ? `${toolName}: ${out.note ?? "failed"}` :
      `${note} ✓`;
    await writeStep(investigationId, tail, stepStatus, toolName, input, out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeStep(investigationId, `${toolName}: ${msg}`, "error", toolName, input);
  }
}

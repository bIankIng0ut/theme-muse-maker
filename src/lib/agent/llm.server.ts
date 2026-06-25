// Unified LLM call for Vantage agents.
// Provider priority (per-investigation): OpenRouter (BYO) -> OpenAI (BYO) ->
// Anthropic (BYO) -> Gemini (BYO) -> Lovable AI Gateway (default).
//
// All providers are invoked through OpenAI-compatible chat/completions
// endpoints. OpenRouter is treated as a first-class provider so users can
// route to any model in its catalog (Claude, GPT, Llama, Mistral, etc.).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmResult = {
  text: string;
  provider: "openrouter" | "openai" | "anthropic" | "gemini" | "lovable";
  model: string;
};

type ByoKeys = {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  openrouter?: string;
  openrouter_model?: string;
};

type Plan = "free" | "pro" | "ultra";

async function loadProfile(ownerId: string): Promise<{ keys: ByoKeys; plan: Plan }> {
  const { data } = await supabaseAdmin
    .from("user_settings")
    .select("byo_keys, plan")
    .eq("user_id", ownerId)
    .maybeSingle();
  const keys = ((data?.byo_keys as ByoKeys | null) ?? {}) as ByoKeys;
  const rawPlan = ((data?.plan as string | null) ?? "free").toLowerCase();
  const plan: Plan = rawPlan === "ultra" ? "ultra" : rawPlan === "pro" ? "pro" : "free";
  return { keys, plan };
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LlmMessage[],
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function callLlm(
  ownerId: string,
  messages: LlmMessage[],
): Promise<LlmResult> {
  const { keys, plan } = await loadProfile(ownerId);

  // 1. BYO providers are always honored, regardless of plan.
  if (keys.openrouter) {
    const model = keys.openrouter_model?.trim() || "anthropic/claude-3.5-sonnet";
    const text = await callOpenAICompatible(
      "https://openrouter.ai/api/v1",
      keys.openrouter,
      model,
      messages,
      { "HTTP-Referer": "https://vantage.lovable.app", "X-Title": "Vantage" },
    );
    return { text, provider: "openrouter", model };
  }

  if (keys.openai) {
    const model = "gpt-4o-mini";
    const text = await callOpenAICompatible(
      "https://api.openai.com/v1",
      keys.openai,
      model,
      messages,
    );
    return { text, provider: "openai", model };
  }

  if (keys.anthropic) {
    const model = "claude-3-5-sonnet-latest";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": keys.anthropic,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: messages.find((m) => m.role === "system")?.content ?? "",
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const json = (await res.json()) as { content?: Array<{ text?: string }> };
    return { text: json.content?.[0]?.text ?? "", provider: "anthropic", model };
  }

  if (keys.gemini) {
    const model = "gemini-2.5-flash";
    const text = await callOpenAICompatible(
      "https://generativelanguage.googleapis.com/v1beta/openai",
      keys.gemini,
      model,
      messages,
    );
    return { text, provider: "gemini", model };
  }

  // 2. Hosted Lovable AI fallback is plan-gated:
  //    - free  → no fallback; users must bring a key (BYO).
  //    - pro   → fast/cheap default model, capped by nightly quota elsewhere.
  //    - ultra → premium model, unlimited.
  if (plan === "free") {
    throw new Error(
      "byo_key_required: Free tier requires a bring-your-own LLM key (OpenRouter / OpenAI / Anthropic / Gemini). Upgrade to Pro for hosted Vantage AI.",
    );
  }

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("No LLM provider configured");
  const model = plan === "ultra" ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

  // Soft length cap for non-ultra plans to keep hosted costs in check.
  const trimmed = plan === "ultra"
    ? messages
    : messages.map((m) => ({
        ...m,
        content: m.content.length > 4000 ? m.content.slice(0, 4000) : m.content,
      }));

  const text = await callOpenAICompatible(
    "https://ai.gateway.lovable.dev/v1",
    lovableKey,
    model,
    trimmed,
    { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vantage-agent" },
  );
  return { text, provider: "lovable", model };
}


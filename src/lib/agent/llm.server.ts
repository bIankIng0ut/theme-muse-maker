// Unified LLM call for Vantage agents.
// Everyone (Free / Pro / Ultra) uses the built-in Lovable AI Gateway.
// No bring-your-own keys — quotas/expiration are gated by plan elsewhere.

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmResult = {
  text: string;
  provider: "lovable";
  model: string;
};

const MODEL = "google/gemini-2.5-flash";

export async function callLlm(_ownerId: string, messages: LlmMessage[]): Promise<LlmResult> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "Lovable-API-Key": lovableKey,
      "X-Lovable-AIG-SDK": "vantage-agent",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages.map((m) => ({
        ...m,
        content: m.content.length > 4000 ? m.content.slice(0, 4000) : m.content,
      })),
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted — contact ops.");
    throw new Error(`LLM ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return { text: json.choices?.[0]?.message?.content ?? "", provider: "lovable", model: MODEL };
}

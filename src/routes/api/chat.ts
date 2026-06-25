import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI not configured", { status: 500 });

        const auth = request.headers.get("authorization");
        if (!auth) return new Response("Unauthorized", { status: 401 });

        // Verify the user via Supabase and confirm paid plan
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { global: { headers: { Authorization: auth } } },
        );
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const { data: settings } = await supabase
          .from("user_settings")
          .select("plan")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        const plan = settings?.plan ?? "free";
        if (plan !== "pro" && plan !== "ultra") {
          return new Response("Support assistant is available on Analyst and higher tiers.", {
            status: 402,
          });
        }

        const { messages } = (await request.json()) as { messages: ChatMessage[] };
        if (!Array.isArray(messages)) return new Response("Bad payload", { status: 400 });

        const model = plan === "ultra" ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You are Vantage Support, the in-product assistant for an OSINT investigation platform called Vantage. Help users with: launching investigations, understanding findings, managing access keys, plans, and Discord verification. Be concise, professional, and use markdown sparingly.",
              },
              ...messages,
            ],
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          return new Response(`AI gateway error: ${txt}`, { status: res.status });
        }
        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const reply = json.choices?.[0]?.message?.content ?? "(no response)";
        return Response.json({ reply });
      },
    },
  },
});

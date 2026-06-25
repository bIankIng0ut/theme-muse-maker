import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Sparkles, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string };

export function SupportAssistant() {
  const get = useServerFn(getMyProfile);
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: () => get() });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi — I'm Vantage Support. Ask me anything about investigations, keys, or your plan." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const plan = profile.data?.plan ?? "free";
  const isPaid = plan === "pro" || plan === "ultra";

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setMessages([...next, { role: "assistant", content: `Error: ${txt}` }]);
      } else {
        const { reply } = (await res.json()) as { reply: string };
        setMessages([...next, { role: "assistant", content: reply }]);
      }
    } catch (e) {
      setMessages([...next, { role: "assistant", content: e instanceof Error ? e.message : "Network error" }]);
    } finally {
      setLoading(false);
    }
  };

  if (!profile.data) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition"
        aria-label="Support assistant"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] rounded-2xl border border-border bg-popover backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Vantage Support</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {isPaid ? `AI assistant · ${plan}` : "Locked — upgrade required"}
              </div>
            </div>
          </div>

          {!isPaid ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                The AI support assistant is available on Analyst and Operations tiers.
              </p>
              <Link
                to="/billing"
                onClick={() => setOpen(false)}
                className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:opacity-90"
              >
                View plans
              </Link>
            </div>
          ) : (
            <>
              <div ref={scrollerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-surface-elevated text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="bg-surface-elevated rounded-2xl px-3 py-2 text-sm max-w-[60%] text-muted-foreground">
                    <span className="inline-block animate-pulse">...</span>
                  </div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="border-t border-border/60 p-2.5 flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-foreground/40"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

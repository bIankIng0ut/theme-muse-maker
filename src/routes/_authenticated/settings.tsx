import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, Sparkles, Moon, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Form = {
  openai: string;
  anthropic: string;
  gemini: string;
  scrapingant: string;
  hibp: string;
  serpapi: string;
};

const KEYS: { id: keyof Form; label: string; hint: string }[] = [
  { id: "openai", label: "OpenAI", hint: "sk-..." },
  { id: "anthropic", label: "Anthropic", hint: "sk-ant-..." },
  { id: "gemini", label: "Google Gemini", hint: "AIza..." },
  { id: "scrapingant", label: "ScrapingAnt", hint: "scraper key" },
  { id: "hibp", label: "HaveIBeenPwned", hint: "hibp key" },
  { id: "serpapi", label: "SerpAPI", hint: "serp key" },
];

function SettingsPage() {
  const get = useServerFn(getSettings);
  const upd = useServerFn(updateSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => get() });
  const [form, setForm] = useState<Form>({
    openai: "",
    anthropic: "",
    gemini: "",
    scrapingant: "",
    hibp: "",
    serpapi: "",
  });

  useEffect(() => {
    if (q.data?.keys) setForm(q.data.keys as Form);
  }, [q.data]);

  const m = useMutation({
    mutationFn: (keys: Partial<Form>) => upd({ data: { keys } }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const plan = q.data?.plan ?? "free";
  const quota = q.data?.quota;
  const pct = quota ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Profile</div>
        <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Plan, credentials, and nightly quota.</p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Plan
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-semibold tracking-tight capitalize">{plan}</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-xs">
                {plan === "pro"
                  ? "Unlimited investigations on the Vantage engine, hosted keys."
                  : "Bring your own API keys. 15 investigations per night on the Vantage engine."}
              </div>
            </div>
            {plan === "free" && (
              <button
                onClick={() => toast.info("Pro tier opens soon — contact ops.")}
                className="rounded-full bg-foreground text-background text-xs px-3 py-1.5 hover:opacity-90 transition"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Moon className="h-3.5 w-3.5" /> Nightly quota
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{quota?.used ?? 0}</span>
            <span className="text-xs text-muted-foreground">/ {quota?.limit ?? 15}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] font-mono text-muted-foreground">
            Resets {quota ? new Date(quota.resetsAt).toLocaleString() : "—"}
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" /> Bring-your-own keys
          </div>
          <button
            onClick={() => m.mutate(form)}
            disabled={m.isPending}
            className="rounded-full bg-foreground text-background text-xs px-4 py-1.5 disabled:opacity-50 hover:opacity-90 transition inline-flex items-center gap-1.5"
          >
            {m.isPending ? "Saving…" : (<><Check className="h-3 w-3" /> Save</>)}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
          Free plan routes calls through Vantage's engine using your keys. Leave a field unchanged to keep the existing value; clear it to remove.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {KEYS.map((k) => (
            <label key={k.id} className="block">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{k.label}</span>
              <input
                type="password"
                autoComplete="off"
                value={form[k.id] ?? ""}
                placeholder={k.hint}
                onChange={(e) => setForm((f) => ({ ...f, [k.id]: e.target.value }))}
                className="mt-1 w-full rounded-xl bg-background/60 border border-border/60 px-3 py-2 text-sm font-mono outline-none focus:border-foreground/40 transition"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

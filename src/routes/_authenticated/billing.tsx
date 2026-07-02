import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";
import { SITE_COUNTS } from "@/lib/sites";
import { Check, Sparkles, Zap, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

type Tier = {
  id: "free" | "pro" | "enterprise";
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Operator",
    price: "$0",
    cadence: "forever",
    tagline: "Get on the radar with bring-your-own keys.",
    features: [
      "Private access key — 14 day validity",
      `${SITE_COUNTS.free.toLocaleString()} mainstream platforms scanned per run`,
      "15 investigations / night",
      "Bring-your-own LLM keys (OpenRouter, OpenAI, Anthropic, Gemini)",
      "Identity graph + evidence vault",
    ],
    cta: "Claim free key",
  },
  {
    id: "pro",
    name: "Analyst",
    price: "$49",
    cadence: "per month",
    tagline: "Hosted engine, full long-tail coverage.",
    features: [
      "Access key — 90 day validity, rotatable anytime",
      `${SITE_COUNTS.pro.toLocaleString()} platforms — regional, niche, and long-tail`,
      "Unlimited investigations",
      "AI support assistant included",
      "Screenshot capture + ScrapingAnt routing",
      "Priority queue + nightly auto-watch",
    ],
    cta: "Upgrade to Analyst",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Operations",
    price: "Custom",
    cadence: "contact ops",
    tagline: "For teams running standing collection programs.",
    features: [
      "Everything in Analyst",
      "Access key — 365 day validity",
      "Premium AI support (Gemini 2.5 Pro)",
      "SSO + role-based access",
      "Dedicated tenant + audit log",
      "Custom adapters & SLA",
    ],
    cta: "Contact ops",
  },
];

function BillingPage() {
  const get = useServerFn(getSettings);
  const q = useQuery({ queryKey: ["settings"], queryFn: () => get() });
  const plan = (q.data?.plan ?? "free") as "free" | "pro" | "ultra";
  const navigate = useNavigate();

  const handleSelect = (tier: Tier) => {
    if (tier.id === "free") {
      navigate({ to: "/keys" });
      return;
    }
    if (tier.id === "enterprise") {
      toast.info("Ops will reach out — payments rail goes live next sprint.");
      return;
    }
    toast.info("Checkout is wiring up — payments rail goes live next sprint.");
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Plans &amp; Billing
        </div>
        <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Choose your tier</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-xl">
          Vantage is operator-priced. Free tier runs on your own LLM keys; Analyst
          tier unlocks the full long-tail catalog and the hosted engine. Payments
          rail ships next — pick a tier now and we'll reserve your slot.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {TIERS.map((t, i) => {
          const current = plan === t.id;
          return (
            <div
              key={t.id}
              style={{ animationDelay: `${i * 80}ms` }}
              className={`relative glass rounded-2xl p-6 flex flex-col animate-fade-up ${
                t.highlighted ? "border-primary/50 glow-violet" : ""
              }`}
            >
              {t.highlighted && (
                <span className="absolute -top-2.5 left-6 text-[9px] font-mono uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-2.5 py-0.5">
                  Recommended
                </span>
              )}
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {t.id === "free" && <Lock className="h-3.5 w-3.5" />}
                {t.id === "pro" && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                {t.id === "enterprise" && <Zap className="h-3.5 w-3.5" />}
                {t.name}
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight">{t.price}</span>
                <span className="text-xs text-muted-foreground">/ {t.cadence}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{t.tagline}</p>

              <ul className="mt-5 space-y-2 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(t)}
                disabled={current}
                className={`mt-6 rounded-full text-xs px-4 py-2 transition inline-flex items-center justify-center gap-1.5 ${
                  current
                    ? "bg-surface-elevated text-muted-foreground cursor-default"
                    : t.highlighted
                      ? "bg-foreground text-background hover:opacity-90"
                      : "border border-border hover:border-foreground/40"
                }`}
              >
                {current ? "Current plan" : t.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5 text-xs text-warning-foreground/90 space-y-1.5">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-warning mb-1">
          ⚠ Access key warning — every tier
        </div>
        <p className="text-foreground/90">
          Every plan ships with a private access key. <strong>Save it somewhere safe
          the moment it's generated</strong> — we hash it on creation and never show it
          again. Lose it, and you'll need to generate a new one from{" "}
          <code className="font-mono">Settings → Access Keys</code>.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-5 text-xs text-muted-foreground">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/80 mb-2">
          Payments rail
        </div>
        Vantage's payment rail is being wired up on Stripe. In the meantime,
        Pro/Ultra access is granted automatically through the Vantage Discord
        server — link your Discord in <code className="font-mono">Settings</code>{" "}
        and your role syncs to your plan.
      </div>
    </div>
  );
}

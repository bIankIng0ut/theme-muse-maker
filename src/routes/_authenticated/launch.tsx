import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createInvestigation } from "@/lib/investigations.functions";
import {
  InvestigationOptionsSchema,
  type TargetType,
} from "@/lib/schemas/investigation";
import { toast } from "sonner";
import { Crosshair, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/launch")({
  component: LaunchPage,
});

const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "username", label: "Username" },
  { value: "email", label: "Email" },
  { value: "discord_id", label: "Discord ID" },
  { value: "roblox_id", label: "Roblox ID" },
];

function LaunchPage() {
  const navigate = useNavigate();
  const create = useServerFn(createInvestigation);
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("auto");
  const defaults = InvestigationOptionsSchema.parse({});
  const [options, setOptions] = useState(defaults);

  const mutation = useMutation({
    mutationFn: (input: {
      target: string;
      target_type: TargetType;
      options: typeof defaults;
    }) => create({ data: input }),
    onSuccess: (res) => {
      toast.success("Investigation launched");
      navigate({ to: "/investigate/$id", params: { id: res.id } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Launch failed"),
  });

  const toggle = (key: keyof typeof options) =>
    setOptions((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-primary" />
          New Investigation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a target identifier. The agent will triage, enumerate, and compile a dossier.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!target.trim()) return;
          mutation.mutate({ target: target.trim(), target_type: targetType, options });
        }}
        className="space-y-6"
      >
        <div className="rounded-lg border border-border bg-surface p-5">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Target
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="username / email / Discord ID / Roblox ID"
            maxLength={256}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="mt-4">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {TARGET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTargetType(t.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition ${
                    targetType === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
            Options
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["strict_mode", "Strict mode"],
                ["ai_filter", "AI filter"],
                ["take_screenshots", "Screenshots"],
                ["run_dorks", "Dork queries"],
                ["check_breaches", "Breach check"],
                ["cross_reference", "Cross-reference"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 cursor-pointer hover:bg-surface-elevated"
              >
                <input
                  type="checkbox"
                  checked={options[key] as boolean}
                  onChange={() => toggle(key)}
                  className="accent-primary"
                />
                <span className="text-xs font-mono">{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Max sites
            </label>
            <input
              type="number"
              min={1}
              max={5000}
              value={options.max_sites}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  max_sites: Math.max(1, Math.min(5000, Number(e.target.value) || 1)),
                }))
              }
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono outline-none focus:border-primary"
            />
            <label className="ml-auto text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Proxy
            </label>
            <input
              type="text"
              maxLength={8}
              value={options.proxy_country}
              onChange={(e) =>
                setOptions((o) => ({ ...o, proxy_country: e.target.value.toLowerCase() }))
              }
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono uppercase outline-none focus:border-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || !target.trim()}
          className="group flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Launching..." : "Launch Investigation"}
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </form>
    </div>
  );
}

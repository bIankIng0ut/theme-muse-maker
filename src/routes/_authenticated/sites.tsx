import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";
import { sitesForPlan, SITE_COUNTS, type SiteCategory } from "@/lib/sites";
import { useMemo, useState } from "react";
import { Globe, Search, Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sites")({
  component: SitesPage,
});

const CATEGORIES: { id: SiteCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "forum", label: "Forums" },
  { id: "gaming", label: "Gaming" },
  { id: "dev", label: "Dev" },
  { id: "media", label: "Media" },
  { id: "dating", label: "Dating" },
  { id: "marketplace", label: "Marketplace" },
  { id: "crypto", label: "Crypto" },
  { id: "regional", label: "Regional" },
  { id: "niche", label: "Niche" },
];

const PAGE_SIZE = 80;

function SitesPage() {
  const get = useServerFn(getSettings);
  const q = useQuery({ queryKey: ["settings"], queryFn: () => get() });
  const rawPlan = (q.data?.plan ?? "free") as "free" | "pro" | "ultra";
  const plan: "free" | "pro" = rawPlan === "free" ? "free" : "pro";

  const [cat, setCat] = useState<SiteCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const all = useMemo(() => sitesForPlan(plan), [plan]);
  const filtered = useMemo(() => {
    const ql = query.trim().toLowerCase();
    return all.filter((s) => {
      if (cat !== "all" && s.category !== cat) return false;
      if (!ql) return true;
      return s.name.toLowerCase().includes(ql) || s.url.toLowerCase().includes(ql);
    });
  }, [all, cat, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Coverage
          </div>
          <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Site Catalog</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Platforms Vantage enumerates per investigation on your plan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Stat label="Free" value={SITE_COUNTS.free} active={plan === "free"} />
          <Stat label="Pro" value={SITE_COUNTS.pro} active={plan === "pro"} />
        </div>
      </div>

      {plan === "free" && (
        <div className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Lock className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {SITE_COUNTS.pro - SITE_COUNTS.free} additional sites locked
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Regional clusters, niche communities, and long-tail forums ship with Pro.
              </div>
            </div>
          </div>
          <Link
            to="/billing"
            className="rounded-full bg-foreground text-background text-xs px-4 py-1.5 hover:opacity-90 transition inline-flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3" /> Upgrade
          </Link>
        </div>
      )}

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search platforms by name or domain…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {filtered.length.toLocaleString()} match{filtered.length === 1 ? "" : "es"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCat(c.id);
                setPage(1);
              }}
              className={`text-[10px] font-mono uppercase tracking-wider rounded-full px-2.5 py-1 border transition ${
                cat === c.id
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {slice.map((s) => (
          <div
            key={s.id}
            className="glass rounded-xl px-3 py-2.5 flex items-center gap-2.5 hover:border-primary/30 transition"
          >
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{s.name}</div>
              <div className="text-[10px] font-mono text-muted-foreground truncate">
                {s.url.replace(/^https?:\/\//, "")}
              </div>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
              {s.category}
            </span>
          </div>
        ))}
        {slice.length === 0 && (
          <div className="col-span-full text-center text-xs text-muted-foreground py-10">
            No platforms match this filter.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-[10px] font-mono uppercase rounded-md border border-border/60 px-3 py-1.5 disabled:opacity-30 hover:border-border"
          >
            Prev
          </button>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {safePage} / {totalPages}
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-[10px] font-mono uppercase rounded-md border border-border/60 px-3 py-1.5 disabled:opacity-30 hover:border-border"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div
      className={`glass rounded-xl px-3 py-2 min-w-[110px] ${
        active ? "border-primary/40" : ""
      }`}
    >
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
        {label} tier
      </div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">
        {value.toLocaleString()}
        <span className="text-[10px] font-mono text-muted-foreground ml-1">sites</span>
      </div>
    </div>
  );
}

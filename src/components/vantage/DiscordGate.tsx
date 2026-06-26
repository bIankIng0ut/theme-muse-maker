import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";
import { markVaultcordVerified } from "@/lib/verify.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const VAULTCORD_URL = "https://vaultcord.win/vantage-osint";
const DISCORD_INVITE = "https://discord.gg/JqvvWBZJKr";

export function DiscordGate({ userId: _userId, children }: { userId: string; children: ReactNode }) {
  const get = useServerFn(getMyProfile);
  const mark = useServerFn(markVaultcordVerified);
  const qc = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const q = useQuery({ queryKey: ["my-profile"], queryFn: () => get(), refetchOnWindowFocus: true });

  if (q.isLoading) {
    return <div className="p-8 text-xs font-mono text-muted-foreground">Loading...</div>;
  }
  if (q.data?.discord.verifiedAt) return <>{children}</>;

  async function confirmVerified() {
    try {
      setSubmitting(true);
      await mark();
      toast.success("Verification confirmed — welcome to Vantage.");
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not confirm verification";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-8 text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Verification required</div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Verify with Vaultcord to unlock Vantage</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          To prevent abuse, every operator must complete a one-time Vaultcord check.
          Open the link, finish verification, then return here and confirm — we'll
          unlock the workspace immediately.
        </p>

        <div className="mt-6 grid gap-3">
          <a
            href={VAULTCORD_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpened(true)}
            className="rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-medium hover:opacity-90 transition inline-flex items-center justify-center gap-2"
          >
            Step 1 — Open Vaultcord verification
          </a>
          <button
            type="button"
            disabled={!opened || submitting}
            onClick={confirmVerified}
            className="rounded-full border border-border bg-surface-elevated px-5 py-3 text-sm hover:border-foreground/40 transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Step 2 — I've completed verification
          </button>
        </div>

        <p className="mt-5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Trouble?{" "}
          <a className="text-foreground hover:underline" href={DISCORD_INVITE} target="_blank" rel="noreferrer">
            Ask in Discord
          </a>
        </p>
      </div>
    </div>
  );
}

export function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.486 14.486 0 0 0-.65 1.34 18.288 18.288 0 0 0-5.487 0A14.4 14.4 0 0 0 9.77 3a19.736 19.736 0 0 0-3.76 1.37C2.357 9.92 1.36 15.32 1.86 20.64a19.9 19.9 0 0 0 6.073 3.07c.49-.668.927-1.378 1.302-2.123a12.85 12.85 0 0 1-2.052-.99c.172-.125.34-.255.502-.387a14.16 14.16 0 0 0 12.638 0c.164.133.332.263.502.387a12.86 12.86 0 0 1-2.054.99c.376.745.812 1.455 1.302 2.123a19.872 19.872 0 0 0 6.073-3.07c.6-6.182-1.018-11.534-4.27-16.27ZM8.92 16.5c-1.222 0-2.225-1.123-2.225-2.503 0-1.38.98-2.503 2.225-2.503 1.246 0 2.247 1.123 2.225 2.503 0 1.38-.979 2.503-2.225 2.503Zm6.16 0c-1.221 0-2.224-1.123-2.224-2.503 0-1.38.98-2.503 2.224-2.503 1.246 0 2.247 1.123 2.225 2.503 0 1.38-.979 2.503-2.225 2.503Z" />
    </svg>
  );
}

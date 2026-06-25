import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useServerFn } from "@tanstack/react-start";
import { loginWithAccessKey } from "@/lib/access-keys.functions";
import { Key as KeyIcon } from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"key" | "email">("key");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const keyLogin = useServerFn(loginWithAccessKey);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Generate your access key from Settings → Access Keys.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const onKeyLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { actionLink } = await keyLogin({ data: { key: accessKey.trim() } });
      window.location.href = actionLink;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid key");
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message);
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="font-mono text-sm tracking-widest text-muted-foreground">VANTAGE</div>
          <h1 className="mt-4 font-display font-black text-4xl tracking-[-0.04em]">
            {tab === "key" ? "Use your access key" : mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
        </div>

        <div className="flex gap-1 mb-6 rounded-full bg-surface/60 border border-border p-1">
          <button
            onClick={() => setTab("key")}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs transition ${tab === "key" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Access key
          </button>
          <button
            onClick={() => setTab("email")}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs transition ${tab === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Email / Google
          </button>
        </div>

        {tab === "key" ? (
          <form onSubmit={onKeyLogin} className="space-y-3">
            <div className="relative">
              <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                required
                placeholder="vk_xxxxxxxx_xxxxxxxx_xxxxxxxx"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full rounded-full border border-border bg-surface/60 pl-11 pr-5 py-3 text-sm font-mono outline-none focus:border-foreground/40 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? "..." : "Unlock with key"}
            </button>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-center pt-2">
              No key yet? Create one with Email / Google, then generate keys from Settings.
            </p>
          </form>
        ) : (
          <>
            <div className="flex gap-1 mb-4 rounded-full bg-surface/60 border border-border p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs transition ${
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "signin" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border border-border bg-surface/60 px-5 py-3 text-sm outline-none focus:border-foreground/40 transition"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-border bg-surface/60 px-5 py-3 text-sm outline-none focus:border-foreground/40 transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
              >
                {loading ? "..." : mode === "signin" ? "Log in" : "Create account"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={onGoogle}
              disabled={loading}
              className="w-full rounded-full border border-border bg-surface/60 px-4 py-3 text-sm hover:bg-surface-elevated disabled:opacity-50 transition"
            >
              Continue with Google
            </button>
          </>
        )}

        <p className="mt-8 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Built for defense · Calibrated for truth
        </p>
      </div>
    </div>
  );
}

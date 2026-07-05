import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { CinematicIntro } from "./CinematicIntro";
import { playClick } from "@/lib/sfx";

const INTRO_KEY = "vantage_intro_played";

export function AppFx() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [introKey, setIntroKey] = useState<string | null>(null);
  const [blurKey, setBlurKey] = useState<number>(0);
  const lastPath = useRef<string | null>(null);
  const bootDone = useRef(false);

  useEffect(() => {
    const norm = pathname.replace(/\/$/, "") || "/";
    if (!bootDone.current) {
      bootDone.current = true;
      lastPath.current = norm;
      let played = false;
      try { played = sessionStorage.getItem(INTRO_KEY) === "1"; } catch {}
      if (!played) {
        try { sessionStorage.setItem(INTRO_KEY, "1"); } catch {}
        setIntroKey(`boot-${Date.now()}`);
      }
      return;
    }
    if (norm !== lastPath.current) {
      setBlurKey((k) => k + 1);
    }
    lastPath.current = norm;
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest(
        "button, a, [role='button'], [role='tab'], [role='menuitem'], [role='option'], label, summary, .tag-pill, [data-sfx]",
      );
      if (!el) return;
      if ((el as HTMLElement).getAttribute("data-sfx") === "off") return;
      if ((el as HTMLButtonElement).disabled) return;
      playClick();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return (
    <>
      {introKey && (
        <CinematicIntro
          triggerKey={introKey}
          title="VANTAGE"
          subtitle="MULTI-AGENT OSINT RUNTIME"
          onDone={() => setIntroKey(null)}
        />
      )}
      {blurKey > 0 && <MotionBlurOverlay key={blurKey} />}
    </>
  );
}

function MotionBlurOverlay() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 750);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none motion-blur-root">
      <div className="absolute inset-0 motion-blur-streaks" />
      <div className="absolute inset-0 motion-blur-flash" />
      <style>{`
        @keyframes mb-fade { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes mb-streaks {
          0% { opacity: 0; transform: translateX(-6%) scaleX(1.2); filter: blur(0px); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translateX(6%) scaleX(1); filter: blur(2px); }
        }
        @keyframes mb-flash { 0%,100% { opacity: 0; } 20% { opacity: 0.35; } }
        .motion-blur-root { animation: mb-fade 750ms ease-out forwards; backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); }
        .motion-blur-streaks {
          background: repeating-linear-gradient(90deg, transparent 0 6px, oklch(0.85 0.2 300 / 0.08) 6px 7px, transparent 7px 22px);
          mix-blend-mode: screen;
          animation: mb-streaks 750ms cubic-bezier(.2,.7,.2,1) forwards;
        }
        .motion-blur-flash {
          background: radial-gradient(ellipse at center, oklch(0.98 0.1 300 / 0.5), transparent 70%);
          animation: mb-flash 550ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}


  const titleFor = (p: string) => {
    if (p === "/dashboard") return "DASHBOARD";
    if (p === "/settings") return "SETTINGS";
    return "VANTAGE";
  };
  const subFor = (p: string) => {
    if (p === "/dashboard") return "OPERATIONS CONSOLE ONLINE";
    if (p === "/settings") return "CONFIGURATION LAYER";
    return "MULTI-AGENT OSINT RUNTIME";
  };

  if (!introKey) return null;
  const norm = pathname.replace(/\/$/, "") || "/";
  return (
    <CinematicIntro
      triggerKey={introKey}
      title={titleFor(norm)}
      subtitle={subFor(norm)}
      onDone={() => setIntroKey(null)}
    />
  );
}

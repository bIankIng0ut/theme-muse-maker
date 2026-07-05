import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { CinematicIntro } from "./CinematicIntro";
import { playClick } from "@/lib/sfx";

const CINEMATIC_ROUTES = new Set(["/", "/dashboard", "/settings"]);

export function AppFx() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [introKey, setIntroKey] = useState<string | null>(null);
  const lastPath = useRef<string | null>(null);
  const bootDone = useRef(false);

  useEffect(() => {
    const norm = pathname.replace(/\/$/, "") || "/";
    if (!bootDone.current) {
      bootDone.current = true;
      lastPath.current = norm;
      if (CINEMATIC_ROUTES.has(norm)) setIntroKey(`boot-${Date.now()}`);
      return;
    }
    if (norm !== lastPath.current && CINEMATIC_ROUTES.has(norm)) {
      setIntroKey(`${norm}-${Date.now()}`);
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

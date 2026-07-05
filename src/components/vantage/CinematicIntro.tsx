import { useEffect, useMemo, useState } from "react";
import { playCinematic } from "@/lib/sfx";

type Props = {
  triggerKey: string;
  title?: string;
  subtitle?: string;
  durationMs?: number;
  onDone?: () => void;
};

export function CinematicIntro({
  triggerKey,
  title = "VANTAGE",
  subtitle = "MULTI-AGENT OSINT RUNTIME",
  durationMs = 5600,
  onDone,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  const sparkles = useMemo(
    () =>
      Array.from({ length: 60 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        d: Math.random() * 2.5,
        s: 0.6 + Math.random() * 1.4,
        hue: 270 + Math.random() * 90,
      })),
    [triggerKey],
  );

  const streaks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        top: (i * 100) / 14 + Math.random() * 4,
        delay: Math.random() * 1.2,
        dur: 0.9 + Math.random() * 0.7,
        opacity: 0.15 + Math.random() * 0.5,
      })),
    [triggerKey],
  );

  useEffect(() => {
    playCinematic();
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 3600);
    const t4 = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [triggerKey, durationMs, onDone]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-black cinematic-root"
      style={{ animation: `cine-fade-out 700ms ease-in ${(durationMs - 700)}ms forwards` }}
    >
      {/* Camera dolly wrapper */}
      <div className="absolute inset-0 cine-camera">
        {/* Deep space vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.15_0.15_290/0.9),black_75%)]" />

        {/* Iridescent nebulae */}
        <div
          className="absolute -top-1/4 left-1/4 h-[120vh] w-[80vw] cine-nebula"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.32 300 / 0.75), transparent 60%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute top-1/3 right-0 h-[100vh] w-[70vw] cine-nebula-2"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.30 355 / 0.7), transparent 62%)", filter: "blur(90px)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-[80vh] w-[70vw] cine-nebula"
          style={{ background: "radial-gradient(circle, oklch(0.68 0.25 35 / 0.6), transparent 65%)", filter: "blur(100px)" }}
        />

        {/* Light streaks */}
        {streaks.map((s, i) => (
          <div
            key={i}
            className="absolute left-[-20%] h-[1px] w-[140%] cine-streak"
            style={{
              top: `${s.top}%`,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
              background: "linear-gradient(90deg, transparent, oklch(0.98 0.05 300 / 0.9), transparent)",
              boxShadow: "0 0 12px oklch(0.75 0.25 300 / 0.8)",
            }}
          />
        ))}

        {/* Sparkles */}
        {sparkles.map((p, i) => (
          <div
            key={i}
            className="absolute cine-sparkle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.s * 3}px`,
              height: `${p.s * 3}px`,
              animationDelay: `${p.d}s`,
              background: `oklch(0.95 0.2 ${p.hue})`,
              borderRadius: "50%",
              boxShadow: `0 0 ${p.s * 10}px oklch(0.85 0.25 ${p.hue})`,
            }}
          />
        ))}

        {/* Scan grid */}
        <div
          className="absolute inset-0 opacity-20 cine-grid"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.85 0.2 300 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.2 300 / 0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />

        {/* Ring pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="cine-ring" />
          <div className="cine-ring cine-ring-2" />
          <div className="cine-ring cine-ring-3" />
        </div>

        {/* Title */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {phase >= 1 && (
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.6em] text-white/60 cine-sub">
              INITIALIZING RUNTIME
            </div>
          )}
          {phase >= 2 && (
            <h1
              className="mt-4 font-display font-black tracking-[-0.05em] text-[clamp(3.5rem,14vw,11rem)] leading-[0.85] cine-title"
              style={{
                background: "linear-gradient(120deg, oklch(0.98 0.05 300), oklch(0.75 0.28 320), oklch(0.85 0.25 30), oklch(0.98 0.05 300))",
                backgroundSize: "300% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 0 40px oklch(0.65 0.3 300 / 0.7))",
              }}
            >
              {title}
            </h1>
          )}
          {phase >= 3 && (
            <div className="mt-6 text-[10px] md:text-sm font-mono uppercase tracking-[0.5em] text-white/70 cine-sub-2">
              {subtitle}
            </div>
          )}
        </div>

        {/* Lens flare bloom */}
        {phase >= 2 && (
          <div className="absolute inset-0 pointer-events-none cine-flare">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[40vh] w-[40vh] rounded-full"
              style={{ background: "radial-gradient(circle, oklch(0.98 0.1 300 / 0.6), transparent 60%)", filter: "blur(20px)" }}
            />
          </div>
        )}

        {/* Cinematic bars */}
        <div className="absolute top-0 left-0 right-0 h-[10vh] bg-black cine-bar-top" />
        <div className="absolute bottom-0 left-0 right-0 h-[10vh] bg-black cine-bar-bot" />

        {/* Grain */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.9'/></svg>\")",
          }}
        />
      </div>

      <style>{`
        @keyframes cine-fade-out { to { opacity: 0; visibility: hidden; } }
        @keyframes cine-camera {
          0% { transform: scale(1.4) translate3d(-3%, 2%, 0); filter: blur(6px); }
          40% { transform: scale(1.15) translate3d(1%, -1%, 0); filter: blur(2px); }
          70% { transform: scale(1.02) translate3d(0,0,0); filter: blur(0); }
          100% { transform: scale(1.08) translate3d(0,0,0); filter: blur(0); }
        }
        .cine-camera { animation: cine-camera 5.6s cubic-bezier(.2,.7,.2,1) forwards; transform-origin: center; }
        @keyframes cine-nebula-drift {
          0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 0.4; }
          50% { opacity: 1; }
          100% { transform: translate3d(4%,-3%,0) rotate(8deg); opacity: 0.6; }
        }
        .cine-nebula { animation: cine-nebula-drift 6s ease-in-out infinite alternate; }
        .cine-nebula-2 { animation: cine-nebula-drift 7s ease-in-out infinite alternate-reverse; }
        @keyframes cine-streak {
          0% { transform: translateX(-100%) scaleX(0.2); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(100%) scaleX(1); opacity: 0; }
        }
        .cine-streak { animation-name: cine-streak; animation-timing-function: cubic-bezier(.2,.7,.2,1); animation-iteration-count: 2; }
        @keyframes cine-sparkle {
          0%,100% { opacity: 0; transform: scale(0.3); }
          40% { opacity: 1; transform: scale(1.4); }
          70% { opacity: 0.5; transform: scale(0.9); }
        }
        .cine-sparkle { animation: cine-sparkle 2.4s ease-in-out infinite; }
        @keyframes cine-grid-pulse {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 0.35; }
          100% { opacity: 0.1; transform: scale(1); }
        }
        .cine-grid { animation: cine-grid-pulse 4s ease-out forwards; }
        @keyframes cine-ring {
          0% { width: 0; height: 0; opacity: 0; border-width: 4px; }
          40% { opacity: 1; }
          100% { width: 140vmax; height: 140vmax; opacity: 0; border-width: 1px; }
        }
        .cine-ring {
          position: absolute; border-radius: 9999px;
          border: 2px solid oklch(0.85 0.25 300 / 0.7);
          box-shadow: 0 0 60px oklch(0.7 0.3 300 / 0.6), inset 0 0 40px oklch(0.7 0.3 300 / 0.5);
          animation: cine-ring 3.2s cubic-bezier(.2,.7,.2,1) forwards;
        }
        .cine-ring-2 { animation-delay: 0.8s; border-color: oklch(0.8 0.28 355 / 0.7); }
        .cine-ring-3 { animation-delay: 1.6s; border-color: oklch(0.85 0.22 35 / 0.7); }
        @keyframes cine-title {
          0% { opacity: 0; transform: translateY(30px) scale(0.9); letter-spacing: 0.4em; filter: blur(20px); }
          60% { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: -0.05em; filter: blur(0); background-position: 100% 50%; }
        }
        .cine-title { animation: cine-title 2.2s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes cine-sub { 0% { opacity: 0; transform: translateY(-8px); } 100% { opacity: 1; transform: translateY(0); } }
        .cine-sub { animation: cine-sub 1s ease-out forwards; }
        .cine-sub-2 { animation: cine-sub 1.4s ease-out forwards; }
        @keyframes cine-flare { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0.3; } }
        .cine-flare { animation: cine-flare 3s ease-out forwards; }
        @keyframes cine-bar-top { 0% { transform: translateY(-100%); } 100% { transform: translateY(0); } }
        @keyframes cine-bar-bot { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        .cine-bar-top { animation: cine-bar-top 800ms cubic-bezier(.7,0,.2,1) forwards; }
        .cine-bar-bot { animation: cine-bar-bot 800ms cubic-bezier(.7,0,.2,1) forwards; }
      `}</style>
    </div>
  );
}

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* top-left spotlight cone */}
      <div
        className="absolute -top-[20%] -left-[10%] h-[120vh] w-[70vw] opacity-70 animate-spot-drift"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.55 0 0 / 0.55), transparent 60%)",
          filter: "blur(40px)",
        }}
      />
      {/* faint secondary glow */}
      <div
        className="absolute top-[30%] right-[-10%] h-[70vh] w-[55vw] opacity-40 animate-spot-drift-2"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 80% 30%, oklch(0.42 0 0 / 0.45), transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      {/* grain */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay grain" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,oklch(0_0_0/0.7)_100%)]" />
    </div>
  );
}

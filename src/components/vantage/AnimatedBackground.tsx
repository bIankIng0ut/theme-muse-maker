export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* violet spotlight */}
      <div
        className="absolute -top-[20%] -left-[10%] h-[120vh] w-[70vw] opacity-80 animate-spot-drift"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.55 0.25 295 / 0.55), transparent 60%)",
          filter: "blur(60px)",
        }}
      />
      {/* pink secondary glow */}
      <div
        className="absolute top-[20%] right-[-15%] h-[80vh] w-[60vw] opacity-60 animate-spot-drift-2"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 80% 30%, oklch(0.62 0.22 350 / 0.45), transparent 65%)",
          filter: "blur(80px)",
        }}
      />
      {/* deep indigo low glow */}
      <div
        className="absolute bottom-[-20%] left-[20%] h-[70vh] w-[60vw] opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.40 0.20 275 / 0.55), transparent 65%)",
          filter: "blur(90px)",
        }}
      />
      {/* grain */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay grain" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,oklch(0.05_0.02_290/0.75)_100%)]" />
    </div>
  );
}

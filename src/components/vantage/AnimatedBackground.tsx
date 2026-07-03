export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div
        className="absolute -top-[25%] -left-[15%] h-[130vh] w-[75vw] opacity-70 animate-spot-drift"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 25% 25%, oklch(0.55 0.28 300 / 0.55), transparent 65%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="absolute top-[15%] right-[-20%] h-[90vh] w-[65vw] opacity-55 animate-spot-drift-2"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 75% 30%, oklch(0.60 0.24 350 / 0.5), transparent 68%)",
          filter: "blur(85px)",
        }}
      />
      <div
        className="absolute bottom-[-25%] left-[15%] h-[75vh] w-[65vw] opacity-45"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.42 0.22 270 / 0.6), transparent 68%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute top-[40%] left-[35%] h-[45vh] w-[45vw] opacity-30 animate-spot-drift"
        style={{
          background:
            "radial-gradient(ellipse 40% 40% at 50% 50%, oklch(0.72 0.20 30 / 0.35), transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.85 0.05 295 / 0.4) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.05 295 / 0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay grain" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,oklch(0.02_0.005_290/0.9)_100%)]" />
    </div>
  );
}

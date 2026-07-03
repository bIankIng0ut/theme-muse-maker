export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div
        className="absolute -top-[15%] left-[10%] h-[110vh] w-[70vw] opacity-90 animate-spot-drift"
        style={{
          background:
            "radial-gradient(ellipse 50% 45% at 30% 30%, oklch(0.55 0.30 300 / 0.75), transparent 62%)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute top-[5%] right-[-15%] h-[100vh] w-[65vw] opacity-80 animate-spot-drift-2"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 70% 30%, oklch(0.60 0.26 355 / 0.7), transparent 65%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute top-[35%] right-[5%] h-[70vh] w-[55vw] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 45% 45% at 60% 50%, oklch(0.68 0.22 35 / 0.55), transparent 68%)",
          filter: "blur(110px)",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[20%] h-[75vh] w-[60vw] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.45 0.24 275 / 0.7), transparent 68%)",
          filter: "blur(120px)",
        }}
      />
      <div
        className="absolute top-[45%] left-[30%] h-[50vh] w-[50vw] opacity-55 animate-spot-drift"
        style={{
          background:
            "radial-gradient(ellipse 40% 40% at 50% 50%, oklch(0.72 0.24 20 / 0.5), transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.85 0.05 295 / 0.35) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.05 295 / 0.35) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay grain" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,oklch(0.02_0.005_290/0.92)_95%)]" />
    </div>
  );
}

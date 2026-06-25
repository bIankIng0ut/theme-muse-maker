import { useMemo } from "react";

type Node = { id: string; label?: string; type?: string };
type Edge = { source: string; target: string; label?: string };

export function IdentityGraph({
  nodes,
  edges,
  height = 380,
}: {
  nodes: Node[];
  edges: Edge[];
  height?: number;
}) {
  const layout = useMemo(() => {
    if (!nodes.length) return { positions: new Map<string, { x: number; y: number }>() };
    const w = 720;
    const h = height;
    const cx = w / 2;
    const cy = h / 2;
    const positions = new Map<string, { x: number; y: number }>();
    // Center node = first; others ring around
    const [center, ...rest] = nodes;
    positions.set(center.id, { x: cx, y: cy });
    const r = Math.min(w, h) / 2 - 60;
    rest.forEach((n, i) => {
      const a = (i / rest.length) * Math.PI * 2 - Math.PI / 2;
      positions.set(n.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    });
    return { positions, w, h };
  }, [nodes, height]);

  if (!nodes.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-xs font-mono text-muted-foreground">
        No identity links discovered yet.
      </div>
    );
  }

  const w = 720;
  const h = height;

  return (
    <div className="rounded-lg border border-border bg-surface/60 backdrop-blur-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Identity Graph
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          {nodes.length} nodes · {edges.length} links
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.70 0.21 295 / 0.6)" />
          </marker>
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="oklch(0.70 0.21 295 / 0.55)" />
            <stop offset="100%" stopColor="oklch(0.70 0.21 295 / 0)" />
          </radialGradient>
        </defs>

        {edges.map((e, i) => {
          const a = layout.positions.get(e.source);
          const b = layout.positions.get(e.target);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="oklch(0.70 0.21 295 / 0.35)"
                strokeWidth={1}
                markerEnd="url(#arrow)"
              />
              {e.label && (
                <text x={mx} y={my - 4} textAnchor="middle" className="fill-muted-foreground" style={{ font: "9px ui-monospace" }}>
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((n, i) => {
          const p = layout.positions.get(n.id);
          if (!p) return null;
          const isCenter = i === 0;
          return (
            <g key={n.id}>
              {isCenter && <circle cx={p.x} cy={p.y} r={56} fill="url(#centerGlow)" />}
              <circle
                cx={p.x}
                cy={p.y}
                r={isCenter ? 26 : 18}
                fill={isCenter ? "oklch(0.70 0.21 295)" : "oklch(0.18 0.04 290 / 0.95)"}
                stroke={isCenter ? "oklch(0.85 0.18 295)" : "oklch(0.70 0.21 295 / 0.7)"}
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + (isCenter ? 44 : 32)}
                textAnchor="middle"
                style={{ font: "10px ui-monospace" }}
                className="fill-foreground"
              >
                {n.label ?? n.id}
              </text>
              {n.type && (
                <text
                  x={p.x}
                  y={p.y + (isCenter ? 56 : 44)}
                  textAnchor="middle"
                  style={{ font: "8px ui-monospace", letterSpacing: "0.1em" }}
                  className="fill-muted-foreground uppercase"
                >
                  {n.type}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

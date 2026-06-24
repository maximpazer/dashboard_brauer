"use client";

import { useRef, useState } from "react";

export interface RadarAxis {
  key: string;
  label: string;
  min: number;
  max: number;
}

/**
 * Interaktives Spinnennetz-/Radar-Diagramm als HANDFESTE Eingabe.
 *
 * Jede Achse ist ein ECHTES Modell-Merkmal (kein erfundenes Flavour-Wheel-Label) — der
 * Brauer zieht die Punkte und setzt damit direkt die Feature-Werte, mit denen das Modell
 * rechnet. Werte werden je Achse auf deren [min, max] normiert dargestellt.
 */
export function FlavorRadar({
  axes,
  values,
  defaults,
  onChange,
  size = 340,
}: {
  axes: RadarAxis[];
  values: Record<string, number>;
  /** Ausgangsprofil (z. B. Trainingsmediane) für die Referenz-Kontur. */
  defaults?: Record<string, number>;
  onChange: (key: string, value: number) => void;
  size?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 64; // Platz für Labels
  const N = axes.length;

  const angle = (i: number) => ((-90 + (360 / N) * i) * Math.PI) / 180;
  const fracOf = (a: RadarAxis, src: Record<string, number>) => {
    const v = src[a.key];
    if (v == null) return 0.5;
    return Math.max(0, Math.min(1, (v - a.min) / (a.max - a.min)));
  };
  const pt = (i: number, f: number): [number, number] => [
    cx + Math.cos(angle(i)) * R * f,
    cy + Math.sin(angle(i)) * R * f,
  ];

  function setFromEvent(e: React.PointerEvent, i: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scale = size / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    const proj = (px - cx) * Math.cos(angle(i)) + (py - cy) * Math.sin(angle(i));
    const f = Math.max(0, Math.min(1, proj / R));
    const a = axes[i];
    const span = a.max - a.min;
    let v = a.min + f * span;
    v = span <= 6 ? Math.round(v * 2) / 2 : Math.round(v * 100) / 100;
    onChange(a.key, v);
  }

  const valuePoly = axes.map((a, i) => pt(i, fracOf(a, values)).join(",")).join(" ");
  const defaultPoly = defaults
    ? axes.map((a, i) => pt(i, fracOf(a, defaults)).join(",")).join(" ")
    : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size, touchAction: "none", userSelect: "none" }}
      onPointerMove={(e) => active != null && setFromEvent(e, active)}
      onPointerUp={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
    >
      {/* Ringe */}
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon
          key={lvl}
          points={axes.map((_, i) => pt(i, lvl).join(",")).join(" ")}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={1}
        />
      ))}
      {/* Achsenlinien */}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border)" strokeWidth={1} />;
      })}

      {/* Referenz-Kontur (Standardprofil) */}
      {defaultPoly && (
        <polygon
          points={defaultPoly}
          fill="none"
          stroke="var(--color-ink-faint)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {/* Aktuelles Profil */}
      <polygon
        points={valuePoly}
        fill="var(--color-accent)"
        fillOpacity={0.15}
        stroke="var(--color-accent)"
        strokeWidth={2}
      />

      {/* Labels + Griffe */}
      {axes.map((a, i) => {
        const [hx, hy] = pt(i, fracOf(a, values));
        const lx = cx + Math.cos(angle(i)) * (R + 24);
        const ly = cy + Math.sin(angle(i)) * (R + 24);
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end";
        const val = values[a.key];
        return (
          <g key={a.key}>
            <text
              x={lx}
              y={ly - 6}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              fill="var(--color-ink-soft)"
            >
              {a.label}
            </text>
            <text
              x={lx}
              y={ly + 7}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--color-accent-strong)"
            >
              {val != null ? val.toFixed(1) : "—"}
            </text>
            <circle
              cx={hx}
              cy={hy}
              r={active === i ? 9 : 7}
              fill="var(--color-surface)"
              stroke="var(--color-accent)"
              strokeWidth={3}
              style={{ cursor: "grab" }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setActive(i);
                setFromEvent(e, i);
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Divergierender Balken für einen signierten Beitrag (z. B. SHAP-Treiber).
 * Grün = treibt nach oben, Rot = zieht nach unten. `maxAbs` skaliert die Breite.
 */
export function DriverBar({
  label,
  value,
  maxAbs,
  hint,
  badge,
}: {
  label: string;
  value: number;
  maxAbs: number;
  hint?: string;
  badge?: ReactNode;
}) {
  const neg = value < 0;
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span
          className={clsx(
            "text-sm font-bold tabular-nums",
            neg ? "text-negative" : "text-positive"
          )}
        >
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}
        </span>
      </div>
      <div className="mt-1.5 flex h-2 items-center">
        <div className="flex h-2 w-1/2 justify-end">
          {neg && (
            <div
              className="h-2 rounded-l-full bg-negative"
              style={{ width: `${Math.max(3, pct)}%` }}
            />
          )}
        </div>
        <div className="h-3 w-px bg-border-strong" />
        <div className="flex h-2 w-1/2">
          {!neg && (
            <div
              className="h-2 rounded-r-full bg-positive"
              style={{ width: `${Math.max(3, pct)}%` }}
            />
          )}
        </div>
      </div>
      {(hint || badge) && (
        <div className="mt-1 flex items-center gap-2">
          {hint && <p className="text-xs text-ink-faint">{hint}</p>}
          {badge}
        </div>
      )}
    </div>
  );
}

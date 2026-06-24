import clsx from "clsx";

/**
 * Ring-Gauge für den 1–5-Score. Voller Ring (Track) + Teal-Bogen ab 12 Uhr.
 * Optionales `delta` zeigt die Veränderung gegenüber einer Basis (Simulator).
 */
export function ScoreGauge({
  score,
  uncertainty,
  delta,
  breakdown,
  baseValue,
  totalValue,
  size = 176,
}: {
  score: number;
  uncertainty?: number;
  delta?: number;
  breakdown?: { label: string; value: number }[];
  baseValue?: number;
  totalValue?: number;
  size?: number;
}) {
  const frac = Math.max(0, Math.min(1, (score - 1) / 4));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const scoreColor =
    delta != null && Math.abs(delta) >= 0.05
      ? delta > 0
        ? "var(--color-positive)"
        : "var(--color-negative)"
      : "var(--color-accent)";

  return (
    <div className="group relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          style={{ transition: "stroke-dasharray 350ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular-nums text-ink">{score.toFixed(1)}</span>
        <span className="text-sm text-ink-faint">/ 5</span>
        {uncertainty != null && (
          <span className="mt-1 text-xs text-ink-faint">± {uncertainty.toFixed(1)}</span>
        )}
        {delta != null && Math.abs(delta) >= 0.05 && (
          <span
            className={clsx(
              "mt-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              delta > 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} vs. Basis
          </span>
        )}
      </div>
      {breakdown && breakdown.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 hidden w-80 -translate-x-1/2 rounded-xl border border-border bg-surface p-3 text-left shadow-xl group-hover:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Score-Zerlegung
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Modellbasis plus wichtigste Feature-Beiträge auf der Jury-Punkte-Skala.
          </p>
          <div className="mt-3 space-y-2">
            {baseValue != null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-faint">Modellbasis</span>
                <span className="font-semibold tabular-nums text-ink-soft">{baseValue.toFixed(2)}</span>
              </div>
            )}
            {breakdown.slice(0, 6).map((item) => (
              <div key={item.label} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-2 text-xs">
                <span className="truncate text-ink-soft">{item.label}</span>
                <div className="relative flex h-1.5 items-center rounded-full bg-surface-muted">
                  <div className="h-px w-1/2 bg-border-strong" />
                  <div className="h-px w-1/2 bg-border-strong" />
                  <div
                    className={clsx(
                      "absolute h-1.5 rounded-full",
                      item.value < 0 ? "bg-negative" : "bg-positive"
                    )}
                    style={{
                      left: item.value < 0 ? `${50 - Math.min(48, Math.abs(item.value) * 18)}%` : "50%",
                      width: `${Math.min(48, Math.abs(item.value) * 18)}%`,
                    }}
                  />
                </div>
                <span className={clsx("text-right font-semibold tabular-nums", item.value < 0 ? "text-negative" : "text-positive")}>
                  {item.value >= 0 ? "+" : ""}
                  {item.value.toFixed(2)}
                </span>
              </div>
            ))}
            {totalValue != null && (
              <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                <span className="text-ink-faint">Prognose</span>
                <span className="font-bold tabular-nums text-ink">{totalValue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

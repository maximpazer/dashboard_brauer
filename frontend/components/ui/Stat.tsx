import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

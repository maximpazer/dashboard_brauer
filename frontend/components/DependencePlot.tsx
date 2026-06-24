"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { Section } from "@/components/ui/Section";
import { InfoNote } from "@/components/ui/InfoNote";
import type { Feature, FeatureDependence } from "@/lib/types";

/**
 * SHAP-Dependence-Plot: Feature-Wert (x) vs. Einfluss auf TOTAL (y) über alle
 * Referenz-Biere. Markiert den Schwellenwert, ab dem der Effekt das Vorzeichen kippt
 * — so sieht der Brauer, wo Optimierung wirklich etwas bringt.
 */
export function DependencePlot({
  features,
  initial,
  compact = false,
}: {
  features: Feature[];
  initial?: string;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(initial ?? features[0]?.name ?? "");
  const [data, setData] = useState<FeatureDependence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true);
    setError(null);
    api
      .featureDependence(selected)
      .then((d) => active && setData(d))
      .catch((e) => active && setError((e as Error).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selected]);

  return (
    <Section
      title={compact ? "Kipp-Punkt" : "Wo lohnt sich Optimierung? · SHAP-Schwellenwerte"}
      icon={Activity}
      hint={
        compact
          ? undefined
          : "Jeder Punkt ist ein historisches Bier. Der markierte Kipp-Punkt zeigt, ab wann sich der Einfluss dreht."
      }
      action={
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex w-56 items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm font-medium text-ink shadow-sm outline-none transition hover:border-accent/50 focus:ring-2 focus:ring-accent"
          >
            <span className="truncate">{selected}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-30 mt-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl">
              {features.map((f) => {
                const active = f.name === selected;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => {
                      setSelected(f.name);
                      setOpen(false);
                    }}
                    className={
                      active
                        ? "w-full rounded-lg bg-accent-soft px-3 py-2 text-left text-sm font-semibold text-accent-strong"
                        : "w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-muted"
                    }
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      }
    >
      {error ? (
        <InfoNote tone="negative">Konnte Dependence-Daten nicht laden: {error}</InfoNote>
      ) : (
        <>
          <div className={compact ? "h-[28rem] w-full" : "h-72 w-full"}>
            {data && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 28, left: 4 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={["dataMin", "dataMax"]}
                    tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }}
                    stroke="var(--color-border-strong)"
                    label={{
                      value: `${data.feature} (Wert)`,
                      position: "insideBottom",
                      offset: -12,
                      fontSize: 12,
                      fill: "var(--color-ink-soft)",
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="shap"
                    tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }}
                    stroke="var(--color-border-strong)"
                    label={{
                      value: "Einfluss auf TOTAL",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                      fill: "var(--color-ink-soft)",
                    }}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--color-border-strong)", strokeDasharray: "3 3" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((v: any) => [Number(v).toFixed(2), "Einfluss auf TOTAL"]) as never}
                    labelFormatter={((x: number) => `${data.feature} = ${Number(x).toFixed(2)}`) as never}
                  />
                  <ReferenceLine y={0} stroke="var(--color-border-strong)" />
                  {data.threshold != null && (
                    <ReferenceLine
                      x={data.threshold}
                      stroke="var(--color-accent)"
                      strokeDasharray="5 4"
                      label={{
                        value: `Kipp-Punkt ≈ ${data.threshold.toFixed(2)}`,
                        position: "top",
                        fontSize: 11,
                        fill: "var(--color-accent-strong)",
                      }}
                    />
                  )}
                  <Scatter data={data.points} fillOpacity={0.7}>
                    {data.points.map((p, i) => (
                      <Cell
                        key={i}
                        fill={p.shap >= 0 ? "var(--color-positive)" : "var(--color-negative)"}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-faint">
                {loading ? "Lade Dependence…" : "Keine Daten"}
              </div>
            )}
          </div>
          {data?.note && (
            <InfoNote tone="accent" icon={Activity}>
              {data.note}
            </InfoNote>
          )}
        </>
      )}
    </Section>
  );
}

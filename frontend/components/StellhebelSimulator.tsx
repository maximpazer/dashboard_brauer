"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { Section } from "@/components/ui/Section";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import type { Feature, PredictResult } from "@/lib/types";

/**
 * What-if-Simulator: nimmt das Diagnose-Profil als Basis, lässt den Brauer Merkmale
 * verschieben und ruft debounced /api/predict auf — die Score-Prognose ändert sich live.
 */
export function StellhebelSimulator({
  features,
  result,
  compact = false,
}: {
  features: Feature[];
  result: PredictResult;
  compact?: boolean;
}) {
  const featureByName = useMemo(
    () => Object.fromEntries(features.map((f) => [f.name, f])) as Record<string, Feature>,
    [features]
  );
  const baseline = useMemo<Record<string, number>>(
    () => result.features ?? Object.fromEntries(features.map((f) => [f.name, f.median])),
    [result.features, features]
  );
  const baselineScore = result.score_1_5;

  const [sim, setSim] = useState<Record<string, number>>(baseline);
  const [simResult, setSimResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setSim(baseline);
    setSimResult(null);
  }, [baseline]);

  useEffect(() => {
    const changed = Object.keys(sim).some(
      (k) => Math.abs((sim[k] ?? 0) - (baseline[k] ?? 0)) > 1e-9
    );
    if (!changed) {
      setSimResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .predict(sim)
        .then(setSimResult)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [sim, baseline]);

  const rankedFeatures = useMemo(
    () =>
      Object.entries(result.feature_shap)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([name]) => name)
        .filter((name) => featureByName[name]),
    [result.feature_shap, featureByName]
  );

  const visible = showAll ? rankedFeatures : rankedFeatures.slice(0, 6);
  const score = simResult?.score_1_5 ?? baselineScore;
  const delta = score - baselineScore;

  return (
    <Section
      title={compact ? "Simulator" : "Stellhebel-Simulator"}
      icon={SlidersHorizontal}
      hint="Regler starten beim aktuellen Profil. Die kleine Zahl zeigt nur die Wertänderung; ob es hilft, siehst du an der Prognose."
      action={
        <button
          onClick={() => {
            setSim(baseline);
            setSimResult(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Zurücksetzen
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_10rem]">
        <div className="space-y-4">
          {visible.map((name) => {
            const f = featureByName[name];
            const val = sim[name] ?? f.median;
            const base = baseline[name] ?? f.median;
            const moved = Math.abs(val - base) > 1e-9;
            return (
              <label key={name} className="block">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-soft">{f.name}</span>
                  <span className="flex items-center gap-2">
                    {moved && (
                      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-strong">
                        Δ {val > base ? "+" : ""}
                        {(val - base).toFixed(2)}
                      </span>
                    )}
                    <span className="font-semibold tabular-nums text-accent">{val.toFixed(2)}</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={(f.max - f.min) / 100 || 0.01}
                  value={val}
                  onChange={(e) => setSim((prev) => ({ ...prev, [name]: parseFloat(e.target.value) }))}
                  className="mt-1 w-full accent-[var(--color-accent)]"
                />
              </label>
            );
          })}
          {rankedFeatures.length > 6 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-medium text-accent hover:underline"
            >
              {showAll ? "Weniger Merkmale" : `Alle ${rankedFeatures.length} Merkmale`}
            </button>
          )}
        </div>

        <div className="flex flex-col items-center justify-start gap-2 rounded-lg border border-border bg-surface-muted p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Prognose</span>
          <ScoreGauge score={score} delta={delta} size={140} />
          <span className="h-4 text-xs text-ink-faint">{loading ? "aktualisiere…" : ""}</span>
          <span className="text-center text-[11px] text-ink-faint">
            Basis {baselineScore.toFixed(1)} · jetzt {score.toFixed(1)}
          </span>
        </div>
      </div>
    </Section>
  );
}

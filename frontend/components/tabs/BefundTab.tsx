"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Scale } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBrewerState } from "@/lib/brewer-state";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { InfoNote } from "@/components/ui/InfoNote";
import { InfoBubble } from "@/components/ui/InfoBubble";
import { computeSynthesis } from "@/lib/formula";

export function BefundTab() {
  const { result, context, setActiveTab } = useBrewerState();
  const synthesis = useMemo(() => computeSynthesis(context), [context]);

  if (!result) {
    return (
      <InfoNote tone="accent" icon={Info}>
        Noch kein Befund. Erfasse zuerst unter <strong>Mein Bier</strong> dein Bier und starte die
        Diagnose.
      </InfoNote>
    );
  }

  const q = result.benchmark_quartiles_1_5;
  const drivers = (result.feature_drivers ?? []).slice(0, 8);
  const negativeDrivers = drivers.filter((d) => d.value < 0);
  const positiveDrivers = drivers.filter((d) => d.value > 0);
  const primary = result.primary_diagnosis;
  const hasNegative = negativeDrivers.length > 0;
  const mainIssue = negativeDrivers[0];
  const phaseContext = primary?.phase;
  const featurePlotData = drivers.map((d) => ({
    name: d.feature,
    value: d.value,
    hint: d.hint,
  }));
  const featureDomain = Math.max(0.5, ...featurePlotData.map((d) => Math.abs(d.value)));
  const phasePlotData = Object.entries(result.group_shap ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 7);
  const phaseDomain = Math.max(0.5, ...phasePlotData.map((d) => Math.abs(d.value)));

  const span = Math.max(0.001, q.max - q.min);
  const pos = (v: number) => ((v - q.min) / span) * 100;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Befund</h1>
        <InfoBubble text="Der Befund startet bei konkreten Merkmalen. Prozessphasen sind XAI-Kontext für die spätere Fehlersuche." />
      </header>

      {/* Score + Benchmark + Primärbefund */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3">
          <ScoreGauge
            score={result.score_1_5}
            uncertainty={result.score_1_5_uncertainty}
            breakdown={drivers.map((d) => ({ label: d.feature, value: d.value }))}
            baseValue={result.base_value}
            totalValue={result.predicted_total}
          />
          <div className="w-full">
            <div className="relative h-2.5 w-full rounded-full bg-surface-muted">
              <div
                className="absolute inset-y-0 rounded-full bg-accent-soft"
                style={{ left: `${pos(q.p25)}%`, width: `${pos(q.p75) - pos(q.p25)}%` }}
              />
              <div className="absolute inset-y-[-3px] w-0.5 bg-border-strong" style={{ left: `${pos(q.mean)}%` }} />
              <div className="absolute inset-y-[-3px] w-1 rounded bg-accent" style={{ left: `${pos(result.score_1_5)}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
              <span>Mangelhaft (1)</span>
              <span>Exzellent (5)</span>
            </div>
            <p className="mt-2 text-center text-xs text-ink-soft">
              {result.score_1_5 >= q.p75
                ? "Oberes Quartil im Stil-Feld."
                : result.score_1_5 <= q.p25
                  ? "Unteres Quartil im Stil-Feld."
                  : "Mittlerer Bereich im Stil-Feld."}
            </p>
          </div>
        </Card>

        <Card className={hasNegative ? "border-negative/30 bg-negative-soft/40" : "border-positive/30 bg-positive-soft/40"}>
          <div className="flex items-center gap-2">
            {hasNegative ? (
              <AlertTriangle className="h-5 w-5 text-negative" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-positive" />
            )}
            <h2 className="text-sm font-semibold text-ink">
              {hasNegative ? "Haupttreiber" : "Stabil"}
            </h2>
          </div>
          <p className="mt-3 text-3xl font-bold text-ink">
            {hasNegative ? mainIssue?.feature : "Kein klarer Schwachpunkt"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {mainIssue && (
              <span className="rounded-full border border-negative/30 bg-surface px-3 py-1 text-sm font-semibold tabular-nums text-negative">
                {mainIssue.value.toFixed(2)}
              </span>
            )}
            {phaseContext && (
              <span
                className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-ink-soft"
                title="Hard Group-SHAP: stärkste Prozessgruppe. Nicht automatisch die alleinige Ursache."
              >
                Kontext: {phaseContext}
              </span>
            )}
          </div>
          <button
            onClick={() => setActiveTab("was-tun")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            Zur Empfehlung
            <ArrowRight className="h-4 w-4" />
          </button>
        </Card>
      </div>

      {/* Top-Treiber */}
      {drivers.length > 0 && (
        <Section
          title="Merkmale"
          action={
            <InfoBubble text="Feature-SHAP: links senkt die Prognose, rechts hebt sie." />
          }
        >
          <div className="h-[22rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featurePlotData}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 12 }}
              >
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-featureDomain, featureDomain]}
                  tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }}
                  stroke="var(--color-border-strong)"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }}
                  stroke="var(--color-border-strong)"
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 122, 24, 0.08)" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-ink)",
                    fontSize: 12,
                  }}
                  formatter={(v) => [Number(v).toFixed(2), "Beitrag"]}
                />
                <ReferenceLine x={0} stroke="var(--color-border-strong)" />
                <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                  {featurePlotData.map((d) => (
                    <Cell key={d.name} fill={d.value < 0 ? "var(--color-negative)" : "var(--color-positive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {phasePlotData.length > 0 && (
        <Section
          title="Prozesskontext"
          action={
            <InfoBubble text="Hard Group-SHAP fasst Feature-Beiträge nach Prozessphasen zusammen. Das ist XAI-Kontext, nicht automatisch die alleinige Ursache." />
          }
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={phasePlotData}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 12 }}
              >
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-phaseDomain, phaseDomain]}
                  tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }}
                  stroke="var(--color-border-strong)"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }}
                  stroke="var(--color-border-strong)"
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 122, 24, 0.08)" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-ink)",
                    fontSize: 12,
                  }}
                  formatter={(v) => [Number(v).toFixed(2), "Group-SHAP"]}
                />
                <ReferenceLine x={0} stroke="var(--color-border-strong)" />
                <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                  {phasePlotData.map((d) => (
                    <Cell key={d.name} fill={d.value < 0 ? "var(--color-negative)" : "var(--color-accent)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Synthese: was das Modell nicht sieht */}
      <Section
        title="Jury-Kontext"
        icon={Scale}
        action={
          <InfoBubble text="Diese Kategorien fließen nicht direkt ins Modell ein, können aber den echten Jury-Score stark beeinflussen." />
        }
      >
        {synthesis.ratedWeight === 0 ? (
          <InfoNote tone="accent" icon={Info}>
            Noch nicht bewertet. Ergänze sie unter{" "}
            <button onClick={() => setActiveTab("mein-bier")} className="font-semibold underline">
              Mein Bier
            </button>
            .
          </InfoNote>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {synthesis.blocks.map((b) => {
                const maxShare = Math.max(0.001, ...synthesis.blocks.map((x) => x.weightedShare ?? 0));
                const isWeak = b === synthesis.weakestBlock;
                return (
                  <div key={b.key} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 text-sm">
                    <span className="text-ink-soft">
                      {b.label}
                      <span className="ml-1 text-[11px] text-ink-faint">{Math.round(b.weight * 100)}%</span>
                    </span>
                    <div className="h-2.5 rounded-full bg-surface-muted">
                      <div
                        className={isWeak ? "h-2.5 rounded-full bg-negative" : "h-2.5 rounded-full bg-accent"}
                        style={{ width: `${((b.weightedShare ?? 0) / maxShare) * 100}%` }}
                      />
                    </div>
                    <span className="text-right text-ink-faint">
                      {b.rating == null ? "—" : `${b.rating.toFixed(1)}/5`}
                    </span>
                  </div>
                );
              })}
            </div>
            {synthesis.weakestBlock && (
              <InfoNote tone="negative" icon={AlertTriangle}>
                Schwächster Jury-Block: <strong>{synthesis.weakestBlock.label}</strong>
              </InfoNote>
            )}
          </div>
        )}
      </Section>

      <details className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-soft">
        <summary className="cursor-pointer font-semibold text-ink">Modellhinweis</summary>
        <p className="mt-2">
          Vorhersage: {result.predicted_total.toFixed(1)} Punkte · R²={result.r2.toFixed(2)} · RMSE ≈ ±
          {result.rmse.toFixed(1)} · n={result.n_beers}. Nicht bewertete Merkmale liegen auf dem
          Trainingsmedian.
        </p>
      </details>
    </div>
  );
}

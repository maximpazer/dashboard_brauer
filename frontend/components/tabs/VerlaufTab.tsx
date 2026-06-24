"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Plus, TrendingDown, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import type { Batch } from "@/lib/types";
import { useBrewerState } from "@/lib/brewer-state";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { InfoNote } from "@/components/ui/InfoNote";

export function VerlaufTab() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { inputs, note, context, result, resetForNewBatch } = useBrewerState();

  function reload() {
    api.batchesList().then(setBatches).catch((e) => setError(e.message));
  }

  useEffect(() => {
    reload();
  }, []);

  async function saveSud() {
    setSaving(true);
    try {
      await api.saveBatch(inputs, note, undefined, context);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  }

  const compareA = batches?.find((b) => b.id === compareIds[0]);
  const compareB = batches?.find((b) => b.id === compareIds[1]);

  if (error) return <InfoNote tone="negative">⚠ {error}</InfoNote>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Verlauf · Second Brain</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Historie deiner Sude und die Wirkung deiner Anpassungen. Wähle zwei Sude zum Vergleich.
          </p>
        </div>
        <button
          onClick={resetForNewBatch}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
        >
          <Plus className="h-4 w-4" />
          Neuer Sud
        </button>
      </div>

      {result && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/30 bg-accent-soft/40">
          <p className="text-sm text-ink-soft">
            Aktueller Sud noch nicht gespeichert (Score{" "}
            <strong className="text-ink">{result.score_1_5.toFixed(1)} / 5</strong>).
          </p>
          <button
            onClick={saveSud}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {saving ? "Speichere…" : "Diesen Sud speichern"}
          </button>
        </Card>
      )}

      {!batches ? (
        <p className="text-ink-faint">Lade Verlauf…</p>
      ) : batches.length === 0 ? (
        <InfoNote tone="neutral">Noch keine Sude gespeichert.</InfoNote>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-muted text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Datum / Sud</th>
                <th className="px-4 py-2.5 text-left font-semibold">Score</th>
                <th className="px-4 py-2.5 text-left font-semibold">Notiz</th>
                <th className="px-4 py-2.5 text-right font-semibold">Vergleichen</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const selected = compareIds.includes(b.id);
                return (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-ink">{b.label}</p>
                      <p className="text-xs text-ink-faint">
                        {new Date(b.created_at).toLocaleString("de-DE")}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-strong">
                        {b.score_1_5.toFixed(1)}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-2.5 text-ink-soft">{b.note || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => toggleCompare(b.id)}
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          selected
                            ? "border-accent bg-accent text-white"
                            : "border-border text-ink-soft hover:border-accent/50"
                        )}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        {selected ? "Ausgewählt" : "Auswählen"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {compareA && compareB && <CompareView a={compareA} b={compareB} />}
    </div>
  );
}

function CompareView({ a, b }: { a: Batch; b: Batch }) {
  const scoreDelta = b.score_1_5 - a.score_1_5;
  const phases = Array.from(new Set([...Object.keys(a.group_shap), ...Object.keys(b.group_shap)]));
  const contextKeys = Array.from(
    new Set([...Object.keys(a.context ?? {}), ...Object.keys(b.context ?? {})])
  );

  return (
    <Section title={`Vergleich: ${a.label} → ${b.label}`} icon={scoreDelta >= 0 ? TrendingUp : TrendingDown}>
      <div
        className={clsx(
          "mb-4 flex items-center gap-3 rounded-lg border p-4",
          scoreDelta >= 0 ? "border-positive/30 bg-positive-soft/40" : "border-negative/30 bg-negative-soft/40"
        )}
      >
        <span className="text-2xl font-bold tabular-nums text-ink">{a.score_1_5.toFixed(1)}</span>
        <ArrowRight className="h-5 w-5 text-ink-faint" />
        <span className="text-2xl font-bold tabular-nums text-ink">{b.score_1_5.toFixed(1)}</span>
        <span
          className={clsx(
            "ml-2 rounded-full px-2.5 py-1 text-sm font-bold",
            scoreDelta >= 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"
          )}
        >
          {scoreDelta >= 0 ? "+" : ""}
          {scoreDelta.toFixed(2)}
        </span>
        <span className="text-sm text-ink-soft">
          {scoreDelta >= 0 ? "verbessert" : "verschlechtert"}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-faint">
            <th className="py-1.5 font-medium">Brauphase (SHAP)</th>
            <th className="py-1.5 text-right font-medium">A</th>
            <th className="py-1.5 text-right font-medium">B</th>
            <th className="py-1.5 text-right font-medium">Δ</th>
          </tr>
        </thead>
        <tbody>
          {phases.map((p) => {
            const va = a.group_shap[p] ?? 0;
            const vb = b.group_shap[p] ?? 0;
            const diff = vb - va;
            return (
              <tr key={p} className="border-t border-border">
                <td className="py-1.5 text-ink-soft">{p}</td>
                <td className="py-1.5 text-right tabular-nums text-ink-faint">{va.toFixed(2)}</td>
                <td className="py-1.5 text-right tabular-nums text-ink-faint">{vb.toFixed(2)}</td>
                <td
                  className={clsx(
                    "py-1.5 text-right font-semibold tabular-nums",
                    Math.abs(diff) < 0.005 ? "text-ink-faint" : diff > 0 ? "text-positive" : "text-negative"
                  )}
                >
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {contextKeys.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Sensorik-Kontext (Jury-Kategorien)
          </p>
          <table className="w-full text-sm">
            <tbody>
              {contextKeys.map((k) => {
                const va = a.context?.[k];
                const vb = b.context?.[k];
                const diff = (vb ?? 0) - (va ?? 0);
                return (
                  <tr key={k} className="border-t border-border">
                    <td className="py-1.5 text-ink-soft">{k}</td>
                    <td className="py-1.5 text-right tabular-nums text-ink-faint">{va?.toFixed(1) ?? "—"}</td>
                    <td className="py-1.5 text-right tabular-nums text-ink-faint">{vb?.toFixed(1) ?? "—"}</td>
                    <td
                      className={clsx(
                        "py-1.5 text-right font-semibold tabular-nums",
                        va == null || vb == null || Math.abs(diff) < 0.05
                          ? "text-ink-faint"
                          : diff > 0
                            ? "text-positive"
                            : "text-negative"
                      )}
                    >
                      {va == null || vb == null ? "—" : `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

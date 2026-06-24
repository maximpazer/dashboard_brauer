"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Batch } from "@/lib/types";
import { useBrewerState } from "@/lib/brewer-state";

export function VerlaufTab() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { inputs, note, result, resetForNewBatch } = useBrewerState();

  function reload() {
    api.batchesList().then(setBatches).catch((e) => setError(e.message));
  }

  useEffect(() => {
    reload();
  }, []);

  async function saveSud() {
    setSaving(true);
    try {
      await api.saveBatch(inputs, note);
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

  if (error) return <p className="text-red-700">⚠ {error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Second Brain / Verlauf</h1>
          <p className="mt-1 text-sm text-slate-600">
            Historie deiner Sude und die Auswirkungen deiner Anpassungen.
          </p>
        </div>
        <button
          onClick={resetForNewBatch}
          className="rounded-lg border border-amber-600 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
        >
          + Neuen Sud starten
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">
            Aktueller Sud noch nicht gespeichert (Score {result.score_1_5.toFixed(1)} / 5).
          </p>
          <button
            onClick={saveSud}
            disabled={saving}
            className="mt-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? "Speichere…" : "Diesen Sud im Verlauf speichern"}
          </button>
        </div>
      )}

      {!batches ? (
        <p className="text-slate-500">Lade Verlauf…</p>
      ) : batches.length === 0 ? (
        <p className="text-slate-500">Noch keine Sude gespeichert.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Datum / Sud</th>
                <th className="px-4 py-2 text-left">Score</th>
                <th className="px-4 py-2 text-left">Notiz</th>
                <th className="px-4 py-2 text-right">Vergleichen</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <p className="font-bold text-slate-800">{b.label}</p>
                    <p className="text-xs text-slate-400">{new Date(b.created_at).toLocaleString("de-DE")}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
                      {b.score_1_5.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{b.note || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <label className="inline-flex items-center gap-1.5 text-amber-700">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(b.id)}
                        onChange={() => toggleCompare(b.id)}
                      />
                      Auswählen
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {compareA && compareB && <CompareView a={compareA} b={compareB} />}
    </div>
  );
}

function CompareView({ a, b }: { a: Batch; b: Batch }) {
  const phases = Array.from(new Set([...Object.keys(a.group_shap), ...Object.keys(b.group_shap)]));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">
        Vergleich: {a.label} vs. {b.label}
      </h2>
      <p className="mb-2 text-sm text-slate-600">
        Score: {a.score_1_5.toFixed(1)} → {b.score_1_5.toFixed(1)} (
        {b.score_1_5 - a.score_1_5 >= 0 ? "+" : ""}
        {(b.score_1_5 - a.score_1_5).toFixed(2)})
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">Stufe</th>
            <th className="py-1 text-right">{a.label}</th>
            <th className="py-1 text-right">{b.label}</th>
            <th className="py-1 text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          {phases.map((p) => {
            const va = a.group_shap[p] ?? 0;
            const vb = b.group_shap[p] ?? 0;
            const diff = vb - va;
            return (
              <tr key={p} className="border-t border-slate-100">
                <td className="py-1">{p}</td>
                <td className="py-1 text-right">{va.toFixed(2)}</td>
                <td className="py-1 text-right">{vb.toFixed(2)}</td>
                <td className={`py-1 text-right font-semibold ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

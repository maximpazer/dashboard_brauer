"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Feature, GroupsSummary } from "@/lib/types";
import { useBrewerState } from "@/lib/brewer-state";

const MACRO_FEATURES = ["stammwuerze", "alkoholgehalt"];

export function MeinBierTab() {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [summary, setSummary] = useState<GroupsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { inputs, setInputs, note, setNote, setResult, setActiveTab } = useBrewerState();

  useEffect(() => {
    Promise.all([api.features(), api.groupsSummary()])
      .then(([fs, gs]) => {
        setFeatures(fs);
        setSummary(gs);
        setInputs((prev) =>
          Object.keys(prev).length > 0 ? prev : Object.fromEntries(fs.map((f) => [f.name, f.median]))
        );
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    if (!features || !summary) return [];
    return summary.phases
      .map((phase) => ({
        phase,
        features: features.filter((f) => f.phase === phase.name && !MACRO_FEATURES.includes(f.name)),
      }))
      .filter((g) => g.features.length > 0);
  }, [features, summary]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.predict(inputs);
      setResult(res);
      setActiveTab("prognose");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (error) return <p className="text-red-700">⚠ {error}</p>;
  if (!features) return <p className="text-slate-500">Lade Sensorik-Merkmale…</p>;

  const macro = features.filter((f) => MACRO_FEATURES.includes(f.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mein Bier</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gib das Sensorikprofil deines aktuellen Sudes ein — dieselben Merkmale, die auch die
          Jury bewertet. Nicht angepasste Regler bleiben auf dem Stil-Median.
        </p>
      </div>

      <div className="space-y-3 rounded-lg bg-slate-50 p-4 md:w-1/2">
        <h2 className="text-sm font-semibold text-slate-700">Makro-Parameter</h2>
        {macro.map((f) => (
          <Slider key={f.name} feature={f} value={inputs[f.name]} onChange={(v) => setInputs({ ...inputs, [f.name]: v })} />
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Sensorik — nach Brauprozess-Stufe gruppiert
        </h2>
        <div className="space-y-4">
          {grouped.map(({ phase, features: feats }) => (
            <div key={phase.name} className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                {phase.icon} {phase.name}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {feats.map((f) => (
                  <Slider key={f.name} feature={f} value={inputs[f.name]} onChange={(v) => setInputs({ ...inputs, [f.name]: v })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm font-semibold text-slate-700">Notizen zu diesem Sud</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Z.B. Gärtemperatur 21°C, Hefe W68. Was stört dich am meisten an diesem Sud?"
          rows={3}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "Berechne…" : "Zur Prognose"}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Slider({ feature, value, onChange }: { feature: Feature; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{feature.name}</span>
        <span className="font-semibold text-amber-800">{(value ?? feature.median).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={feature.min}
        max={feature.max}
        step={(feature.max - feature.min) / 100}
        value={value ?? feature.median}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-amber-500"
      />
      <p className="mt-0.5 text-xs text-slate-400">{feature.hint}</p>
    </label>
  );
}

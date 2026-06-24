"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import type {
  DefectRatings,
  DiagnosisOptions,
  Feature,
  GroupsSummary,
  GuidedRatings,
  KnownParams,
  ProblemKey,
} from "@/lib/types";
import { useBrewerState } from "@/lib/brewer-state";

const MACRO_FEATURES = ["stammwuerze", "alkoholgehalt"];

export function MeinBierTab() {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [summary, setSummary] = useState<GroupsSummary | null>(null);
  const [options, setOptions] = useState<DiagnosisOptions | null>(null);
  const [problem, setProblem] = useState<ProblemKey | null>(null);
  const [ratings, setRatings] = useState<GuidedRatings>({});
  const [defects, setDefects] = useState<DefectRatings>({});
  const [knownParams, setKnownParams] = useState<KnownParams>({});
  const [showAllAxes, setShowAllAxes] = useState(false);
  const [expertMode, setExpertMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { inputs, setInputs, note, setNote, setResult, setActiveTab } = useBrewerState();

  useEffect(() => {
    Promise.all([api.features(), api.groupsSummary(), api.diagnosisOptions()])
      .then(([fs, gs, diagnosisOptions]) => {
        setFeatures(fs);
        setSummary(gs);
        setOptions(diagnosisOptions);
        setInputs((prev) =>
          Object.keys(prev).length > 0 ? prev : Object.fromEntries(fs.map((f) => [f.name, f.median]))
        );
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProblem = options?.problems.find((p) => p.key === problem);

  const visibleRatingAxes = useMemo(() => {
    if (!options) return [];
    if (!selectedProblem || showAllAxes || problem === "score_only") return options.rating_axes;
    const focus = new Set(selectedProblem.focus);
    return options.rating_axes.filter((axis) => focus.has(axis.key));
  }, [options, problem, selectedProblem, showAllAxes]);

  const groupedExpert = useMemo(() => {
    if (!features || !summary) return [];
    return summary.phases
      .map((phase) => ({
        phase,
        features: features.filter((f) => f.phase === phase.name && !MACRO_FEATURES.includes(f.name)),
      }))
      .filter((g) => g.features.length > 0);
  }, [features, summary]);

  function changedExpertFeatures(): Record<string, number> {
    if (!features || !expertMode) return {};
    return Object.fromEntries(
      features
        .filter((f) => !MACRO_FEATURES.includes(f.name))
        .filter((f) => Math.abs((inputs[f.name] ?? f.median) - f.median) > 1e-9)
        .map((f) => [f.name, inputs[f.name] ?? f.median])
    );
  }

  async function submit() {
    if (!problem) {
      setError("Bitte wähle zuerst das Hauptproblem aus.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.diagnose({
        problem,
        ratings,
        defects,
        known_params: knownParams,
        process_note: note,
        expert_features: changedExpertFeatures(),
      });
      setResult(res);
      if (res.features) setInputs(res.features);
      setActiveTab("naechste-schritte");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">⚠ {error}</p>
        <button onClick={() => setError(null)} className="text-sm font-medium text-amber-700 hover:underline">
          Zurück zur Eingabe
        </button>
      </div>
    );
  }
  if (!features || !options) return <p className="text-slate-500">Lade Diagnose-Eingabe…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Problem erfassen</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Beschreibe dein Bier wie ein Brauer, nicht wie ein Modell. Das Dashboard übersetzt deine
          Angaben intern auf die 20 Sensorik-Features; nicht bewertete Merkmale bleiben auf dem
          Trainingsmedian.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">1 · Hauptproblem</h2>
            <p className="text-xs text-slate-500">Wähle den Anlass der Diagnose. Danach zeigen wir nur relevante Kernfragen.</p>
          </div>
          {selectedProblem && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              Fokus: {selectedProblem.label}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {options.problems.map((item) => (
            <button
              key={item.key}
              onClick={() => setProblem(item.key)}
              className={clsx(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                problem === item.key
                  ? "border-amber-500 bg-amber-50 font-semibold text-amber-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">2 · Sensorische Kurzbewertung</h2>
            <p className="text-xs text-slate-500">
              Nur angefasste Regler werden als Brauer-Angabe übernommen. Nicht bewertete Achsen bleiben Standardprofil.
            </p>
          </div>
          <button
            onClick={() => setShowAllAxes((v) => !v)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {showAllAxes ? "Nur Fokusfragen" : "Alle Kernachsen anzeigen"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleRatingAxes.map((axis) => (
            <FivePointSlider
              key={axis.key}
              label={axis.label}
              description={axis.description}
              value={ratings[axis.key as keyof GuidedRatings] ?? null}
              onChange={(value) => setRatings((prev) => ({ ...prev, [axis.key]: value }))}
              onClear={() => setRatings((prev) => ({ ...prev, [axis.key]: null }))}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">3 · Fehlaromen</h2>
        <p className="text-xs text-slate-500">Nur wahrnehmbare Defekte setzen. Stärke 0 bedeutet: nicht als Problem bewerten.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {options.defect_axes.map((axis) => (
            <FivePointSlider
              key={axis.key}
              label={axis.label}
              description={`Modellfeatures: ${axis.features.join(", ")}`}
              minLabel="nicht wahrnehmbar"
              maxLabel="stark"
              zeroBased
              value={defects[axis.key as keyof DefectRatings] ?? null}
              onChange={(value) => setDefects((prev) => ({ ...prev, [axis.key]: value }))}
              onClear={() => setDefects((prev) => ({ ...prev, [axis.key]: null }))}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">4 · Bekannte Messwerte</h2>
          <p className="text-xs text-slate-500">Optional. Wenn leer, nutzt das Modell den Trainingsmedian.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumberField
              label="Stammwürze"
              value={knownParams.stammwuerze}
              placeholder="z.B. 12.5"
              onChange={(v) => setKnownParams((prev) => ({ ...prev, stammwuerze: v }))}
            />
            <NumberField
              label="Alkoholgehalt"
              value={knownParams.alkoholgehalt}
              placeholder="z.B. 5.3"
              onChange={(v) => setKnownParams((prev) => ({ ...prev, alkoholgehalt: v }))}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="text-sm font-semibold text-slate-800">5 · Prozessnotiz für Qwen</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Z.B. Hefestamm, Gärtemperatur, Ferulasäurerast, Reifedauer, Abfüllproblem…"
            rows={5}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <button
          onClick={() => setExpertMode((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Expert-Modus: alle 20 Modellfeatures
          <span className="text-xs font-normal text-slate-500">{expertMode ? "ausblenden" : "anzeigen"}</span>
        </button>
        {expertMode && summary && (
          <div className="mt-4 space-y-4">
            {groupedExpert.map(({ phase, features: feats }) => (
              <div key={phase.name} className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  {phase.icon} {phase.name}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {feats.map((f) => (
                    <FeatureSlider
                      key={f.name}
                      feature={f}
                      value={inputs[f.name]}
                      onChange={(v) => setInputs({ ...inputs, [f.name]: v })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? "Diagnose läuft…" : "Diagnose erstellen"}
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="max-w-xl text-xs text-slate-500">{options.model_note}</p>
      </div>
    </div>
  );
}

function FivePointSlider({
  label,
  description,
  value,
  onChange,
  onClear,
  minLabel = "niedrig",
  maxLabel = "hoch",
  zeroBased = false,
}: {
  label: string;
  description?: string;
  value: number | null;
  onChange: (v: number) => void;
  onClear: () => void;
  minLabel?: string;
  maxLabel?: string;
  zeroBased?: boolean;
}) {
  const min = zeroBased ? 0 : 1;
  const displayValue = value ?? (zeroBased ? 0 : 3);
  return (
    <label className="block rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={clsx("font-semibold", value === null ? "text-slate-400" : "text-amber-800")}>
          {value === null ? "nicht bewertet" : value.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={5}
        step={0.5}
        value={displayValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-amber-500"
      />
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      {value !== null && (
        <button type="button" onClick={onClear} className="mt-2 text-xs font-medium text-slate-500 hover:text-amber-700">
          Als nicht bewertet setzen
        </button>
      )}
    </label>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value?: number | null;
  placeholder?: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-amber-500"
      />
    </label>
  );
}

function FeatureSlider({ feature, value, onChange }: { feature: Feature; value: number; onChange: (v: number) => void }) {
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

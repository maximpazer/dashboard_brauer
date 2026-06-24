"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  FlaskConical,
  Gauge,
  RotateCcw,
  Scale,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useBrewerState } from "@/lib/brewer-state";
import { FlavorRadar, type RadarAxis } from "@/components/FlavorRadar";
import { SensorikKontext } from "@/components/SensorikKontext";
import { Section } from "@/components/ui/Section";
import { InfoNote } from "@/components/ui/InfoNote";
import { InfoBubble } from "@/components/ui/InfoBubble";
import type {
  DefectRatings,
  DiagnosisOptions,
  Feature,
  GroupsSummary,
  KnownParams,
} from "@/lib/types";

const MACRO_FEATURES = ["stammwuerze", "alkoholgehalt"];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const DESCRIPTOR_NAMES = [
  "Cremigkeit",
  "Vollmundigkeit",
  "Säure",
  "Karamell",
  "Biskuit",
  "Honig",
  "Fruchtaroma / Fruchtester",
  "Gewürzaroma / phenolisch",
];
const DESCRIPTOR_SET = new Set(DESCRIPTOR_NAMES.map(norm));

function isDescriptor(name: string): boolean {
  const n = norm(name);
  return (
    DESCRIPTOR_SET.has(n) ||
    n.includes("fruchtaroma") ||
    n.includes("gewürzaroma") ||
    n.includes("cremig") ||
    n.includes("vollmund")
  );
}

function shortLabel(name: string): string {
  const n = norm(name);
  if (n.includes("frucht")) return "Frucht / Ester";
  if (n.includes("gewürz")) return "Gewürz / Nelke";
  return name;
}

export function ErfassenTab() {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [summary, setSummary] = useState<GroupsSummary | null>(null);
  const [options, setOptions] = useState<DiagnosisOptions | null>(null);
  const [defects, setDefects] = useState<DefectRatings>({});
  const [knownParams, setKnownParams] = useState<KnownParams>({});
  const [openMeasure, setOpenMeasure] = useState(false);
  const [openContext, setOpenContext] = useState(false);
  const [openExpert, setOpenExpert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { inputs, setInputs, note, setNote, context, setContext, setResult, setActiveTab } =
    useBrewerState();

  useEffect(() => {
    Promise.all([api.features(), api.groupsSummary(), api.diagnosisOptions()])
      .then(([fs, gs, opts]) => {
        setFeatures(fs);
        setSummary(gs);
        setOptions(opts);
        setInputs((prev) =>
          Object.keys(prev).length > 0 ? prev : Object.fromEntries(fs.map((f) => [f.name, f.median]))
        );
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descriptorFeatures = useMemo(
    () => (features ?? []).filter((f) => isDescriptor(f.name)),
    [features]
  );
  const radarAxes: RadarAxis[] = useMemo(
    () => descriptorFeatures.map((f) => ({ key: f.name, label: shortLabel(f.name), min: f.min, max: f.max })),
    [descriptorFeatures]
  );
  const medians = useMemo(
    () => Object.fromEntries((features ?? []).map((f) => [f.name, f.median])),
    [features]
  );

  const groupedExpert = useMemo(() => {
    if (!features || !summary) return [];
    return summary.phases
      .map((phase) => ({
        phase,
        features: features.filter((f) => f.phase === phase.name && !MACRO_FEATURES.includes(f.name)),
      }))
      .filter((g) => g.features.length > 0);
  }, [features, summary]);

  function expertFeatures(): Record<string, number> {
    if (!features) return {};
    return Object.fromEntries(
      features
        .filter((f) => !MACRO_FEATURES.includes(f.name))
        .filter((f) => Math.abs((inputs[f.name] ?? f.median) - f.median) > 1e-9)
        .map((f) => [f.name, inputs[f.name] ?? f.median])
    );
  }

  function resetProfile() {
    setInputs((prev) => {
      const next = { ...prev };
      descriptorFeatures.forEach((f) => {
        next[f.name] = f.median;
      });
      return next;
    });
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.diagnose({
        problem: "score_only",
        ratings: {},
        defects,
        known_params: knownParams,
        process_note: note.trim(),
        expert_features: expertFeatures(),
      });
      setResult(res);
      if (res.features) setInputs(res.features);
      setActiveTab("befund");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const profileTouched = descriptorFeatures.some(
    (f) => Math.abs((inputs[f.name] ?? f.median) - f.median) > 1e-9
  );

  if (error && !options) {
    return (
      <InfoNote tone="negative">
        Konnte Eingabe nicht laden: {error}. Läuft das Backend unter <code>localhost:8000</code>?
      </InfoNote>
    );
  }
  if (!features || !options) return <p className="text-ink-faint">Lade Eingabe…</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Mein Bier</h1>
        <InfoBubble text="Die Regler bilden dein sensorisches Profil. Nicht gesetzte Merkmale bleiben auf Trainingsmedian." />
      </header>

      {/* PRIMÄRE EINGABE: Radar über echte Modell-Merkmale */}
      <Section
        title="Geschmacksprofil"
        icon={Gauge}
        action={
          <div className="flex items-center gap-2">
            <InfoBubble text="Die gestrichelte Kontur ist der Trainingsdurchschnitt." />
            {profileTouched && (
              <button
                onClick={resetProfile}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Durchschnitt
              </button>
            )}
          </div>
        }
      >
        <div className="grid items-center gap-6 lg:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <FlavorRadar
              axes={radarAxes}
              values={inputs}
              defaults={medians}
              onChange={(key, value) => setInputs((prev) => ({ ...prev, [key]: value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {descriptorFeatures.map((f) => {
              const val = inputs[f.name] ?? f.median;
              const moved = Math.abs(val - f.median) > 1e-9;
              return (
                <label key={f.name} className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-soft">{shortLabel(f.name)}</span>
                    <span className={clsx("font-semibold tabular-nums", moved ? "text-accent" : "text-ink-faint")}>
                      {val.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={(f.max - f.min) / 100 || 0.5}
                    value={val}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [f.name]: parseFloat(e.target.value) }))}
                    className="mt-1 w-full accent-[var(--color-accent)]"
                  />
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <label className="block">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Was willst du noch mitteilen?</span>
              <InfoBubble text="Diese Notiz geht in die spätere Coach-Erklärung ein. Die Score-Prognose bleibt auf den Modellfeatures basiert." />
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z.B. W68, 21 °C Gärung, Ferulasäurerast, jung abgefüllt, wirkt noch hefig…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:ring-2 focus:ring-accent"
            />
          </label>
        </div>
      </Section>

      {/* Fehlaromen — ebenfalls echte Modell-Merkmale */}
      <Section
        title="Fehlaromen"
        icon={FlaskConical}
        action={<InfoBubble text="Nur setzen, wenn wahrnehmbar. 0 bedeutet nicht vorhanden." />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {options.defect_axes.map((axis) => (
            <DefectSlider
              key={axis.key}
              label={axis.label}
              value={defects[axis.key as keyof DefectRatings] ?? null}
              onChange={(v) => setDefects((prev) => ({ ...prev, [axis.key]: v }))}
              onClear={() => setDefects((prev) => ({ ...prev, [axis.key]: null }))}
            />
          ))}
        </div>
      </Section>

      {/* Optionales */}
      <Collapsible
        open={openMeasure}
        onToggle={() => setOpenMeasure((v) => !v)}
        icon={Gauge}
        title="Messwerte"
        sub="optional"
      >
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
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
      </Collapsible>

      <Collapsible
        open={openContext}
        onToggle={() => setOpenContext((v) => !v)}
        icon={Scale}
        title="Jury-Kontext"
        sub="optional"
        flush
      >
        <SensorikKontext context={context} setContext={setContext} />
      </Collapsible>

      <Collapsible
        open={openExpert}
        onToggle={() => setOpenExpert((v) => !v)}
        icon={FlaskConical}
        title="Experten-Modus"
        sub="alle Features"
      >
        <div className="space-y-4">
          {groupedExpert.map(({ phase, features: feats }) => (
            <div key={phase.name} className="rounded-lg border border-border bg-surface-muted p-4">
              <h3 className="mb-3 text-sm font-semibold text-ink-soft">
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
      </Collapsible>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {loading ? "Diagnose läuft…" : "Diagnose erstellen"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <InfoBubble text={options.model_note} />
      </div>
      {error && <InfoNote tone="negative">⚠ {error}</InfoNote>}
    </div>
  );
}

function Collapsible({
  open,
  onToggle,
  icon: Icon,
  title,
  sub,
  flush,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: typeof Scale;
  title: string;
  sub?: string;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-muted"
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-accent" />
          <span>
            <span className="block text-sm font-semibold text-ink">{title}</span>
            {sub && <span className="block text-xs text-ink-faint">{sub}</span>}
          </span>
        </span>
        <ChevronDown className={clsx("h-4 w-4 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className={clsx(flush ? "" : "px-5 pb-5")}>{children}</div>}
    </section>
  );
}

function DefectSlider({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  onClear: () => void;
}) {
  return (
    <label className="block rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className={clsx("font-semibold", !value ? "text-ink-faint" : "text-negative")}>
          {!value ? "0.0" : value.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={0.5}
        value={value ?? 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-[var(--color-negative)]"
      />
      {value ? (
        <button type="button" onClick={onClear} className="mt-1 text-xs font-medium text-ink-faint hover:text-accent">
          Reset
        </button>
      ) : null}
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
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  );
}

function FeatureSlider({
  feature,
  value,
  onChange,
}: {
  feature: Feature;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink-soft" title={feature.hint}>
          {feature.name}
        </span>
        <span className="font-semibold text-accent">{(value ?? feature.median).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={feature.min}
        max={feature.max}
        step={(feature.max - feature.min) / 100}
        value={value ?? feature.median}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

"use client";

import { useMemo } from "react";
import { Scale } from "lucide-react";
import clsx from "clsx";
import { Section } from "@/components/ui/Section";
import { InfoNote } from "@/components/ui/InfoNote";
import { FORMULA_BLOCKS, JURY_CATEGORIES, computeSynthesis } from "@/lib/formula";

/**
 * Erfasst die 8 Jury-Kategorien, die im Modell ausgeschlossen sind, aber per Formel
 * direkt in den TOTAL einfließen. Zeigt live, wie sich die erfassten Blöcke gewichtet
 * auf die Jury-Wertung verteilen — der Brücken-Baustein zwischen Modell und Formel.
 */
export function SensorikKontext({
  context,
  setContext,
}: {
  context: Record<string, number>;
  setContext: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
}) {
  const synthesis = useMemo(() => computeSynthesis(context), [context]);
  const maxShare = Math.max(0.001, ...synthesis.blocks.map((b) => b.weightedShare ?? 0));

  function setValue(key: string, value: number) {
    setContext((prev) => ({ ...prev, [key]: value }));
  }
  function clearValue(key: string) {
    setContext((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return (
    <Section
      title="Sensorik-Kontext · Jury-Kategorien"
      icon={Scale}
      hint="Diese Kategorien fließen direkt in die Jury-Wertung ein, sind aber bewusst NICHT Teil des Modells (sonst spiegelt die Erklärung nur die Formelgewichte). Optional — hilft, die Lücke zum echten TOTAL zu schließen."
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        {FORMULA_BLOCKS.map((block) => (
          <div key={block.key}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {block.label}
              </span>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                {Math.round(block.weight * 100)} % Gewicht
              </span>
            </div>
            <div className="space-y-3">
              {JURY_CATEGORIES.filter((c) => c.block === block.key).map((cat) => (
                <RatingSlider
                  key={cat.key}
                  label={cat.key}
                  value={context[cat.key] ?? null}
                  onChange={(v) => setValue(cat.key, v)}
                  onClear={() => clearValue(cat.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {synthesis.ratedWeight > 0 && (
        <div className="mt-6 space-y-3 rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold text-ink">
            Gewichtete Verteilung auf den Jury-Score
            <span className="ml-1 font-normal text-ink-faint">
              ({Math.round(synthesis.ratedWeight * 100)} % der Formel erfasst)
            </span>
          </p>
          <div className="space-y-2">
            {synthesis.blocks.map((b) => (
              <div key={b.key} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-xs">
                <span className="text-ink-soft">{b.label}</span>
                <div className="h-2 rounded-full bg-border">
                  <div
                    className={clsx(
                      "h-2 rounded-full",
                      b.weightedShare == null
                        ? "bg-transparent"
                        : b === synthesis.weakestBlock
                          ? "bg-negative"
                          : "bg-accent"
                    )}
                    style={{ width: `${((b.weightedShare ?? 0) / maxShare) * 100}%` }}
                  />
                </div>
                <span className="text-right text-ink-faint">
                  {b.rating == null ? "—" : b.rating.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          {synthesis.weakestBlock && (
            <InfoNote tone="negative">
              Schwächster erfasster Block: <strong>{synthesis.weakestBlock.label}</strong> (
              {Math.round(synthesis.weakestBlock.weight * 100)} % Gewicht). Das Modell sieht diese
              Bewertung nicht — hier liegt ungenutztes Jury-Potenzial.
            </InfoNote>
          )}
        </div>
      )}
    </Section>
  );
}

function RatingSlider({
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
    <label className="block">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink-soft">{label}</span>
        <button
          type="button"
          onClick={onClear}
          className={clsx(
            "text-xs font-semibold",
            value === null ? "text-ink-faint" : "text-accent hover:underline"
          )}
        >
          {value === null ? "nicht bewertet" : value.toFixed(1)}
        </button>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={0.5}
        value={value ?? 3}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1.5 w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

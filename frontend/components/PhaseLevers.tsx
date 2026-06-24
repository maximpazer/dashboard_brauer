"use client";

import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import clsx from "clsx";
import { Section } from "@/components/ui/Section";
import type { Recommendation } from "@/lib/types";

/**
 * Macht die konkreten Brauphasen-Stellhebel sichtbar: was der Brauer pro Phase
 * tatsächlich anpassen kann (Gärtemperatur, Hefestamm, Stammwürze …).
 * Quelle: recommendations[].detail aus brewing_knowledge.recommend_for_phase.
 */
export function PhaseLevers({ recommendations, compact = false }: { recommendations: Recommendation[]; compact?: boolean }) {
  const negative = recommendations.filter((r) => r.direction === "negativ");
  const stable = recommendations.filter((r) => r.direction !== "negativ");

  return (
    <Section
      title={compact ? "Stellhebel" : "Stellhebel je Brauphase · Faktenbasis"}
      icon={Wrench}
      hint={
        compact
          ? undefined
          : "Welche Phase wie stark zieht und welche Prozess-Hebel dazugehören."
      }
    >
      {negative.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-positive/30 bg-positive-soft/40 p-4 text-sm text-ink-soft">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-positive" />
          Keine Phase zieht die Bewertung klar nach unten — Prozess eher stabil halten.
        </div>
      ) : (
        <div className="space-y-3">
          {negative.map((rec) => (
            <LeverCard key={rec.phase} rec={rec} compact={compact} />
          ))}
        </div>
      )}

      {stable.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Stabil halten
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {stable.map((r) => r.phase).join(", ")} tragen aktuell positiv oder neutral bei.
          </p>
        </div>
      )}
    </Section>
  );
}

function LeverCard({ rec, compact = false }: { rec: Recommendation; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-negative/25 bg-negative-soft/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <AlertTriangle className="h-4 w-4 text-negative" />
          {rec.headline}
        </h3>
        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-bold tabular-nums text-negative">
          {rec.value.toFixed(2)}
        </span>
      </div>
      {!compact && <p className="mt-2 text-sm text-ink-soft">{rec.detail}</p>}
      {rec.drivers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {rec.drivers.map(([name, value]) => (
            <span
              key={name}
              className={clsx(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                value < 0
                  ? "border-negative/30 bg-surface text-negative"
                  : "border-positive/30 bg-surface text-positive"
              )}
            >
              {name} {value >= 0 ? "+" : ""}
              {value.toFixed(2)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

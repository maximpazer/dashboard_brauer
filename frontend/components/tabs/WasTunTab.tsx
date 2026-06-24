"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { api } from "@/lib/api";
import { useBrewerState } from "@/lib/brewer-state";
import { InfoNote } from "@/components/ui/InfoNote";
import { AssistantChat, type AssistantChatHandle } from "@/components/AssistantChat";
import { PhaseLevers } from "@/components/PhaseLevers";
import { StellhebelSimulator } from "@/components/StellhebelSimulator";
import { DependencePlot } from "@/components/DependencePlot";
import type { Feature } from "@/lib/types";

export function WasTunTab() {
  const { result } = useBrewerState();
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoStartedKey = useRef<string | null>(null);
  const assistantRef = useRef<AssistantChatHandle>(null);

  useEffect(() => {
    api
      .features()
      .then(setFeatures)
      .catch((e) => setError((e as Error).message));
  }, []);

  const diagnosisContext = useMemo(
    () =>
      result
        ? {
            problem: result.problem,
            primary_diagnosis: result.primary_diagnosis,
            feature_drivers: result.feature_drivers,
            soft_slr_paths: result.soft_slr_paths,
            touched_features: result.touched_features,
            recommendations: result.recommendations,
            methodology_note: result.methodology_note,
          }
        : null,
    [result]
  );

  const worstPhase = result?.primary_diagnosis?.phase;
  const negativeDrivers = (result?.feature_drivers ?? [])
    .filter((d) => d.value < 0)
    .sort((a, b) => a.value - b.value);
  const primaryFeature = negativeDrivers[0];
  const worstFeature = primaryFeature?.feature;

  useEffect(() => {
    if (!result) return;
    const key = `${result.predicted_total}-${worstFeature ?? worstPhase ?? "none"}`;
    if (autoStartedKey.current === key) return;
    const t = setTimeout(() => {
      autoStartedKey.current = key;
      assistantRef.current?.ask(
        "Starte direkt mit einer kompakten, priorisierten Handlungsempfehlung für dieses Bier. " +
          "Bitte menschlich formulieren, nicht mechanisch: erst der wichtigste Hebel, dann 2-3 konkrete nächste Schritte, " +
          "danach eine kurze Frage, ob der Brauer tiefer in Prozess, SHAP oder Kipp-Punkt-Plot gehen möchte. " +
          "Nutze get_action_levers, get_feature_drivers und get_soft_slr_paths als Faktenbasis.",
        { hidden: true }
      );
    }, 150);
    return () => clearTimeout(t);
  }, [result, worstFeature, worstPhase]);

  if (!result) {
    return (
      <InfoNote tone="accent" icon={Info}>
        Noch keine Diagnose. Erfasse zuerst dein Bier.
      </InfoNote>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Coach</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Was jetzt?</h1>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {primaryFeature && (
            <span className="rounded-full border border-negative/30 bg-negative-soft px-3 py-1 text-xs font-semibold text-negative">
              Fokus: {primaryFeature.feature}
            </span>
          )}
          <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-ink-faint">
            Score {result.score_1_5.toFixed(1)} / 5
          </span>
          {worstPhase && (
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-ink-faint">
              Kontext: {worstPhase}
            </span>
          )}
        </div>
          <AssistantChat
            ref={assistantRef}
            ownProfile={result.features ?? null}
            diagnosisContext={diagnosisContext}
            greeting="Ich erstelle direkt eine Empfehlung auf Basis deines Befunds."
            suggestions={[
              "Was soll ich zuerst ändern?",
              worstFeature ? `Warum ${worstFeature}?` : "Wo liegt der größte Hebel?",
              worstFeature ? `Zeig mir den Plot zu ${worstFeature}` : "Gibt es einen Kipp-Punkt?",
            ]}
            placeholder="Nachfrage stellen…"
            scrollClass="h-[22rem]"
          />
      </section>

      {features && features.length > 0 ? (
        <div className="space-y-4">
          <DependencePlot features={features} initial={worstFeature} compact />
          <StellhebelSimulator features={features} result={result} compact />
        </div>
      ) : error ? (
        <InfoNote tone="negative">Konnte Merkmale nicht laden: {error}</InfoNote>
      ) : (
        <p className="text-sm text-ink-faint">Lade Merkmale…</p>
      )}

      <PhaseLevers recommendations={result.recommendations} compact />
    </div>
  );
}

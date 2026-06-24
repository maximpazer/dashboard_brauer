"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { GroupsSummary } from "@/lib/types";
import { useBrewerState } from "@/lib/brewer-state";

const PX_PER_UNIT = 200;

export function ProzessStufenTab() {
  const { result } = useBrewerState();
  const [summary, setSummary] = useState<GroupsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.groupsSummary().then(setSummary).catch((e) => setError(e.message));
  }, []);

  if (!result) {
    return <p className="text-slate-500">Bitte zuerst unter Problem erfassen ein Profil eingeben und berechnen.</p>;
  }
  if (error) return <p className="text-red-700">⚠ {error}</p>;
  if (!summary) return <p className="text-slate-500">Lade…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prozess-Stufen</h1>
        <p className="mt-1 text-sm text-slate-600">
          Harte Group-SHAP-Sicht: welche disjunkte Brauprozess-Stufe treibt die Modellbewertung und in welche Richtung?
        </p>
      </div>

      <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-4">
        {summary.phases.map((phase) => {
          const value = result.group_shap[phase.name] ?? 0;
          const width = Math.min(Math.abs(value) * PX_PER_UNIT, 260);
          const positive = value >= 0;
          return (
            <div key={phase.name} className="group flex items-center gap-3 py-2">
              <div className="w-1/3 text-sm font-medium text-slate-700">
                {phase.icon} {phase.name}
              </div>
              <div className="relative flex h-7 flex-1 items-center">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300" />
                <div
                  className={`absolute flex h-7 items-center justify-center text-xs font-bold text-white ${
                    positive ? "rounded-r-md bg-emerald-400" : "rounded-l-md bg-red-400"
                  }`}
                  style={
                    positive
                      ? { left: "50%", width: `${width}px` }
                      : { right: "50%", width: `${width}px` }
                  }
                >
                  {value >= 0 ? "+" : ""}
                  {value.toFixed(2)}
                </div>
              </div>
              <div className="hidden w-1/3 text-xs text-slate-500 group-hover:block">{phase.summary}</div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Hard Assignment für additive XAI: jedes Feature zählt genau zu einer Stufe. Soft-SLR-Pfade stehen in der Diagnose. ·{" "}
        <Link href="/methodik" className="text-amber-700 hover:underline">
          Methodik-Details ansehen
        </Link>
      </p>
    </div>
  );
}

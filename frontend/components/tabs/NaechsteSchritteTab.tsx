"use client";

import { AlertTriangle, CheckCircle2, ChevronRight, GitBranch, HelpCircle } from "lucide-react";
import { useBrewerState } from "@/lib/brewer-state";
import type { FeatureDriver, Recommendation, SoftSlrPath } from "@/lib/types";

export function NaechsteSchritteTab() {
  const { result, setActiveTab } = useBrewerState();

  if (!result) {
    return <p className="text-slate-500">Bitte zuerst unter Problem erfassen ein Profil eingeben und berechnen.</p>;
  }

  const negative = result.recommendations.filter((r) => r.direction === "negativ");
  const primary = result.primary_diagnosis;
  const stable = result.recommendations.filter((r) => r.direction !== "negativ").slice(0, 3);
  const drivers = result.feature_drivers ?? [];
  const paths = result.soft_slr_paths ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Diagnose</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Erst kommt die praktische Fehlersuche: harter Modellhebel, wichtigste sensorische Treiber und
          SLR-Phasen, die du mitprüfen solltest. Die Score-Prognose bleibt als Orientierung verfügbar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-800" />
            <h2 className="font-semibold text-red-900">Primärer Modellhebel</h2>
          </div>
          <p className="mt-2 text-sm font-medium text-red-900">{primary?.headline ?? "Keine prioritäre Stufe erkannt."}</p>
          <p className="mt-2 text-sm text-slate-700">{primary?.detail ?? "Das Profil zeigt keinen klaren negativen Modellhebel."}</p>
          <p className="mt-3 text-xs text-red-800">
            Hard-XAI: Diese Aussage basiert auf der additiven Group-SHAP-Zerlegung des XGBoost-Modells.
          </p>
        </div>

        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Score als Kontext</h2>
          <p className="mt-2 text-4xl font-extrabold text-amber-900">{result.score_1_5.toFixed(1)}</p>
          <p className="text-sm text-amber-800">/ 5 · Unsicherheit ± {result.score_1_5_uncertainty.toFixed(1)}</p>
          <button
            onClick={() => setActiveTab("prognose")}
            className="mt-4 rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            Prognose ansehen
          </button>
        </div>
      </div>

      {drivers.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Wichtigste sensorische Treiber</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {drivers.map((driver) => (
              <DriverCard key={driver.feature} driver={driver} />
            ))}
          </div>
        </section>
      )}

      {paths.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Soft-SLR: mitzuprüfende Prozesskette</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Diese Gewichte stammen aus den SLR-Detailmatrizen. Sie sind Diagnose-Kontext, keine neue SHAP-Summe.
          </p>
          <div className="mt-4 space-y-4">
            {paths.slice(0, 6).map((path) => (
              <SoftPathCard key={path.feature} path={path} />
            ))}
          </div>
        </section>
      )}

      {primary?.next_questions && primary.next_questions.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Nächste Fragen an den Brauer</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {primary.next_questions.map((q) => (
              <li key={q} className="flex gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stable.length > 0 && (
        <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-800" />
            <h2 className="text-sm font-semibold text-emerald-800">Stabile Bereiche</h2>
          </div>
          <p className="mt-2 text-sm text-emerald-900">
            {stable.map((r) => r.phase).join(", ")} tragen aktuell positiv oder neutral bei. Dort eher Prozess stabil halten.
          </p>
        </section>
      )}

      <p className="text-xs italic text-slate-400">
        {result.methodology_note ??
          "SHAP erklärt Modellverhalten, nicht kausale Braugarantien. Soft-SLR zeigt literaturbasierte Mehrfachbezüge."}
      </p>

      {negative.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">Weitere negative Hard-XAI-Hebel</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {negative.slice(1, 3).map((rec) => (
              <CompactRecommendation key={rec.phase} rec={rec} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DriverCard({ driver }: { driver: FeatureDriver }) {
  const negative = driver.value < 0;
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800">{driver.feature}</span>
        <span className={negative ? "text-sm font-bold text-red-700" : "text-sm font-bold text-emerald-700"}>
          {driver.value >= 0 ? "+" : ""}
          {driver.value.toFixed(2)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{driver.hint}</p>
      {driver.touched_by_brewer && (
        <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          vom Brauer bewertet
        </span>
      )}
    </div>
  );
}

function SoftPathCard({ path }: { path: SoftSlrPath }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{path.feature}</h3>
        {path.hard_phase && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white">
            Hard-XAI: {path.hard_phase}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{path.explanation}</p>
      <div className="mt-3 space-y-2">
        {path.memberships.slice(0, 4).map((m) => (
          <div key={`${path.feature}-${m.phase}`} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-2 text-xs">
            <span className={m.is_hard_phase ? "font-semibold text-amber-800" : "text-slate-600"}>{m.phase}</span>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(4, m.weight * 100)}%` }} />
            </div>
            <span className="text-right text-slate-500">{Math.round(m.weight * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactRecommendation({ rec }: { rec: Recommendation }) {
  return (
    <div className="rounded-md border border-red-100 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-900">{rec.phase}</p>
      <p className="mt-1 text-xs text-slate-700">{rec.detail}</p>
    </div>
  );
}

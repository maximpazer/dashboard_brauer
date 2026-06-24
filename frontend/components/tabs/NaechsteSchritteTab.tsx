"use client";

import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { useBrewerState } from "@/lib/brewer-state";
import type { Recommendation } from "@/lib/types";

export function NaechsteSchritteTab() {
  const { result } = useBrewerState();

  if (!result) {
    return <p className="text-slate-500">Bitte zuerst auf "Mein Bier" ein Profil eingeben und berechnen.</p>;
  }

  const negative = result.recommendations.filter((r) => r.direction === "negativ");
  const primary = negative[0] ?? null;
  const secondary = negative[1] ?? null;
  const stable = result.recommendations.filter(
    (r) => r.phase !== primary?.phase && r.phase !== secondary?.phase
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nächste Schritte</h1>
        <p className="mt-1 text-sm text-slate-600">
          Konkrete Hebel, priorisiert nach Einfluss auf deine Bewertung.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {primary && <LeverCard rec={primary} badge="Größter Hebel" tone="red" />}
        {secondary && <LeverCard rec={secondary} badge="Sekundärer Hebel" tone="amber" />}

        {stable.length > 0 && (
          <div className="md:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-800" />
              <h3 className="font-semibold text-emerald-800">
                {stable.map((r) => r.phase).join(" & ")} stabil
              </h3>
            </div>
            <p className="mt-2 text-sm text-emerald-900">
              Diese Stufen tragen positiv oder neutral zur Bewertung bei — aktuellen Prozess hier
              beibehalten.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs italic text-slate-400">
        Hinweis: Die KI liefert korrelative Hebel basierend auf historischen Jury-Daten, keine
        kausalen Braugarantien.
      </p>
    </div>
  );
}

function LeverCard({ rec, badge, tone }: { rec: Recommendation; badge: string; tone: "red" | "amber" }) {
  const styles =
    tone === "red"
      ? { bg: "bg-red-50", border: "border-red-100", badge: "bg-red-500", title: "text-red-800", bullet: "text-red-600" }
      : { bg: "bg-amber-50", border: "border-amber-100", badge: "bg-amber-500", title: "text-amber-800", bullet: "text-amber-600" };

  return (
    <div className={`relative rounded-lg border p-4 ${styles.bg} ${styles.border}`}>
      <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${styles.badge}`}>
        {badge}
      </span>
      <div className="flex items-center gap-2">
        <AlertTriangle className={`h-5 w-5 ${styles.title}`} />
        <h3 className={`font-semibold ${styles.title}`}>{rec.phase} anpassen</h3>
      </div>
      <p className="mt-2 text-sm text-slate-700">{rec.detail}</p>
      {rec.drivers.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-md bg-white p-3 text-sm">
          {rec.drivers.map(([feature, value]) => (
            <li key={feature} className="flex items-start gap-1">
              <ChevronRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${styles.bullet}`} />
              <span>
                {feature} ({value >= 0 ? "+" : ""}
                {value.toFixed(2)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

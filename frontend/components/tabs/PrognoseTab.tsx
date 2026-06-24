"use client";

import { useBrewerState } from "@/lib/brewer-state";
import { Disclaimer } from "@/components/Disclaimer";

export function PrognoseTab() {
  const { result } = useBrewerState();

  if (!result) {
    return <p className="text-slate-500">Bitte zuerst auf "Mein Bier" ein Profil eingeben und berechnen.</p>;
  }

  const fillPct = ((result.score_1_5 - 1) / 4) * 100;
  const q = result.benchmark_quartiles_1_5;
  const userPos = ((result.score_1_5 - q.min) / (q.max - q.min)) * 100;
  const meanPos = ((q.mean - q.min) / (q.max - q.min)) * 100;
  const p25Pos = ((q.p25 - q.min) / (q.max - q.min)) * 100;
  const p75Pos = ((q.p75 - q.min) / (q.max - q.min)) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prognose</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vorhergesagte Jury-Bewertung für dein aktuelles Sensorikprofil.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 py-8 md:flex-row">
        <div className="relative h-48 w-48 shrink-0 rounded-full border-8 border-slate-100">
          <div
            className="absolute inset-0 rounded-full border-8 border-amber-500"
            style={{ clipPath: `polygon(0 0, 100% 0, 100% ${fillPct}%, 0 ${fillPct}%)` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extrabold text-slate-900">{result.score_1_5.toFixed(1)}</span>
            <span className="text-xl text-slate-400">/ 5</span>
            <span className="mt-1 text-xs text-slate-500">± {result.score_1_5_uncertainty.toFixed(1)} Unsicherheit</span>
          </div>
        </div>

        <div className="w-full max-w-md space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Benchmark: Historische Hefeweizen</h2>
          <div className="relative h-8 w-full rounded-full bg-slate-200">
            <div
              className="absolute inset-y-0 rounded-full bg-amber-200 opacity-50"
              style={{ left: `${p25Pos}%`, width: `${p75Pos - p25Pos}%` }}
            />
            <div className="absolute inset-y-0 w-1 bg-slate-400" style={{ left: `${meanPos}%` }} />
            <div className="absolute inset-y-0 w-1 bg-amber-600" style={{ left: `${userPos}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Mangelhaft (1)</span>
            <span>Exzellent (5)</span>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
            Dein Bier liegt bei <strong>{result.score_1_5.toFixed(1)} / 5</strong>
            {result.score_1_5 >= q.p75 ? " — im oberen Quartil des Stil-Feldes." : result.score_1_5 <= q.p25 ? " — im unteren Quartil des Stil-Feldes." : " — im mittleren Bereich des Stil-Feldes."}
          </div>
        </div>
      </div>

      <Disclaimer>
        Echte Modell-Vorhersage: {result.predicted_total.toFixed(1)} Punkte (Jury-Skala) · Modell
        erklärt ca. {(result.r2 * 100).toFixed(0)} % der Varianz (R²={result.r2.toFixed(2)}, n=
        {result.n_beers} Biere), RMSE ≈ ±{result.rmse.toFixed(1)} Punkte. Als Orientierung lesen,
        nicht als exakte Wettbewerbs-Vorhersage.
      </Disclaimer>
    </div>
  );
}

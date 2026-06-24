"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { api } from "@/lib/api";
import type { MethodologyPayload } from "@/lib/types";
import { Disclaimer } from "@/components/Disclaimer";

export default function MethodikPage() {
  const [data, setData] = useState<MethodologyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.methodology().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">⚠ {error}</p>;
  if (!data) return <p className="text-neutral-500">Lade Methodik-Kennzahlen…</p>;

  const fp = data.faithfulness_group_player;
  const retentionData = [
    { name: "SLR (Domäne)", pct: fp.retention_slr * 100 },
    { name: "HSIC (datengetrieben)", pct: fp.retention_hsic * 100 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Methodik & Validierung</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Wissenschaftliche Einordnung der Domain-Constrained Group-SHAP-Methode.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Metric label="Biere (Beer-Level)" value={String(data.n_beers)} />
        <Metric label="Merkmale" value={String(data.n_features)} />
        <Metric label="Test-R²" value={data.test_r2_stored.toFixed(3)} />
        <Metric label="Brauprozess-Stufen" value={String(data.k_groups)} />
      </div>

      <Disclaimer>
        Kleine Stichprobe (n={data.n_beers} Biere, beer-level gemittelt über alle Juroren
        weltweit) — Konfidenzintervalle sind entsprechend breiter als bei größeren
        Stichproben. Die Methodik/Pipeline ist die eigentliche Contribution, nicht eine
        einzelne R²-Zahl.
      </Disclaimer>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-neutral-700">
          1 · Faithfulness — SLR (Domäne) vs. HSIC (datengetrieben)
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Group-Player-Shapley-Deletion (ΔAUC), normiert auf das Feature-Ceiling = Retention.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={retentionData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any) => [`${Number(v).toFixed(1)} %`, "Retention"]) as never}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              <Cell fill="#b45309" />
              <Cell fill="#607D8B" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-sm text-neutral-700">
          HSIC ist signifikant treuer (Retention {(fp.retention_hsic * 100).toFixed(1)} % vs.{" "}
          {(fp.retention_slr * 100).toFixed(1)} %, Bootstrap-p = {fp.bootstrap_p.toFixed(4)},
          Wilcoxon-p = {fp.wilcoxon_p.toFixed(4)}). <strong>Faithfulness ist also nicht die
          Stärke der Domänen-Gruppierung.</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Stabilität</h3>
          <ul className="space-y-1 text-sm text-neutral-600">
            <li>SLR-Gruppen sind fix definiert (ARI = {data.stability.slr_ari.toFixed(2)})</li>
            <li>
              HSIC-Cluster schwanken unter Resampling: ARI Ø {data.stability.hsic_ari_pairwise_mean.toFixed(2)} ±{" "}
              {data.stability.hsic_ari_pairwise_std.toFixed(2)}
            </li>
            <li>Übereinstimmung SLR↔HSIC: ARI = {data.ari_slr_hsic.toFixed(3)} (praktisch unkorreliert)</li>
          </ul>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Aktionierbarkeit</h3>
          <ul className="space-y-1 text-sm text-neutral-600">
            <li>SLR = 7 benannte Brauprozess-Stufen → direkt ansteuerbar</li>
            <li>HSIC = statistische Cluster ohne Brau-Bezug → erst interpretierbar</li>
            <li>Brauer weiss sofort: welche Stufe, welcher Stellhebel</li>
          </ul>
        </div>
      </div>

      <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900">
        <strong>Kernaussage:</strong> Der Beitrag der Methode liegt nicht in höherer Faithfulness,
        sondern in <strong>Stabilität + Aktionierbarkeit</strong> — die Kommunikationsbrücke
        zwischen ML-Erklärung und Braupraxis (Kim & Park 2026, GS-SHAP, §6).
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">Soft-SLR im Dashboard</h3>
          <p className="text-sm text-amber-950">
            Das Modell bleibt hart gruppiert, weil additive Group-SHAP disjunkte Gruppen braucht.
            Für die Brauer-Diagnose werden zusätzlich SLR-Mehrfachbezüge angezeigt: welche Phasen bei
            einem sensorischen Problem mitzuprüfen sind. Diese Soft-Pfade sind keine neue SHAP-Summe.
          </p>
          {data.soft_assignment && (
            <p className="mt-2 text-xs text-amber-800">
              Quelle: {data.soft_assignment.source} · Rolle: {data.soft_assignment.role}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Qwen Tool Calling</h3>
          <p className="text-sm text-slate-700">
            Der Brau-Assistent nutzt {data.llm?.model ?? "qwen3:30b-a3b"} als Dialogschicht mit
            Tool Calling. Qwen erzeugt nicht die Prognose, sondern ruft definierte Backend-Tools für
            XGBoost-Prognose, Hard-SHAP, Feature-Treiber, Soft-SLR-Pfade und Methodikhinweise ab.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Dadurch bleiben Zahlen und methodische Aussagen an die vorhandenen Artefakte gebunden.
          </p>
        </div>
      </div>

      <Disclaimer>
        Die Stufen-Zuordnung ist ein interpretativer Proxy, keine kausale Aussage: sensorische
        Merkmale sind dem Prozess nachgelagert, die Zuordnung Merkmal → Brauprozess-Stufe ist
        literaturgestützt plausibel, aber nicht direkt gemessen.
      </Disclaimer>

      <div className="rounded-md border border-neutral-300 bg-neutral-100 p-4 text-sm text-neutral-700">
        <strong>Ausblick (nicht Teil dieser Iteration):</strong> Die Eingabe ist aktuell auf das
        Sensorikprofil beschränkt (gleiche 20 Merkmale wie die Jury). Eine Eingabe von
        Rezeptparametern (Malzschüttung, Hefestamm, Gärtemperatur etc.) würde ein separates,
        aktuell nicht vorhandenes Mapping-Modell Rezeptur → Sensorik erfordern und ist als
        möglicher nächster Schritt vorgesehen, nicht implementiert.
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

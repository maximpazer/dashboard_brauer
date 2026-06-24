"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { api } from "@/lib/api";
import type { MethodologyPayload } from "@/lib/types";
import { Disclaimer } from "@/components/Disclaimer";
import { Stat } from "@/components/ui/Stat";
import { InfoNote } from "@/components/ui/InfoNote";

export default function MethodikPage() {
  const [data, setData] = useState<MethodologyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.methodology().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <InfoNote tone="negative">⚠ {error}</InfoNote>;
  if (!data) return <p className="text-ink-faint">Lade Methodik-Kennzahlen…</p>;

  const fp = data.faithfulness_group_player;
  const retentionData = [
    { name: "SLR (Domäne)", pct: fp.retention_slr * 100 },
    { name: "HSIC (datengetrieben)", pct: fp.retention_hsic * 100 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-accent">
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zum Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Über das Modell · Methodik &amp; Validierung</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Wissenschaftliche Einordnung der Domain-Constrained Group-SHAP-Methode.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Biere (Beer-Level)" value={String(data.n_beers)} />
        <Stat label="Merkmale" value={String(data.n_features)} />
        <Stat label="Test-R²" value={data.test_r2_stored != null ? data.test_r2_stored.toFixed(3) : "—"} />
        <Stat label="Brauprozess-Stufen" value={String(data.k_groups)} />
      </div>

      <Disclaimer>
        Kleine Stichprobe (n={data.n_beers} Biere, beer-level gemittelt über alle Juroren weltweit) —
        Konfidenzintervalle sind entsprechend breiter als bei größeren Stichproben. Die
        Methodik/Pipeline ist die eigentliche Contribution, nicht eine einzelne R²-Zahl.
      </Disclaimer>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          1 · Faithfulness — SLR (Domäne) vs. HSIC (datengetrieben)
        </h2>
        <p className="mb-3 text-xs text-ink-faint">
          Group-Player-Shapley-Deletion (ΔAUC), normiert auf das Feature-Ceiling = Retention.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={retentionData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--color-ink-faint)" }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any) => [`${Number(v).toFixed(1)} %`, "Retention"]) as never}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              <Cell fill="var(--color-accent)" />
              <Cell fill="#64748b" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-sm text-ink-soft">
          HSIC ist signifikant treuer (Retention {(fp.retention_hsic * 100).toFixed(1)} % vs.{" "}
          {(fp.retention_slr * 100).toFixed(1)} %, Bootstrap-p = {fp.bootstrap_p.toFixed(4)}, Wilcoxon-p ={" "}
          {fp.wilcoxon_p.toFixed(4)}).{" "}
          <strong className="text-ink">Faithfulness ist also nicht die Stärke der Domänen-Gruppierung.</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-ink">Stabilität</h3>
          <ul className="space-y-1 text-sm text-ink-soft">
            <li>SLR-Gruppen sind fix definiert (ARI = {data.stability.slr_ari.toFixed(2)})</li>
            <li>
              HSIC-Cluster schwanken unter Resampling: ARI Ø {data.stability.hsic_ari_pairwise_mean.toFixed(2)} ±{" "}
              {data.stability.hsic_ari_pairwise_std.toFixed(2)}
            </li>
            <li>Übereinstimmung SLR↔HSIC: ARI = {data.ari_slr_hsic.toFixed(3)} (praktisch unkorreliert)</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-ink">Aktionierbarkeit</h3>
          <ul className="space-y-1 text-sm text-ink-soft">
            <li>SLR = 7 benannte Brauprozess-Stufen → direkt ansteuerbar</li>
            <li>HSIC = statistische Cluster ohne Brau-Bezug → erst interpretierbar</li>
            <li>Brauer weiß sofort: welche Stufe, welcher Stellhebel</li>
          </ul>
        </div>
      </div>

      <InfoNote tone="positive">
        <strong className="text-ink">Kernaussage:</strong> Der Beitrag der Methode liegt nicht in höherer
        Faithfulness, sondern in <strong className="text-ink">Stabilität + Aktionierbarkeit</strong> — die
        Kommunikationsbrücke zwischen ML-Erklärung und Braupraxis (Kim &amp; Park 2026, GS-SHAP, §6).
      </InfoNote>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-5">
          <h3 className="mb-2 text-sm font-semibold text-accent-strong">Soft-SLR im Dashboard</h3>
          <p className="text-sm text-ink-soft">
            Das Modell bleibt hart gruppiert, weil additive Group-SHAP disjunkte Gruppen braucht. Für die
            Brauer-Diagnose werden zusätzlich SLR-Mehrfachbezüge angezeigt: welche Phasen bei einem
            sensorischen Problem mitzuprüfen sind. Diese Soft-Pfade sind keine neue SHAP-Summe.
          </p>
          {data.soft_assignment && (
            <p className="mt-2 text-xs text-ink-faint">
              Quelle: {data.soft_assignment.source} · Rolle: {data.soft_assignment.role}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-ink">Qwen Tool Calling</h3>
          <p className="text-sm text-ink-soft">
            Der Brau-Assistent nutzt {data.llm?.model ?? "qwen3:30b-a3b"} als Dialogschicht mit Tool Calling.
            Qwen erzeugt nicht die Prognose, sondern ruft definierte Backend-Tools für XGBoost-Prognose,
            Hard-SHAP, Feature-Treiber, Soft-SLR-Pfade und Methodikhinweise ab.
          </p>
          <p className="mt-2 text-xs text-ink-faint">
            Dadurch bleiben Zahlen und methodische Aussagen an die vorhandenen Artefakte gebunden.
          </p>
        </div>
      </div>

      <Disclaimer>
        Die Stufen-Zuordnung ist ein interpretativer Proxy, keine kausale Aussage: sensorische Merkmale
        sind dem Prozess nachgelagert, die Zuordnung Merkmal → Brauprozess-Stufe ist literaturgestützt
        plausibel, aber nicht direkt gemessen.
      </Disclaimer>
    </div>
  );
}

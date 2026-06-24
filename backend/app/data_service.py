"""Lädt vorberechnete Group-SHAP-/Evaluations-Artefakte aus ``results/``.

Direkte Portierung der Logik aus ``dashboard/data_loader.py`` (Streamlit) auf
eine zustandslose Service-Schicht für FastAPI. Liest ausschliesslich
vorberechnete CSV/JSON-Dateien — kein Modell-Load hier (das macht
``model_service``).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from . import config, model_service
from .brewing_knowledge import feature_hint, phase_meta, recommend_for_phase


def _read_csv(path: Path, **kwargs) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Benötigte Datei fehlt: {path}\n"
            "Bitte zuerst code/03_shap.ipynb und code/04_evaluation.ipynb ausführen."
        )
    return pd.read_csv(path, **kwargs)


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


@dataclass(frozen=True)
class DashboardData:
    group_summary: pd.DataFrame
    group_shap: pd.DataFrame
    feature_shap: pd.DataFrame
    total: pd.Series
    mapping: dict[str, list[str]]
    base_value: float
    eval_summary: dict

    @property
    def n_beers(self) -> int:
        return int(len(self.group_shap))

    @property
    def phases(self) -> list[str]:
        return [p for p in config.PROCESS_ORDER if p in self.group_shap.columns]


@lru_cache(maxsize=1)
def get_dashboard_data() -> DashboardData:
    group_summary = _read_csv(config.SHAP_DIR / "group_shap_summary.csv", index_col=0)
    group_shap = _read_csv(config.SHAP_DIR / "group_shap_hefeweizen_beer.csv")
    feature_shap_raw = _read_csv(config.SHAP_DIR / "shap_values_hefeweizen_beer.csv")

    total = feature_shap_raw["TOTAL"].astype(float)
    feature_shap = feature_shap_raw.drop(columns=["TOTAL"])

    mapping = _read_json(config.SHAP_DIR / "exclusive_groups_hefeweizen.json")
    # Gleicher base_value wie model_service (explainer.expected_value nach dem
    # base_score-Fix) statt einer separaten historischen Rekonstruktion — so
    # liefern historische Biere und live eingegebene Profile konsistente Werte.
    base_value = model_service.get_model_bundle().base_value
    eval_summary = _read_json(config.EVAL_DIR / "evaluation_summary_xgboost_hefeweizen.json")

    return DashboardData(
        group_summary=group_summary,
        group_shap=group_shap,
        feature_shap=feature_shap,
        total=total,
        mapping=mapping,
        base_value=base_value,
        eval_summary=eval_summary,
    )


def groups_summary_payload() -> dict:
    data = get_dashboard_data()
    phases = data.phases
    rows = []
    for phase in phases:
        row = data.group_summary.loc[phase]
        meta = phase_meta(phase)
        rows.append(
            {
                "name": phase,
                "n_features": int(row["n_features"]),
                "importance": float(row["importance"]),
                "importance_pct": float(row["importance_pct"]),
                "mean_signed": float(row["mean_signed"]),
                "icon": meta["icon"],
                "summary": meta["summary"],
                "lever": meta["lever"],
            }
        )
    top_phase = max(rows, key=lambda r: r["importance"])["name"] if rows else None
    return {"n_beers": data.n_beers, "phases": rows, "top_phase": top_phase}


def group_drilldown_payload(phase: str) -> dict:
    data = get_dashboard_data()
    if phase not in data.mapping:
        raise KeyError(phase)
    features = [f for f in data.mapping[phase] if f in data.feature_shap.columns]
    sub = data.feature_shap[features]
    mean_abs = sub.abs().mean()
    mean_signed = sub.mean()

    feature_rows = [
        {
            "name": f,
            "mean_abs_shap": float(mean_abs[f]),
            "mean_signed_shap": float(mean_signed[f]),
            "values": [float(v) for v in sub[f].values],
            "hint": feature_hint(f),
        }
        for f in features
    ]
    feature_rows.sort(key=lambda r: r["mean_abs_shap"], reverse=True)
    meta = phase_meta(phase)
    return {"phase": phase, "icon": meta["icon"], "summary": meta["summary"], "lever": meta["lever"], "features": feature_rows}


def beers_list_payload() -> list[dict]:
    data = get_dashboard_data()
    return [
        {"id": i, "label": f"Bier #{i + 1} · Bewertung {round(score)}", "total": float(score)}
        for i, score in enumerate(data.total)
    ]


def beer_detail_payload(beer_id: int) -> dict:
    data = get_dashboard_data()
    if beer_id < 0 or beer_id >= data.n_beers:
        raise IndexError(beer_id)
    phases = data.phases
    group_row = data.group_shap.iloc[beer_id]
    feature_row = data.feature_shap.iloc[beer_id]
    predicted = float(data.base_value + group_row[phases].sum())

    percentiles = {
        phase: float((data.group_shap[phase] < group_row[phase]).mean() * 100) for phase in phases
    }

    group_shap = {phase: float(group_row[phase]) for phase in phases}
    feature_shap = {f: float(v) for f, v in feature_row.items()}

    return {
        "id": beer_id,
        "actual_total": float(data.total.iloc[beer_id]),
        "predicted_total": predicted,
        "base_value": data.base_value,
        "group_shap": group_shap,
        "feature_shap": feature_shap,
        "percentiles": percentiles,
        "recommendations": recommendations_payload(group_shap, feature_shap),
    }


def benchmark_percentile_payload(total: float) -> dict:
    data = get_dashboard_data()
    pct = float((data.total < total).mean() * 100)
    return {
        "total": total,
        "percentile": pct,
        "n_beers": data.n_beers,
        "historical_mean": float(data.total.mean()),
        "historical_std": float(data.total.std()),
    }


def _total_range() -> tuple[float, float]:
    data = get_dashboard_data()
    return float(data.total.min()), float(data.total.max())


def total_to_scale_1_5(total: float) -> tuple[float, float]:
    """Lineare Umrechnung der echten TOTAL-Jury-Skala (~22-40) auf eine
    brauerfreundliche 1-5-Skala, plus die linear mitskalierte Unsicherheit
    (RMSE auf derselben Skala) — exakte Fehlerfortpflanzung bei linearer
    Transformation, kein Artefakt."""
    lo, hi = _total_range()
    scale = 4.0 / (hi - lo)
    score = 1.0 + scale * (total - lo)
    score = min(5.0, max(1.0, score))
    rmse = model_service.get_model_bundle().test_rmse
    uncertainty = rmse * scale
    return score, uncertainty


def benchmark_quartiles_1_5() -> dict:
    """p25/Mittelwert/p75 der historischen TOTAL-Verteilung, umgerechnet auf
    die 1-5-Skala — Grundlage für den Benchmark-Balken in der Prognose-Ansicht."""
    data = get_dashboard_data()
    lo, hi = _total_range()
    scale = 4.0 / (hi - lo)

    def to_scale(total: float) -> float:
        return min(5.0, max(1.0, 1.0 + scale * (total - lo)))

    return {
        "p25": to_scale(float(data.total.quantile(0.25))),
        "p75": to_scale(float(data.total.quantile(0.75))),
        "mean": to_scale(float(data.total.mean())),
        "min": 1.0,
        "max": 5.0,
    }


def enrich_prediction(result: dict) -> dict:
    """Reichert das rohe ``model_service.predict_and_explain()``-Ergebnis um
    Group-SHAP, Empfehlungen, Benchmark-Perzentil und die 1-5-Skala an — von
    ``/api/predict`` und den Chat-Tools gemeinsam genutzt (ein Berechnungsweg)."""
    dashboard = get_dashboard_data()
    phases, mapping = dashboard.phases, dashboard.mapping
    group_shap = {
        phase: sum(result["feature_shap"].get(f, 0.0) for f in mapping.get(phase, []))
        for phase in phases
    }
    result["group_shap"] = group_shap
    result["recommendations"] = recommendations_payload(group_shap, result["feature_shap"])

    benchmark = benchmark_percentile_payload(result["predicted_total"])
    result["benchmark_percentile"] = benchmark["percentile"]

    score_1_5, uncertainty_1_5 = total_to_scale_1_5(result["predicted_total"])
    result["score_1_5"] = score_1_5
    result["score_1_5_uncertainty"] = uncertainty_1_5
    result["benchmark_quartiles_1_5"] = benchmark_quartiles_1_5()
    return result


def recommendations_payload(group_shap: dict[str, float], feature_shap: dict[str, float]) -> list[dict]:
    """Templatierte Handlungsempfehlungen je Brauprozess-Stufe für ein beliebiges
    Profil (historisches Bier oder live eingegebenes eigenes Profil)."""
    data = get_dashboard_data()
    recs = []
    for phase in data.phases:
        if phase not in group_shap:
            continue
        members = [f for f in data.mapping.get(phase, []) if f in feature_shap]
        contribs = pd.Series({f: feature_shap[f] for f in members})
        recs.append(recommend_for_phase(phase, group_shap[phase], contribs))
    recs.sort(key=lambda r: abs(r["value"]), reverse=True)
    return recs


def _detect_threshold(xs: np.ndarray, ys: np.ndarray, feature: str) -> tuple[float | None, str]:
    """Sucht den Feature-Wert, ab dem der SHAP-Einfluss das Vorzeichen kippt.

    Bildet quantilbasierte Bins, mittelt SHAP je Bin (glättet Tree-Rauschen) und
    interpoliert die Nullstelle des ersten Vorzeichenwechsels. Liefert ``None``,
    wenn kein klarer Kipp-Punkt existiert (durchgehend gleiches Vorzeichen)."""
    order = np.argsort(xs)
    xs, ys = xs[order], ys[order]
    if len(xs) < 12 or len(np.unique(xs)) < 5:
        return None, "Zu wenige unterschiedliche Werte für eine belastbare Schwelle."

    edges = np.unique(np.quantile(xs, np.linspace(0, 1, 11)))
    bin_x, bin_y = [], []
    for i in range(len(edges) - 1):
        lo, hi = edges[i], edges[i + 1]
        mask = (xs >= lo) & (xs <= hi) if i == len(edges) - 2 else (xs >= lo) & (xs < hi)
        if mask.any():
            bin_x.append(float(xs[mask].mean()))
            bin_y.append(float(ys[mask].mean()))
    bx, by = np.array(bin_x), np.array(bin_y)

    for i in range(len(by) - 1):
        a, b = by[i], by[i + 1]
        if a < 0 < b or b < 0 < a:
            t = a / (a - b)
            x0 = float(bx[i] + t * (bx[i + 1] - bx[i]))
            if a < b:
                note = (
                    f"Ab {feature} ≈ {x0:.2f} kippt der Effekt von negativ zu positiv: "
                    f"darunter zieht es den Score, darüber hebt es ihn."
                )
            else:
                note = (
                    f"Ab {feature} ≈ {x0:.2f} kippt der Effekt von positiv zu negativ: "
                    f"darunter hebt es den Score, darüber zieht es ihn."
                )
            return x0, note

    trend = "hebt" if by.mean() > 0 else "senkt"
    return None, f"Kein klarer Kipp-Punkt — höhere {feature}-Werte {trend} den Score tendenziell durchgehend."


def feature_dependence_payload(feature: str) -> dict:
    """Dependence-Daten für ein Merkmal: (Feature-Wert, SHAP) über alle Referenz-Biere
    plus erkannter Schwellenwert. Zeigt nicht-lineare Effekte und Cluster/Sprünge."""
    bundle = model_service.get_model_bundle()
    if feature not in bundle.features:
        raise KeyError(feature)

    X, shap_df = model_service.reference_shap_frame()
    xs = X[feature].to_numpy(dtype=float)
    ys = shap_df[feature].to_numpy(dtype=float)
    threshold, note = _detect_threshold(xs, ys, feature)
    ranges = model_service.feature_ranges()[feature]

    return {
        "feature": feature,
        "hint": feature_hint(feature),
        "median": ranges["median"],
        "min": ranges["min"],
        "max": ranges["max"],
        "points": [{"x": float(x), "shap": float(y)} for x, y in zip(xs, ys)],
        "threshold": threshold,
        "note": note,
    }


def methodology_payload() -> dict:
    data = get_dashboard_data()
    es = data.eval_summary
    return {
        "n_beers": es.get("n_beers", data.n_beers),
        "n_features": es.get("n_features", data.feature_shap.shape[1]),
        "test_r2_stored": es.get("test_r2_stored"),
        "k_groups": es.get("k_groups", len(data.phases)),
        "ari_slr_hsic": es.get("ari_slr_hsic"),
        "faithfulness_group_player": es.get("faithfulness_group_player", {}),
        "stability": es.get("stability", {}),
        "soft_assignment": {
            "enabled": True,
            "source": "SLR-Detailmatrizen",
            "role": (
                "Diagnostische Wissensschicht fuer Mehrfachzuordnungen; "
                "kein Ersatz fuer additive Hard Group-SHAP-Werte."
            ),
        },
        "llm": {
            "model": config.OLLAMA_MODEL,
            "role": "Dialogschicht mit Ollama Tool Calling, nicht das Prognosemodell.",
        },
    }

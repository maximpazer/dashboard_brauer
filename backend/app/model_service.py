"""Modell-Inferenz + Live-SHAP für ein neu eingegebenes Sensorikprofil.

Lädt den XGBoost-Checkpoint genau wie ``code/03_shap.ipynb``: bevorzugt den im
Checkpoint mitgespeicherten Trainings-Snapshot, korrigiert den bekannten
Pickle/xgboost-Versions-Effekt auf ``base_score`` (siehe Markdown-Zelle dort für
die Diagnose) und hält einen einzigen ``shap.TreeExplainer`` für die Laufzeit
der App vor.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd
import shap

from . import config


@dataclass(frozen=True)
class ModelBundle:
    model: object
    explainer: shap.TreeExplainer
    features: list[str]
    train_medians: pd.Series
    target_col: str
    base_value: float
    test_r2: float
    test_rmse: float
    test_mae: float
    n_beers: int


def _read_parquet(path):
    for engine in ("fastparquet", "pyarrow"):
        try:
            return pd.read_parquet(path, engine=engine)
        except Exception:
            continue
    return pd.read_parquet(path)


def _fix_base_score(model, features: list[str], target_col: str) -> None:
    """Korrigiert den base_score-Reset, der beim Laden eines mit einer anderen
    xgboost-Version gepickelten Modells auftritt (siehe 03_shap.ipynb)."""
    if not config.MODEL_SNAPSHOT_DIR.exists():
        return
    trainval = pd.concat(
        [
            _read_parquet(config.MODEL_SNAPSHOT_DIR / "train.parquet"),
            _read_parquet(config.MODEL_SNAPSHOT_DIR / "val.parquet"),
        ],
        ignore_index=True,
    )
    correct_base_score = float(trainval[target_col].mean())
    booster = model.get_booster()
    stored = float(json.loads(booster.save_config())["learner"]["learner_model_param"]["base_score"])
    if abs(stored - correct_base_score) > 0.05:
        booster.set_param({"base_score": correct_base_score})


@lru_cache(maxsize=1)
def get_model_bundle() -> ModelBundle:
    model = joblib.load(config.MODEL_DIR / "model.joblib")
    with open(config.MODEL_DIR / "inference_config.json", "r", encoding="utf-8") as f:
        infer_cfg = json.load(f)
    with open(config.MODEL_DIR / "model_info.json", "r", encoding="utf-8") as f:
        model_info = json.load(f)

    features: list[str] = infer_cfg["feature_cols"]
    train_medians = pd.Series(infer_cfg["train_medians"])[features]
    target_col: str = infer_cfg["target_col"]

    _fix_base_score(model, features, target_col)

    explainer = shap.TreeExplainer(model)
    base_value = float(np.atleast_1d(explainer.expected_value)[0])

    test_metrics = model_info.get("test_metrics", {})
    n_beers = model_info.get("data", {}).get("n_total", 0)

    return ModelBundle(
        model=model,
        explainer=explainer,
        features=features,
        train_medians=train_medians,
        target_col=target_col,
        base_value=base_value,
        test_r2=float(test_metrics.get("r2", float("nan"))),
        test_rmse=float(test_metrics.get("rmse", float("nan"))),
        test_mae=float(test_metrics.get("mae", float("nan"))),
        n_beers=int(n_beers),
    )


@lru_cache(maxsize=1)
def feature_ranges() -> dict[str, dict[str, float]]:
    """Min/Median/Max je Merkmal über alle 195 Biere (Trainings-Snapshot) —
    Grundlage für sinnvolle Slider-Grenzen im Eingabeformular."""
    bundle = get_model_bundle()
    frames = [
        _read_parquet(config.MODEL_SNAPSHOT_DIR / f"{s}.parquet") for s in ("train", "val", "test")
    ]
    df = pd.concat(frames, ignore_index=True)
    ranges = {}
    for f in bundle.features:
        col = df[f]
        ranges[f] = {
            "min": float(col.min()),
            "max": float(col.max()),
            "median": float(bundle.train_medians[f]),
        }
    return ranges


@lru_cache(maxsize=1)
def reference_shap_frame() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Feature-Werte (X) und die dazu passenden SHAP-Werte für alle Referenz-Biere.

    SHAP wird hier mit demselben ``TreeExplainer`` wie bei der Live-Inferenz frisch
    berechnet — dadurch ist die Zuordnung (Feature-Wert i <-> SHAP-Wert i) garantiert
    konsistent, unabhängig von der Zeilenreihenfolge gespeicherter CSV-Artefakte.
    Grundlage der Dependence-/Schwellenwert-Ansicht.
    """
    bundle = get_model_bundle()
    frames = [
        _read_parquet(config.MODEL_SNAPSHOT_DIR / f"{s}.parquet") for s in ("train", "val", "test")
    ]
    df = pd.concat(frames, ignore_index=True)
    X = df[bundle.features].astype(float)
    shap_values = bundle.explainer.shap_values(X)
    shap_df = pd.DataFrame(shap_values, columns=bundle.features, index=X.index)
    return X, shap_df


def build_feature_row(profile: dict[str, float]) -> pd.DataFrame:
    """Baut eine 1-Zeilen-Eingabematrix aus einem (teilweise befüllten) Profil.

    Fehlende Merkmale werden mit den gespeicherten Trainings-Medianen imputiert
    (gleiche Imputationslogik wie überall sonst in der Pipeline) — der Brauer
    muss also nicht jeden Slider zwingend setzen.
    """
    bundle = get_model_bundle()
    row = {f: profile.get(f, bundle.train_medians[f]) for f in bundle.features}
    return pd.DataFrame([row], columns=bundle.features)


def predict_and_explain(profile: dict[str, float]) -> dict:
    """Live-Vorhersage + SHAP-Zerlegung für ein neu eingegebenes Sensorikprofil.

    Nutzt denselben TreeExplainer wie die Pipeline; durch den base_score-Fix
    entspricht ``explainer.expected_value`` direkt der TOTAL-Skala, daher ist
    keine zusätzliche Rekonstruktion über historische Mittelwerte nötig.
    """
    bundle = get_model_bundle()
    X = build_feature_row(profile)

    shap_values = bundle.explainer.shap_values(X)[0]
    feature_shap = {f: float(v) for f, v in zip(bundle.features, shap_values)}
    predicted_total = bundle.base_value + float(np.sum(shap_values))

    return {
        "predicted_total": predicted_total,
        "base_value": bundle.base_value,
        "feature_shap": feature_shap,
        "rmse": bundle.test_rmse,
        "r2": bundle.test_r2,
        "n_beers": bundle.n_beers,
    }

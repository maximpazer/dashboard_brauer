"""Pfade und Konstanten für das Brauer-Dashboard-Backend.

Spiegelt die Konventionen aus ``code/03_shap.ipynb`` / ``code/04_evaluation.ipynb``:
Basis-Checkpoint ist das beer-level XGBoost-Modell (alle Juroren/Biere weltweit,
no_formeln-Features). Siehe ``documents/planning/status_und_zielbild_2026-06-24.md``.
"""

from __future__ import annotations

from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
# backend -> dashboard_brauer -> code -> Final_Model
BASE_DIR = BACKEND_DIR.parent.parent.parent
PROJECT_DIR = BASE_DIR.parent

RESULTS_DIR = BASE_DIR / "results"
SHAP_DIR = RESULTS_DIR / "shap"
EVAL_DIR = RESULTS_DIR / "evaluation"
SLR_MATRICES_DIR = PROJECT_DIR / "MAX" / "literatur" / "SLR" / "matrices"

DATA_DIR = BACKEND_DIR / "app" / "data"
BATCHES_FILE = DATA_DIR / "batches.json"

MODEL_DIR = RESULTS_DIR / "models" / "hefeweizen" / "alle_0_486_xgboost_no_formeln_unskaliert"
MODEL_SNAPSHOT_DIR = MODEL_DIR / "data"

HEFEWEIZEN_CATEGORY = "South German-Style Hefeweizen Hell"

# Brauprozess-Reihenfolge entlang der Brau-Timeline (links -> rechts).
PROCESS_ORDER = [
    "Mälzen / Schroten",
    "Darren",
    "Maischen",
    "Würzekochen",
    "Gärung",
    "Reifung / Lagerung",
    "Abfüllung / Verpackung",
]

OLLAMA_HOST = "http://localhost:11434"
# qwen3:30b-a3b: native Tool-Calling-Unterstützung (Capabilities laut
# `GET /api/tags`: ["completion", "tools", "thinking"]), MoE (~3B aktive
# Parameter/Token) -> deutlich schneller als ein dichtes Modell gleicher Größe.
OLLAMA_MODEL = "qwen3:30b-a3b"

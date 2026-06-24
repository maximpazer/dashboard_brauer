"""Einfache JSON-Datei-Persistenz für den "Verlauf"-Tab (gespeicherte Sude).

Bewusst keine Datenbank: Für diese erste Umsetzung reicht eine Liste von
Records in einer JSON-Datei. Schreibt direkt mit ``open(path, "w")`` ohne
Temp-Datei+Rename-Trick — auf dem Netzwerk-Mount dieses Projekts sind solche
Rename-Operationen unzuverlässig (siehe ``frontend/README.md``).
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from . import config, model_service
from .data_service import get_dashboard_data, total_to_scale_1_5


def _read_all() -> list[dict]:
    if not config.BATCHES_FILE.exists():
        return []
    with open(config.BATCHES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_all(batches: list[dict]) -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(config.BATCHES_FILE, "w", encoding="utf-8") as f:
        json.dump(batches, f, ensure_ascii=False, indent=2)


def save_batch(inputs: dict[str, float], note: str = "", label: str | None = None) -> dict:
    result = model_service.predict_and_explain(inputs)
    score_1_5, uncertainty_1_5 = total_to_scale_1_5(result["predicted_total"])

    dashboard = get_dashboard_data()
    phases, mapping = dashboard.phases, dashboard.mapping
    group_shap = {
        phase: sum(result["feature_shap"].get(f, 0.0) for f in mapping.get(phase, []))
        for phase in phases
    }

    batches = _read_all()
    record = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "label": label or f"Hefeweizen #{len(batches) + 1}",
        "inputs": inputs,
        "note": note,
        "predicted_total": result["predicted_total"],
        "score_1_5": score_1_5,
        "score_1_5_uncertainty": uncertainty_1_5,
        "group_shap": group_shap,
    }
    batches.append(record)
    _write_all(batches)
    return record


def list_batches() -> list[dict]:
    return list(reversed(_read_all()))


def get_batch(batch_id: str) -> dict:
    for record in _read_all():
        if record["id"] == batch_id:
            return record
    raise KeyError(batch_id)

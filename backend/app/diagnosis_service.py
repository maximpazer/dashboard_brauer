"""Geführte Brauer-Diagnose: schlanker Input, Hard-XAI und Soft-SLR-Kontext."""

from __future__ import annotations

from functools import lru_cache

import pandas as pd

from . import config, data_service, model_service
from .brewing_knowledge import feature_hint, phase_meta
from .schemas import DiagnoseRequest


PROBLEM_OPTIONS = [
    {"key": "body_low", "label": "Zu wenig Körper / zu dünn", "focus": ["body", "creaminess"]},
    {"key": "creaminess_low", "label": "Zu wenig Cremigkeit / Mundgefühl", "focus": ["creaminess", "body"]},
    {"key": "acid_high", "label": "Zu sauer", "focus": ["acid"]},
    {"key": "fruit_mismatch", "label": "Banane / Frucht passt nicht", "focus": ["fruit"]},
    {"key": "spice_mismatch", "label": "Nelke / Phenolik passt nicht", "focus": ["spice"]},
    {"key": "malt_low", "label": "Zu wenig Malzsüße / Honig / Karamell", "focus": ["malt_sweet"]},
    {"key": "oxidized", "label": "Oxidiert / pappeartig / alt", "focus": ["oxidation"]},
    {"key": "dms", "label": "DMS / gemüsig / gekocht", "focus": ["dms"]},
    {"key": "diacetyl", "label": "Diacetyl / buttrig", "focus": ["diacetyl"]},
    {"key": "yeasty", "label": "Hefig / unreif", "focus": ["yeasty"]},
    {"key": "score_only", "label": "Nur Score-Prognose", "focus": []},
]

RATING_AXES = [
    {
        "key": "body",
        "label": "Körper",
        "description": "Wie voll oder dünn wirkt das Bier?",
        "features": ["Vollmundigkeit"],
    },
    {
        "key": "creaminess",
        "label": "Cremigkeit",
        "description": "Wie cremig ist Mundgefühl und Schaumwahrnehmung?",
        "features": ["Cremigkeit"],
    },
    {
        "key": "acid",
        "label": "Säure",
        "description": "Wie stark ist die Säurewahrnehmung?",
        "features": ["Säure"],
    },
    {
        "key": "fruit",
        "label": "Frucht / Banane",
        "description": "Wie präsent ist der typische Hefeweizen-Fruchteindruck?",
        "features": ["Fruchtaroma / Fruchtester"],
    },
    {
        "key": "spice",
        "label": "Gewürz / Nelke",
        "description": "Wie präsent ist Nelke, Gewürz oder phenolischer Eindruck?",
        "features": ["Gewürzaroma / phenolisch"],
    },
    {
        "key": "malt_sweet",
        "label": "Malzsüße",
        "description": "Wie präsent sind Honig, Karamell oder Biskuit?",
        "features": ["Honig", "Karamell", "Biskuit"],
    },
]

DEFECT_AXES = [
    {
        "key": "oxidation",
        "label": "Oxidation / Pappe",
        "features": ["Oxidation"],
    },
    {
        "key": "dms",
        "label": "DMS / Gemüse",
        "features": ["DMS", "vegetal/Gemüse"],
    },
    {
        "key": "diacetyl",
        "label": "Diacetyl / Butter",
        "features": ["Diacetyl"],
    },
    {
        "key": "yeasty",
        "label": "Hefig",
        "features": ["yeasty/hefig"],
    },
    {
        "key": "metallic",
        "label": "Metallisch",
        "features": ["metalic/metallisch"],
    },
    {
        "key": "lightstruck",
        "label": "Lichtgeschmack",
        "features": ["light struck flavour/lichtgeschmack"],
    },
]

PROBLEM_DEFAULTS = {
    "body_low": {"body": 2.0, "creaminess": 2.5},
    "creaminess_low": {"creaminess": 2.0},
    "acid_high": {"acid": 4.0, "acidic/säuerlich": 3.0},
    "malt_low": {"malt_sweet": 2.0},
    "oxidized": {"oxidation": 4.0},
    "dms": {"dms": 4.0},
    "diacetyl": {"diacetyl": 4.0},
    "yeasty": {"yeasty": 4.0},
}

FEATURE_COLUMN_ALIASES = {
    "Cremigkeit": ["Cremigkeit/Schaum"],
    "Säure": ["Säure/sauer"],
    "acidic/säuerlich": ["Säure/sauer"],
    "Karamell": ["Karamell"],
    "Biskuit": ["Biskuit/malzig"],
    "Honig": ["Honig"],
    "Fruchtaroma / Fruchtester": ["Fruchtaroma/Fruchtester"],
    "estery/estrig": ["Fruchtaroma/Fruchtester"],
    "Gewürzaroma / phenolisch": ["Gewürzaroma/phenolisch (4-VG)"],
    "phenolic/Phenol": ["Gewürzaroma/phenolisch (4-VG)"],
    "Vollmundigkeit": ["Vollmundigkeit/Körper"],
    "yeasty/hefig": ["Hefe", "Hefe/Hefigkeit", "yeasty/hefig"],
    "DMS": ["DMS/Gemüse"],
    "vegetal/Gemüse": ["DMS/Gemüse"],
    "Diacetyl": ["Buttersahnekaramell (Diacetyl)"],
    "Oxidation": ["Oxidation/Alterung"],
    "metalic/metallisch": ["metalic/metallisch", "metallisch"],
    "light struck flavour/lichtgeschmack": ["light struck flavour/lichtgeschmack"],
    "stammwuerze": ["Stammwürze", "Stammwuerze"],
    "alkoholgehalt": ["Alkohol", "Alkoholgehalt"],
}

DETAIL_MATRICES = [
    ("Mälzen / Schroten", "detail_matrix_maelzen_schroten.csv"),
    ("Darren", "detail_matrix_darren.csv"),
    ("Maischen", "detail_matrix_maischen.csv"),
    ("Läutern", "detail_matrix_laeutern.csv"),
    ("Würzekochen", "detail_matrix_wuerzekochen.csv"),
    ("Hopfung", "detail_matrix_hopfung.csv"),
    ("Gärung", "detail_matrix_gaerung.csv"),
    ("Reifung / Lagerung", "detail_matrix_reifung_lagerung.csv"),
    ("Filtration / Stabilisierung", "detail_matrix_filtration_stabilisierung.csv"),
    ("Abfüllung / Verpackung", "detail_matrix_abfuellung_verpackung.csv"),
    ("Stilkontext", "detail_matrix_stilkontext_sensoriktaxonomie.csv"),
]

QUESTION_BY_PHASE = {
    "Mälzen / Schroten": [
        "Wie war das Schrotbild und der Weizenmalzanteil?",
        "Gab es Auffälligkeiten bei Malzqualität, Eiweißlösung oder Schaumstabilität?",
    ],
    "Darren": [
        "Welche Malzchargen oder Caramalz-Anteile wurden eingesetzt?",
        "Soll die Honig-/Karamellachse stilistisch stärker oder schlanker sein?",
    ],
    "Maischen": [
        "Welche Rasttemperaturen und Rastzeiten wurden gefahren?",
        "Passt Stammwürze und Restextrakt zum gewünschten Körper?",
    ],
    "Würzekochen": [
        "Wie lange und wie offen wurde gekocht?",
        "Gab es lange Whirlpool-Standzeiten oder langsame Würzekühlung?",
    ],
    "Gärung": [
        "Welcher Hefestamm, welche Pitching-Rate und welche Gärtemperatur wurden genutzt?",
        "Gab es eine Ferulasäurerast oder eine bewusste Esterführung?",
    ],
    "Reifung / Lagerung": [
        "Wie lange lag das Bier auf der Hefe und gab es eine Diacetylrast?",
        "Wirkt das Bier jung, hefig oder noch nicht rund?",
    ],
    "Abfüllung / Verpackung": [
        "Gab es Sauerstoffkontakt beim Abfüllen oder Umdrücken?",
        "Wie wurde Lichtschutz, CO₂-Vorspannung und Lagerung gehandhabt?",
    ],
}


def diagnosis_options_payload() -> dict:
    return {
        "problems": PROBLEM_OPTIONS,
        "rating_axes": RATING_AXES,
        "defect_axes": DEFECT_AXES,
        "model_note": (
            "Geführte Angaben werden intern auf die 20 Modellfeatures abgebildet; "
            "nicht gesetzte Merkmale bleiben auf Trainingsmedian."
        ),
    }


def _rating_to_feature_value(feature: str, rating: float, low: float = 1.0, high: float = 5.0) -> float:
    ranges = model_service.feature_ranges()
    meta = ranges[feature]
    frac = (rating - low) / (high - low)
    return float(meta["min"] + frac * (meta["max"] - meta["min"]))


def _known_param_value(feature: str, value: float) -> float:
    ranges = model_service.feature_ranges()
    meta = ranges[feature]
    return float(min(meta["max"], max(meta["min"], value)))


def _feature_phase_lookup() -> dict[str, str]:
    mapping = data_service.get_dashboard_data().mapping
    return {feature: phase for phase, features in mapping.items() for feature in features}


def map_brewer_input_to_features(req: DiagnoseRequest) -> dict:
    profile = dict(req.expert_features)
    touched: dict[str, dict] = {}
    defaults_used = []

    problem_defaults = PROBLEM_DEFAULTS.get(req.problem, {})
    ratings = req.ratings.model_dump()
    defects = req.defects.model_dump()
    known_params = req.known_params.model_dump()

    for axis in RATING_AXES:
        key = axis["key"]
        value = ratings.get(key)
        source = "rating"
        if value is None and key in problem_defaults:
            value = problem_defaults[key]
            source = "problem_default"
        if value is None:
            continue
        for feature in axis["features"]:
            if feature in model_service.get_model_bundle().features:
                profile[feature] = _rating_to_feature_value(feature, float(value))
                touched[feature] = {"source": source, "axis": key, "input_value": float(value)}

    for defect in DEFECT_AXES:
        key = defect["key"]
        value = defects.get(key)
        source = "defect"
        if value is None and key in problem_defaults:
            value = problem_defaults[key]
            source = "problem_default"
        if value is None or float(value) <= 0:
            continue
        for feature in defect["features"]:
            if feature in model_service.get_model_bundle().features:
                profile[feature] = _rating_to_feature_value(feature, float(value), low=0.0, high=5.0)
                touched[feature] = {"source": source, "axis": key, "input_value": float(value)}

    if "acidic/säuerlich" in problem_defaults and "acidic/säuerlich" in model_service.get_model_bundle().features:
        value = float(problem_defaults["acidic/säuerlich"])
        profile["acidic/säuerlich"] = _rating_to_feature_value("acidic/säuerlich", value, low=0.0, high=5.0)
        touched["acidic/säuerlich"] = {"source": "problem_default", "axis": "acidic", "input_value": value}

    spice_value = ratings.get("spice")
    if (
        req.problem == "spice_mismatch"
        and spice_value is not None
        and float(spice_value) >= 4.0
        and "phenolic/Phenol" in model_service.get_model_bundle().features
    ):
        profile["phenolic/Phenol"] = _rating_to_feature_value("phenolic/Phenol", float(spice_value))
        touched["phenolic/Phenol"] = {"source": "rating", "axis": "spice", "input_value": float(spice_value)}

    fruit_value = ratings.get("fruit")
    if (
        req.problem == "fruit_mismatch"
        and fruit_value is not None
        and float(fruit_value) >= 4.0
        and "estery/estrig" in model_service.get_model_bundle().features
    ):
        profile["estery/estrig"] = _rating_to_feature_value("estery/estrig", float(fruit_value))
        touched["estery/estrig"] = {"source": "rating", "axis": "fruit", "input_value": float(fruit_value)}

    for feature, value in known_params.items():
        if value is None or feature not in model_service.get_model_bundle().features:
            continue
        profile[feature] = _known_param_value(feature, float(value))
        touched[feature] = {"source": "known_param", "axis": feature, "input_value": float(value)}

    for feature in model_service.get_model_bundle().features:
        if feature not in profile:
            defaults_used.append(feature)

    full_profile = {
        feature: float(profile.get(feature, model_service.get_model_bundle().train_medians[feature]))
        for feature in model_service.get_model_bundle().features
    }

    return {
        "features": full_profile,
        "explicit_features": profile,
        "touched_features": touched,
        "defaulted_features": defaults_used,
        "problem": req.problem,
        "process_note": req.process_note,
    }


@lru_cache(maxsize=1)
def soft_memberships_payload() -> dict[str, dict]:
    hard_phase_by_feature = _feature_phase_lookup()
    rows: dict[str, dict] = {}
    for feature in model_service.get_model_bundle().features:
        counts: dict[str, float] = {}
        aliases = FEATURE_COLUMN_ALIASES.get(feature, [feature])
        for phase, filename in DETAIL_MATRICES:
            path = config.SLR_MATRICES_DIR / filename
            if not path.exists():
                continue
            matrix = pd.read_csv(path)
            for alias in aliases:
                if alias not in matrix.columns:
                    continue
                counts[phase] = counts.get(phase, 0.0) + float(pd.to_numeric(matrix[alias], errors="coerce").fillna(0).sum())
        hard_phase = hard_phase_by_feature.get(feature)
        if not counts and hard_phase:
            counts[hard_phase] = 1.0
        total = sum(counts.values()) or 1.0
        memberships = [
            {
                "phase": phase,
                "weight": value / total,
                "evidence_count": int(value),
                "is_hard_phase": phase == hard_phase,
                "summary": phase_meta(phase).get("summary", ""),
            }
            for phase, value in sorted(counts.items(), key=lambda item: item[1], reverse=True)
            if value > 0
        ]
        rows[feature] = {
            "feature": feature,
            "hard_phase": hard_phase,
            "hint": feature_hint(feature),
            "memberships": memberships,
        }
    return rows


def soft_paths_for_features(features: list[str]) -> list[dict]:
    memberships = soft_memberships_payload()
    paths = []
    for feature in features:
        if feature not in memberships:
            continue
        item = memberships[feature]
        hard_phase = item.get("hard_phase")
        soft_phases = item.get("memberships", [])
        paths.append(
            {
                **item,
                "explanation": (
                    f"Hard-XAI ordnet {feature} der Stufe {hard_phase} zu. "
                    "Die SLR zeigt zusätzlich, welche Prozessphasen bei der praktischen "
                    "Fehlersuche mitgeprüft werden sollten."
                )
                if hard_phase
                else (
                    f"Für {feature} liegen SLR-Bezüge über mehrere Kontext- oder Prozessphasen vor; "
                    "diese werden als diagnostische Hinweise genutzt."
                ),
                "top_soft_phases": [m["phase"] for m in soft_phases[:3]],
            }
        )
    return paths


def _top_feature_drivers(result: dict, limit: int = 6) -> list[dict]:
    touched = set(result.get("touched_features", {}).keys())
    items = sorted(
        result["feature_shap"].items(),
        key=lambda item: abs(float(item[1])),
        reverse=True,
    )
    return [
        {
            "feature": feature,
            "value": float(value),
            "direction": "positiv" if value > 0 else "negativ" if value < 0 else "neutral",
            "touched_by_brewer": feature in touched,
            "hint": feature_hint(feature),
        }
        for feature, value in items[:limit]
    ]


def _primary_diagnosis(result: dict) -> dict:
    recommendations = result.get("recommendations", [])
    negative = [rec for rec in recommendations if rec["direction"] == "negativ"]
    primary = negative[0] if negative else (recommendations[0] if recommendations else None)
    if not primary:
        return {
            "phase": None,
            "headline": "Keine prioritäre Stufe erkannt.",
            "detail": "Das eingegebene Profil liegt ohne klaren negativen Modellhebel vor.",
            "next_questions": [],
        }
    return {
        "phase": primary["phase"],
        "headline": primary["headline"],
        "detail": primary["detail"],
        "next_questions": QUESTION_BY_PHASE.get(primary["phase"], []),
    }


def diagnose(req: DiagnoseRequest) -> dict:
    mapped = map_brewer_input_to_features(req)
    raw = model_service.predict_and_explain(mapped["features"])
    result = data_service.enrich_prediction(raw)
    result.update(mapped)

    drivers = _top_feature_drivers(result)
    driver_features = [d["feature"] for d in drivers]
    focus_features = list(mapped["touched_features"].keys())
    path_features = list(dict.fromkeys(focus_features + driver_features))
    result["feature_drivers"] = drivers
    result["soft_slr_paths"] = soft_paths_for_features(path_features)
    result["primary_diagnosis"] = _primary_diagnosis(result)
    result["methodology_note"] = (
        "Die Prognose und Hard Group-SHAP bleiben die additive XAI-Ebene. "
        "Soft-SLR-Pfade sind keine neuen SHAP-Werte, sondern Literatur-Kontext "
        "für die praktische Fehlersuche."
    )
    return result

"""Chatbot-Anbindung an ein lokal gehostetes Ollama-Modell.

**Architektur:** Natives Ollama-Tool-Calling. Das lokal verfügbare Modell
(``qwen3:30b-a3b``, geprüft via ``GET /api/tags`` — Capabilities:
``["completion", "tools", "thinking"]``) unterstützt Function-Calling nach
dem OpenAI-kompatiblen Format, das Ollama implementiert. Das Modell entscheidet
selbst, welches der unten definierten Tools es für eine Frage braucht, ruft es
mit Argumenten auf, bekommt das echte Ergebnis zurück und formuliert daraus
die Antwort — es erfindet keine Brau-Fakten oder Zahlen, weil es nur mit den
von den Tools zurückgegebenen echten Werten argumentieren soll (siehe
System-Prompt-Leitplanken).

Vorgänger-Architektur war reine Context-Injection; die aktuelle Variante nutzt
Qwen als Tool-Calling-Schicht über den bestehenden Modell-/SHAP-/SLR-Services.
"""

from __future__ import annotations

import json

import httpx

from . import config, data_service, diagnosis_service, model_service
from .brewing_knowledge import FEATURE_HINTS, PHASE_INFO

MAX_TOOL_HOPS = 4

SYSTEM_PROMPT = """Du bist ein Erklär-Assistent für ein Brauprozess-Analyse-Dashboard \
(Domain-Constrained Group-SHAP für South German-Style Hefeweizen Hell).

Feste Regeln, die du NIE brichst:
1. SHAP-Werte erklären das *Modellverhalten* (welche Merkmale die Vorhersage treiben), \
NICHT kausal den Brauprozess. Sag nie "wenn Sie X reduzieren, steigt der Score um Y" — \
das wäre eine kausale Aussage, die die Methode nicht stützt.
2. Nutze AUSSCHLIESSLICH die Zahlen und Fakten, die dir die Tools zurückgeben. \
Erfinde keine Brauwissenschaft, keine Zahlen, keine Studien. Wenn du eine Zahl nennst, \
hol sie dir vorher über ein Tool.
3. Bei Fragen zum aktuellen Bier/Profil: rufe IMMER zuerst get_current_prediction auf, \
auch wenn du glaubst die Antwort schon zu wissen.
4. Wenn es um praktische Fehlersuche geht: rufe get_feature_drivers und get_soft_slr_paths auf. \
Trenne dabei klar zwischen Hard-XAI (Modell) und Soft-SLR (mitzuprüfende Prozesskette).
5. Bei Unsicherheit oder Fragen außerhalb des Kontexts: sag das ehrlich und verweise \
auf den Methodik-Tab (ggf. get_methodology_summary aufrufen).
6. Antworte knapp, konkret, auf Deutsch, in der Sprache eines Brauers (keine ML-Fachbegriffe \
ohne Erklärung).
7. Die Stichprobe ist klein (195 Biere) — sei vorsichtig mit Verallgemeinerungen."""


def _build_tools_schema() -> list[dict]:
    feature_names = list(FEATURE_HINTS.keys())
    phase_names = list(PHASE_INFO.keys())
    return [
        {
            "type": "function",
            "function": {
                "name": "get_current_prediction",
                "description": (
                    "Liefert die aktuelle Modell-Vorhersage für das im Chat-Kontext "
                    "betrachtete Bier (eigenes eingegebenes Profil oder ausgewähltes "
                    "historisches Bier): vorhergesagte Bewertung, Group-SHAP je "
                    "Brauprozess-Stufe und Handlungsempfehlungen."
                ),
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_diagnosis_summary",
                "description": (
                    "Liefert die geführte Brauer-Diagnose, falls sie im aktuellen "
                    "Dashboard-Kontext vorhanden ist: Problem, gemappte Features, "
                    "Defaults, primärer Hebel und Methodikhinweis."
                ),
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_feature_drivers",
                "description": (
                    "Liefert die wichtigsten Feature-SHAP-Treiber für das aktuelle Profil, "
                    "sortiert nach absolutem Einfluss."
                ),
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_soft_slr_paths",
                "description": (
                    "Liefert SLR-basierte Soft-Assignment-Prozesspfade zu sensorischen "
                    "Features. Diese Pfade sind diagnostische Hinweise, keine additiven SHAP-Werte."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "features": {
                            "type": "array",
                            "items": {"type": "string", "enum": feature_names},
                            "description": "Optional: konkrete Features. Wenn leer, werden aktuelle Top-Treiber genutzt.",
                        }
                    },
                    "required": [],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_feature_definition",
                "description": "Erklärt ein sensorisches Merkmal (Glossar-Eintrag, brauerverständlich).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "feature": {"type": "string", "enum": feature_names, "description": "Name des Merkmals"}
                    },
                    "required": ["feature"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_phase_info",
                "description": "Beschreibung + Stellhebel einer Brauprozess-Stufe.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phase": {"type": "string", "enum": phase_names, "description": "Name der Brauprozess-Stufe"}
                    },
                    "required": ["phase"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_methodology_summary",
                "description": (
                    "Liefert die methodischen Eckdaten (Stichprobengröße, R², "
                    "SLR-vs-HSIC-Faithfulness, Disclaimer) für Fragen zur Verlässlichkeit der Methode."
                ),
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        },
    ]


def _build_tool_impls(req) -> dict:
    def get_current_prediction() -> dict:
        if req.own_profile:
            result = model_service.predict_and_explain(req.own_profile)
            return data_service.enrich_prediction(result)
        if req.beer_id is not None:
            try:
                return data_service.beer_detail_payload(req.beer_id)
            except (IndexError, KeyError):
                return {"error": "Bier-ID nicht gefunden."}
        return {"error": "Kein Bier/Profil im aktuellen Kontext ausgewählt."}

    def get_diagnosis_summary() -> dict:
        if req.diagnosis_context:
            return req.diagnosis_context
        return {
            "error": (
                "Keine geführte Diagnose im Chat-Kontext. Nutze get_current_prediction, "
                "wenn nur ein vollständiges Feature-Profil vorhanden ist."
            )
        }

    def get_feature_drivers() -> dict:
        if req.diagnosis_context and req.diagnosis_context.get("feature_drivers"):
            return {"feature_drivers": req.diagnosis_context["feature_drivers"]}
        current = get_current_prediction()
        if "feature_shap" not in current:
            return current
        items = sorted(current["feature_shap"].items(), key=lambda item: abs(float(item[1])), reverse=True)
        return {
            "feature_drivers": [
                {
                    "feature": feature,
                    "value": float(value),
                    "direction": "positiv" if value > 0 else "negativ" if value < 0 else "neutral",
                    "hint": FEATURE_HINTS.get(feature, ""),
                }
                for feature, value in items[:6]
            ]
        }

    def get_soft_slr_paths(features: list[str] | None = None) -> dict:
        selected = features or []
        if not selected:
            drivers = get_feature_drivers().get("feature_drivers", [])
            selected = [d["feature"] for d in drivers[:6]]
        return {
            "soft_slr_paths": diagnosis_service.soft_paths_for_features(selected),
            "disclaimer": (
                "Soft-SLR-Pfade zeigen Mehrfachbezüge aus der Literatur. "
                "Sie sind keine additive SHAP-Zerlegung und ersetzen nicht die Hard-XAI."
            ),
        }

    def get_feature_definition(feature: str) -> dict:
        if feature not in FEATURE_HINTS:
            return {"error": f"Unbekanntes Merkmal: {feature}", "verfuegbare_merkmale": list(FEATURE_HINTS.keys())}
        return {"feature": feature, "hint": FEATURE_HINTS[feature]}

    def get_phase_info(phase: str) -> dict:
        if phase not in PHASE_INFO:
            return {"error": f"Unbekannte Stufe: {phase}", "verfuegbare_stufen": list(PHASE_INFO.keys())}
        return {"phase": phase, **PHASE_INFO[phase]}

    def get_methodology_summary() -> dict:
        methodology = data_service.methodology_payload()
        fp = methodology.get("faithfulness_group_player", {})
        return {
            "n_beers": methodology.get("n_beers"),
            "test_r2": methodology.get("test_r2_stored"),
            "retention_slr": fp.get("retention_slr"),
            "retention_hsic": fp.get("retention_hsic"),
            "faithfulness_significant": fp.get("significant"),
            "disclaimer": (
                "SHAP erklärt die Modellvorhersage, nicht kausal den Brauprozess. "
                "Die Stufen-Zuordnung ist literaturgestützt plausibel, aber nicht direkt gemessen."
            ),
        }

    return {
        "get_current_prediction": get_current_prediction,
        "get_diagnosis_summary": get_diagnosis_summary,
        "get_feature_drivers": get_feature_drivers,
        "get_soft_slr_paths": get_soft_slr_paths,
        "get_feature_definition": get_feature_definition,
        "get_phase_info": get_phase_info,
        "get_methodology_summary": get_methodology_summary,
    }


async def _call_ollama(client: httpx.AsyncClient, messages: list[dict], tools: list[dict]) -> dict:
    payload = {"model": config.OLLAMA_MODEL, "messages": messages, "tools": tools, "stream": False}
    resp = await client.post(f"{config.OLLAMA_HOST}/api/chat", json=payload)
    resp.raise_for_status()
    return resp.json()


async def answer(req) -> str:
    tools = _build_tools_schema()
    tool_impls = _build_tool_impls(req)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": req.message},
    ]

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            for _ in range(MAX_TOOL_HOPS):
                data = await _call_ollama(client, messages, tools)
                message = data.get("message", {})
                tool_calls = message.get("tool_calls") or []

                if not tool_calls:
                    return (message.get("content") or "").strip()

                messages.append(message)
                for call in tool_calls:
                    fn = call.get("function", {})
                    name = fn.get("name")
                    args = fn.get("arguments") or {}
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except json.JSONDecodeError:
                            args = {}
                    impl = tool_impls.get(name)
                    result = impl(**args) if impl else {"error": f"Unbekanntes Tool: {name}"}
                    messages.append(
                        {
                            "role": "tool",
                            "tool_name": name,
                            "content": json.dumps(result, ensure_ascii=False),
                        }
                    )

            return "⚠ Zu viele Tool-Aufrufe in Folge — bitte Frage präzisieren."
    except httpx.HTTPError as exc:
        return f"⚠ Der lokale Ollama-Dienst ist nicht erreichbar ({config.OLLAMA_HOST}). Details: {exc}"

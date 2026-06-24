"""Chatbot-Anbindung an ein lokal gehostetes Ollama-Modell.

**Architektur-Entscheidung:** Das lokal verfügbare Modell (``deepseek-r1:14b``,
geprüft via ``GET /api/tags`` — Capabilities: ``["completion", "thinking"]``,
explizit **kein** ``"tools"``) unterstützt kein natives Ollama-Tool-Calling.
Deshalb "Context-Injection" statt Function-Calling: Das Backend entscheidet
deterministisch, welche der vorhandenen Tool-Funktionen (Group-SHAP des
aktuellen Profils/Biers, Merkmals-/Phasen-Glossar, Methodik-Disclaimer)
relevant sind, und packt deren *echte* Zahlen/Texte strukturiert in den
Prompt — das Modell formuliert/personalisiert nur, es erfindet keine Brau-
Fakten oder Zahlen. Funktioniert mit jedem Ollama-Modell, auch ohne
Tool-Calling-Unterstützung; sollte später ein Tool-fähiges Modell verfügbar
sein, kann auf natives Function-Calling umgestellt werden, ohne dass sich die
Tool-Funktionen selbst (unten) ändern müssten.
"""

from __future__ import annotations

import json

import httpx

from . import config, data_service, model_service
from .brewing_knowledge import FEATURE_HINTS, PHASE_INFO, recommend_for_phase

SYSTEM_PROMPT = """Du bist ein Erklär-Assistent für ein Brauprozess-Analyse-Dashboard \
(Domain-Constrained Group-SHAP für South German-Style Hefeweizen Hell).

Feste Regeln, die du NIE brichst:
1. SHAP-Werte erklären das *Modellverhalten* (welche Merkmale die Vorhersage treiben), \
NICHT kausal den Brauprozess. Sag nie "wenn Sie X reduzieren, steigt der Score um Y" — \
das wäre eine kausale Aussage, die die Methode nicht stützt.
2. Nutze AUSSCHLIESSLICH die Zahlen und Fakten aus dem bereitgestellten Kontext. \
Erfinde keine Brauwissenschaft, keine Zahlen, keine Studien.
3. Bei Unsicherheit oder Fragen außerhalb des Kontexts: sag das ehrlich und verweise \
auf den Methodik-Tab.
4. Antworte knapp, konkret, auf Deutsch, in der Sprache eines Brauers (keine ML-Fachbegriffe \
ohne Erklärung).
5. Die Stichprobe ist klein (195 Biere) — sei vorsichtig mit Verallgemeinerungen und nenne \
bei Bedarf die Unsicherheit (R², RMSE)."""


def _gather_context(req) -> dict:
    """Deterministische "Tool-Aufrufe": sammelt die zum Request passenden Fakten."""
    context: dict = {}

    if req.own_profile:
        context["own_profile"] = model_service.predict_and_explain(req.own_profile)
    elif req.beer_id is not None:
        try:
            context["historical_beer"] = data_service.beer_detail_payload(req.beer_id)
        except (IndexError, KeyError):
            pass

    if req.focus_phase and req.focus_phase in PHASE_INFO:
        context["focus_phase"] = {"name": req.focus_phase, **PHASE_INFO[req.focus_phase]}

    # Einfache Keyword-Erkennung: erwähnte Merkmale/Phasen im Freitext erkennen
    # und deren Glossar-Eintrag ergänzen (Ersatz für echtes Tool-Calling).
    msg_lower = req.message.lower()
    mentioned_features = {
        name: hint for name, hint in FEATURE_HINTS.items() if name.split("/")[0].strip().lower() in msg_lower
    }
    if mentioned_features:
        context["mentioned_feature_hints"] = mentioned_features
    mentioned_phases = {name: info for name, info in PHASE_INFO.items() if name.split("/")[0].strip().lower() in msg_lower}
    if mentioned_phases:
        context["mentioned_phase_info"] = mentioned_phases

    methodology = data_service.methodology_payload()
    fp = methodology.get("faithfulness_group_player", {})
    context["methodology_summary"] = {
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
    return context


async def answer(req) -> str:
    context = _gather_context(req)
    user_content = (
        f"Kontext (echte Zahlen/Fakten, JSON):\n{json.dumps(context, ensure_ascii=False, indent=2)}\n\n"
        f"Frage des Brauers: {req.message}"
    )
    payload = {
        "model": config.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "stream": False,
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{config.OLLAMA_HOST}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        return (
            "⚠ Der lokale Ollama-Dienst ist nicht erreichbar "
            f"({config.OLLAMA_HOST}). Details: {exc}"
        )
    return data.get("message", {}).get("content", "").strip()

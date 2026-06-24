"""Brauwissenschaftliches Domänenwissen für die Interpretation der Group-SHAP-Werte.

Dieses Modul übersetzt die statistischen SHAP-Beiträge in die Denk- und
Handlungswelt des Brauers. Es enthält:

* ``PHASE_INFO``   – Kurzbeschreibung jeder Brauprozess-Stufe + Stellhebel
* ``FEATURE_HINTS`` – richtungsabhängige Hinweise je sensorischem Merkmal
* Hilfsfunktionen zur Erzeugung templatierter Handlungsempfehlungen

Die Texte sind bewusst als statische Templates gehalten. Ein optionaler
LLM-Layer kann später an ``recommend_for_phase`` andocken, ohne die übrige
App zu verändern.
"""

from __future__ import annotations

import pandas as pd

# --------------------------------------------------------------------------
# Beschreibung der sieben Brauprozess-Stufen (Hefeweizen)
# --------------------------------------------------------------------------
PHASE_INFO: dict[str, dict[str, str]] = {
    "Mälzen / Schroten": {
        "icon": "🌾",
        "summary": (
            "Malzaufbereitung und Schrotbild bestimmen die Extraktausbeute und "
            "die Eiweisslösung — Grundlage für Körper und Schaum."
        ),
        "lever": "Schrotspalt, Weizen-/Gerstenmalz-Verhältnis, Malzqualität.",
    },
    "Darren": {
        "icon": "🔥",
        "summary": (
            "Die Darrführung steuert Maillard-Produkte: Karamell-, Biskuit- und "
            "Brotnoten kommen aus der Darrintensität des Malzes."
        ),
        "lever": "Darrtemperatur/-dauer, Anteil Caramalz, helles vs. dunkles Malz.",
    },
    "Maischen": {
        "icon": "🌡️",
        "summary": (
            "Maischrasten bestimmen Vergärgrad, Restextrakt und damit "
            "Vollmundigkeit und Stammwürze."
        ),
        "lever": "Rasttemperaturen (Maltose-/Verzuckerungsrast), Maischdauer, Stammwürze.",
    },
    "Würzekochen": {
        "icon": "♨️",
        "summary": (
            "Kochen vertreibt DMS-Vorläufer und unerwünschte pflanzliche Noten. "
            "Hier entscheidet sich die Würzereinheit."
        ),
        "lever": "Kochzeit, Verdampfungsrate, offene Kochung, schnelle Würzekühlung.",
    },
    "Gärung": {
        "icon": "🫧",
        "summary": (
            "Das Herz des Hefeweizens: Hefestamm und Gärführung erzeugen Banane "
            "(Ester) und Nelke (4-Vinylguaiacol) sowie das Säureprofil."
        ),
        "lever": "Hefestamm, Gärtemperatur, Pitching-Rate, Ferulasäurerast, Stammwürze.",
    },
    "Reifung / Lagerung": {
        "icon": "⏳",
        "summary": (
            "Reifung baut Gärnebenprodukte wie Diacetyl ab und rundet das Bier. "
            "Zu kurze Reifung hinterlässt Butter-/Hefenoten."
        ),
        "lever": "Diacetylrast, Reifedauer, Temperaturführung, Hefekontakt.",
    },
    "Abfüllung / Verpackung": {
        "icon": "📦",
        "summary": (
            "Sauerstoffeintrag und Lichtschutz bei der Abfüllung entscheiden über "
            "Oxidation, metallische und lichtinduzierte Fehlaromen."
        ),
        "lever": "O₂-armes Abfüllen, Braunglas/Schutz, CO₂-Vorspannung, Hygiene.",
    },
}

# --------------------------------------------------------------------------
# Merkmals-Hinweise: Was bedeutet ein Merkmal, wenn es den Score TREIBT (pos)
# bzw. DRÜCKT (neg)? Formuliert für den Brauer.
# --------------------------------------------------------------------------
FEATURE_HINTS: dict[str, str] = {
    "Cremigkeit": "Cremiges Mundgefühl — über Eiweissrast und Schrotbild steuerbar.",
    "Säure": "Säureprofil — über Maisch-pH und Wasserchemie justierbar.",
    "acidic/säuerlich": "Säuerliche Note — auf Gärhygiene und Lacto-Eintrag prüfen.",
    "Karamell": "Karamellnote aus dem Darrprozess — Caramalz-Anteil anpassen.",
    "Biskuit": "Biskuit-/Keksnote aus hellem Malz — Schüttung und Darrgrad steuern.",
    "Honig": "Honigartige Süsse — Restextrakt/Vergärgrad über Maischrasten steuern.",
    "Fruchtaroma / Fruchtester": (
        "Bananiger Fruchtester (Isoamylacetat) — Kernmerkmal Hefeweizen. "
        "Höhere Gärtemperatur und Open Fermentation fördern Ester."
    ),
    "estery/estrig": "Estrige Gesamtnote — über Hefestamm und Gärtemperatur steuerbar.",
    "Gewürzaroma / phenolisch": (
        "Nelken-/Gewürznote (4-Vinylguaiacol) — über Ferulasäurerast (~44 °C) "
        "und POF+ Weizenhefe fördern."
    ),
    "phenolic/Phenol": (
        "Phenolische Note — im Hefeweizen stiltypisch (Nelke), im Übermass jedoch "
        "medizinisch/rauchig. Hefestamm und Wasserchemie prüfen."
    ),
    "Vollmundigkeit": "Körper/Vollmundigkeit — über Restextrakt und Maischrasten steuern.",
    "yeasty/hefig": "Hefige Note — Hefekontakt/Reifung und Abzug der Hefe prüfen.",
    "DMS": "DMS (Kochgemüse) — länger/offener kochen und Würze schnell kühlen.",
    "metalic/metallisch": "Metallische Note — Equipment/Wasser und Oxidation prüfen.",
    "acidic": "Säuerliche Note — Gärhygiene prüfen.",
    "vegetal/Gemüse": "Pflanzlich-grasige Note — Kochung und Würzebehandlung prüfen.",
    "Diacetyl": "Diacetyl (Butter) — Diacetylrast verlängern, Reifung sicherstellen.",
    "light struck flavour/lichtgeschmack": (
        "Lichtgeschmack — Braunglas/Lichtschutz, hopfenstabile Produkte einsetzen."
    ),
    "Oxidation": "Oxidation (Pappe/Sherry) — Sauerstoffeintrag bei Abfüllung minimieren.",
    "stammwuerze": "Stammwürze — Rezeptparameter; beeinflusst Körper und Alkohol.",
    "alkoholgehalt": "Alkoholgehalt — Resultat von Stammwürze und Vergärgrad.",
}


def feature_hint(feature: str) -> str:
    return FEATURE_HINTS.get(feature, f"Merkmal „{feature}“.")


def phase_meta(phase: str) -> dict[str, str]:
    return PHASE_INFO.get(
        phase, {"icon": "•", "summary": "", "lever": ""}
    )


def recommend_for_phase(
    phase: str,
    phase_value: float,
    feature_contribs: pd.Series,
) -> dict:
    """Erzeugt eine templatierte Handlungsempfehlung für eine Brauprozess-Stufe.

    Parameters
    ----------
    phase : Name der Brauprozess-Stufe.
    phase_value : signierter Group-SHAP-Beitrag dieser Stufe (Φ).
    feature_contribs : signierte SHAP-Beiträge der Features dieser Stufe.

    Returns
    -------
    dict mit ``direction``, ``headline``, ``detail`` und ``drivers``.
    """
    meta = phase_meta(phase)
    contribs = feature_contribs.sort_values()

    if phase_value < -0.05:
        direction = "negativ"
        worst = contribs.head(2)
        drivers = [(f, float(v)) for f, v in worst.items() if v < 0]
        headline = f"{meta['icon']} {phase} zieht die Bewertung nach unten."
        tips = " ".join(feature_hint(f) for f, _ in drivers)
        detail = f"Stellhebel: {meta['lever']} {tips}".strip()
    elif phase_value > 0.05:
        direction = "positiv"
        best = contribs.tail(2)
        drivers = [(f, float(v)) for f, v in best.items() if v > 0][::-1]
        headline = f"{meta['icon']} {phase} stärkt die Bewertung — beibehalten."
        keep = ", ".join(f for f, _ in drivers) if drivers else "aktuelles Profil"
        detail = f"Positiv getrieben durch: {keep}. Prozess stabil halten."
    else:
        direction = "neutral"
        drivers = []
        headline = f"{meta['icon']} {phase} ist bewertungsneutral."
        detail = "Keine prioritäre Massnahme; Prozess im Zielkorridor."

    return {
        "phase": phase,
        "direction": direction,
        "value": float(phase_value),
        "headline": headline,
        "detail": detail,
        "drivers": drivers,
    }

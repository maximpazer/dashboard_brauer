"""Pydantic-Schemas für die API."""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """Sensorikprofil des Brauers. Nicht gesetzte Merkmale werden mit den
    Trainings-Medianen imputiert (siehe model_service.build_feature_row)."""

    features: dict[str, float] = Field(default_factory=dict)


ProblemKey = Literal[
    "body_low",
    "creaminess_low",
    "acid_high",
    "fruit_mismatch",
    "spice_mismatch",
    "malt_low",
    "oxidized",
    "dms",
    "diacetyl",
    "yeasty",
    "score_only",
]


class GuidedRatings(BaseModel):
    body: Optional[float] = Field(default=None, ge=1, le=5)
    creaminess: Optional[float] = Field(default=None, ge=1, le=5)
    acid: Optional[float] = Field(default=None, ge=1, le=5)
    fruit: Optional[float] = Field(default=None, ge=1, le=5)
    spice: Optional[float] = Field(default=None, ge=1, le=5)
    malt_sweet: Optional[float] = Field(default=None, ge=1, le=5)


class DefectRatings(BaseModel):
    oxidation: Optional[float] = Field(default=None, ge=0, le=5)
    dms: Optional[float] = Field(default=None, ge=0, le=5)
    diacetyl: Optional[float] = Field(default=None, ge=0, le=5)
    yeasty: Optional[float] = Field(default=None, ge=0, le=5)
    metallic: Optional[float] = Field(default=None, ge=0, le=5)
    lightstruck: Optional[float] = Field(default=None, ge=0, le=5)


class KnownParams(BaseModel):
    stammwuerze: Optional[float] = None
    alkoholgehalt: Optional[float] = None


class DiagnoseRequest(BaseModel):
    problem: ProblemKey = "score_only"
    ratings: GuidedRatings = Field(default_factory=GuidedRatings)
    defects: DefectRatings = Field(default_factory=DefectRatings)
    known_params: KnownParams = Field(default_factory=KnownParams)
    process_note: str = ""
    expert_features: dict[str, float] = Field(default_factory=dict)


class BatchRequest(BaseModel):
    """Ein zu speichernder Sud für den Verlauf-Tab."""

    inputs: dict[str, float] = Field(default_factory=dict)
    note: str = ""
    label: Optional[str] = None
    # Jury-Kategorien außerhalb des Modells (Sensorik-Kontext), optional.
    context: dict[str, float] = Field(default_factory=dict)


class ChatTurn(BaseModel):
    """Ein vorheriger Gesprächs-Turn für echte Mehrturn-Nachfragen."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    # Bisheriger Gesprächsverlauf (ohne System-Prompt) — ermöglicht Nachfragen.
    history: list[ChatTurn] = Field(default_factory=list)
    # Kontext der aktuell betrachteten Ansicht (z.B. eingegebenes Profil oder
    # ausgewähltes historisches Bier) — wird dem LLM als Tool-Ersatz mitgegeben.
    beer_id: Optional[int] = None
    own_profile: Optional[dict[str, float]] = None
    focus_phase: Optional[str] = None
    diagnosis_context: Optional[dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str

"""Pydantic-Schemas für die API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """Sensorikprofil des Brauers. Nicht gesetzte Merkmale werden mit den
    Trainings-Medianen imputiert (siehe model_service.build_feature_row)."""

    features: dict[str, float] = Field(default_factory=dict)


class BatchRequest(BaseModel):
    """Ein zu speichernder Sud für den Verlauf-Tab."""

    inputs: dict[str, float] = Field(default_factory=dict)
    note: str = ""
    label: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    # Kontext der aktuell betrachteten Ansicht (z.B. eingegebenes Profil oder
    # ausgewähltes historisches Bier) — wird dem LLM als Tool-Ersatz mitgegeben.
    beer_id: Optional[int] = None
    own_profile: Optional[dict[str, float]] = None
    focus_phase: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str

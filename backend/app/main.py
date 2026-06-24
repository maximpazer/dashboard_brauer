"""FastAPI-Backend für das Brauer-Dashboard.

Ersetzt das Streamlit-Dashboard (`dashboard/`) durch eine API für das
Next.js-Frontend. Siehe
``documents/planning/status_und_zielbild_2026-06-24.md`` für den Kontext.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import batch_service, data_service, model_service
from .brewing_knowledge import feature_hint
from .chat_service import answer as chat_answer
from .schemas import BatchRequest, ChatRequest, ChatResponse, PredictRequest

app = FastAPI(title="Brauer-Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/features")
def features() -> list[dict]:
    bundle = model_service.get_model_bundle()
    ranges = model_service.feature_ranges()
    mapping = data_service.get_dashboard_data().mapping
    phase_by_feature = {f: phase for phase, feats in mapping.items() for f in feats}
    return [
        {"name": f, "hint": feature_hint(f), "phase": phase_by_feature.get(f), **ranges[f]}
        for f in bundle.features
    ]


@app.get("/api/groups/summary")
def groups_summary() -> dict:
    return data_service.groups_summary_payload()


@app.get("/api/groups/{phase}")
def groups_drilldown(phase: str) -> dict:
    try:
        return data_service.group_drilldown_payload(phase)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unbekannte Brauprozess-Stufe: {phase}")


@app.get("/api/beers")
def beers_list() -> list[dict]:
    return data_service.beers_list_payload()


@app.get("/api/beers/{beer_id}")
def beer_detail(beer_id: int) -> dict:
    try:
        return data_service.beer_detail_payload(beer_id)
    except IndexError:
        raise HTTPException(status_code=404, detail=f"Bier-ID nicht gefunden: {beer_id}")


@app.post("/api/predict")
def predict(req: PredictRequest) -> dict:
    result = model_service.predict_and_explain(req.features)
    benchmark = data_service.benchmark_percentile_payload(result["predicted_total"])
    result["benchmark_percentile"] = benchmark["percentile"]

    dashboard = data_service.get_dashboard_data()
    phases, mapping = dashboard.phases, dashboard.mapping
    group_shap = {
        phase: sum(result["feature_shap"].get(f, 0.0) for f in mapping.get(phase, []))
        for phase in phases
    }
    result["group_shap"] = group_shap
    result["recommendations"] = data_service.recommendations_payload(group_shap, result["feature_shap"])

    score_1_5, uncertainty_1_5 = data_service.total_to_scale_1_5(result["predicted_total"])
    result["score_1_5"] = score_1_5
    result["score_1_5_uncertainty"] = uncertainty_1_5
    result["benchmark_quartiles_1_5"] = data_service.benchmark_quartiles_1_5()
    return result


@app.post("/api/batches")
def create_batch(req: BatchRequest) -> dict:
    return batch_service.save_batch(req.inputs, req.note, req.label)


@app.get("/api/batches")
def batches_list() -> list[dict]:
    return batch_service.list_batches()


@app.get("/api/batches/{batch_id}")
def batch_detail(batch_id: str) -> dict:
    try:
        return batch_service.get_batch(batch_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Sud nicht gefunden: {batch_id}")


@app.get("/api/benchmark")
def benchmark(total: float) -> dict:
    return data_service.benchmark_percentile_payload(total)


@app.get("/api/methodology")
def methodology() -> dict:
    return data_service.methodology_payload()


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    reply = await chat_answer(req)
    return ChatResponse(reply=reply)

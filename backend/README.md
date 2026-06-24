# Brauer-Dashboard Backend

FastAPI-Backend für das Brauer-Dashboard. Lädt den beer-level XGBoost-Checkpoint
(`results/models/hefeweizen/alle_0_486_xgboost_no_formeln_unskaliert/`) sowie die
vorberechneten Group-SHAP-/Evaluations-Artefakte aus `results/shap/` und
`results/evaluation/` (siehe `code/03_shap.ipynb`, `code/04_evaluation.ipynb`).

## Setup

**Wichtig:** Das Python-`.venv` für dieses Projekt sollte auf einem lokalen
Laufwerk liegen, nicht direkt auf diesem netzwerk-gemounteten Verzeichnis —
Binaries dort sind teils nicht ausführbar (`PermissionError: [Errno 13]`).
Empfehlung: venv lokal anlegen, Code von hier aus mounten/lesen.

```bash
python3 -m venv /pfad/lokal/venv
/pfad/lokal/venv/bin/pip install -r requirements.txt
```

xgboost benötigt auf macOS ARM64 `libomp` (Homebrew: `brew install libomp`).

## Start

```bash
/pfad/lokal/venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Health-Check: `GET http://localhost:8000/api/health`

## Endpunkte

| Endpunkt | Zweck |
|---|---|
| `GET /api/features` | Sensorik-Merkmale (Name, Hinweis, Min/Median/Max) für das Eingabeformular |
| `GET /api/groups/summary` | Globale Brauprozess-Stufen-Wichtigkeit |
| `GET /api/groups/{phase}` | Merkmals-Drilldown einer Stufe |
| `GET /api/beers` | Liste der 195 historischen Biere |
| `GET /api/beers/{id}` | Detail eines historischen Bieres (SHAP, Perzentile, Empfehlungen) |
| `POST /api/predict` | Live-Vorhersage + SHAP + Empfehlungen + 1-5-Score für ein eingegebenes Profil |
| `GET /api/benchmark?total=X` | Perzentil einer Bewertung in der historischen Verteilung |
| `GET /api/methodology` | SLR-vs-HSIC-Faithfulness/Stabilität (für den Methodik-Tab) |
| `POST /api/chat` | Chatbot (Context-Injection, lokales Ollama-Modell) |
| `POST /api/batches` | Sud speichern (Verlauf-Tab) — JSON-Datei-Persistenz |
| `GET /api/batches` | Gespeicherte Sude, neueste zuerst |
| `GET /api/batches/{id}` | Ein gespeicherter Sud im Detail |

## Score-Skala (1-5)

`/api/predict` liefert zusätzlich zur echten TOTAL-Jury-Skala (~22-40) einen
`score_1_5` (lineare Umrechnung anhand der historischen Min/Max der 195 Biere)
und `score_1_5_uncertainty` (RMSE linear mitskaliert — exakte Fehlerfortpflanzung
bei linearer Transformation). `benchmark_quartiles_1_5` liefert p25/Mittelwert/p75
der historischen Verteilung auf derselben Skala, für den Benchmark-Balken im
Frontend. Siehe `data_service.total_to_scale_1_5()` / `benchmark_quartiles_1_5()`.

## Verlauf-Persistenz

`batch_service.py` speichert gespeicherte Sude als flache Liste in
`app/data/batches.json` (wird beim ersten Speichern angelegt). Schreibt die
Datei direkt (`open(path, "w")`), **kein** Temp-Datei+Rename-Trick — auf
diesem Netzwerk-Mount sind solche Rename-Operationen unzuverlässig
(`EPERM`/`EIO`, siehe `frontend/README.md`).

## Bekannter Pickle/xgboost-Versions-Effekt

Beim Laden eines mit anderer xgboost-Version gepickelten Modells wird
`base_score` auf den Default (0.5) zurückgesetzt. `model_service.py` korrigiert
das automatisch anhand des im Checkpoint mitgespeicherten Trainings-Snapshots
(`data/train.parquet` + `val.parquet`). Siehe `code/03_shap.ipynb` für die
ursprüngliche Diagnose.

## Ollama / Chat

`chat_service.py` ruft ein lokal gehostetes Ollama-Modell unter
`http://localhost:11434` auf (Standard-Modellname `deepseek-r1:14b`, siehe
`config.py`). Das aktuell verfügbare Modell unterstützt **kein** natives
Tool-Calling (`/api/tags`-Capabilities: `["completion", "thinking"]`) — der
Chat nutzt deshalb Context-Injection statt Function-Calling.

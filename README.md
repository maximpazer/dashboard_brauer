# Dashboard Brauer

Brau-Coach AI: ein FastAPI-Backend und Next.js-Frontend für ein Hefeweizen-Brauer-Dashboard.

Das Backend lädt das trainierte beer-level Modell und die vorberechneten SHAP-/Evaluationsartefakte aus dem übergeordneten `Final_Model/results`-Verzeichnis. Das Frontend bietet einen 5-Schritte-Workflow:

1. Mein Bier
2. Prognose
3. Prozess-Stufen
4. Nächste Schritte
5. Verlauf

## Struktur

- `backend/` - FastAPI API für Modell-Inferenz, SHAP-Erklärung, Empfehlungen, Chat und gespeicherte Sude
- `frontend/` - Next.js/TypeScript UI für den Brauer-Workflow
- `indee.md` - ursprünglicher Dashboard-Prototyp

## Backend

```bash
cd backend
python3 -m venv /path/to/local/venv
/path/to/local/venv/bin/pip install -r requirements.txt
/path/to/local/venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Siehe `backend/README.md` für Details zu Modellpfaden, Endpunkten und Ollama.

## Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Standard-Frontend: `http://localhost:3000`
Standard-Backend: `http://localhost:8000`

Siehe `frontend/README.md` für Details.

## Hinweis

SHAP erklärt das Modellverhalten, nicht kausal den Brauprozess. Handlungsempfehlungen sind eine domänenbasierte Interpretationsschicht und müssen mit Brauwissen validiert werden.

# Dashboard Brauer

Brau-Coach AI: ein FastAPI-Backend und Next.js-Frontend für ein Hefeweizen-Brauer-Dashboard.

Das Backend lädt das trainierte beer-level Modell und die vorberechneten SHAP-/Evaluationsartefakte aus dem übergeordneten `Final_Model/results`-Verzeichnis. Das Frontend bietet einen diagnostischen 5-Schritte-Workflow:

1. Problem erfassen
2. Diagnose
3. Prognose
4. Prozess-Stufen
5. Verlauf

## Struktur

- `backend/` - FastAPI API für Modell-Inferenz, SHAP-Erklärung, Soft-SLR-Diagnose, Qwen-Tool-Chat und gespeicherte Sude
- `frontend/` - Next.js/TypeScript UI für den geführten Brauer-Workflow
- `indee.md` - ursprünglicher Dashboard-Prototyp

## Git-/Push-Workflow

Dieses Verzeichnis liegt auf einem Netzwerk-Mount. Dort sind Git-Operationen
und Dotfiles wie `.git/` oder `.gitignore` teilweise unzuverlässig bzw. werden
vom Dateisystem blockiert. Für Commits und Pushes sollte deshalb **nicht direkt
in diesem Ordner** gearbeitet werden.

Empfohlener Workflow:

```bash
# Repo lokal auf ein normales Laufwerk klonen
git clone git@github.com:maximpazer/dashboard_brauer.git
cd dashboard_brauer

# dort entwickeln, committen und pushen
git status
git add .
git commit -m "..."
git push
```

Wenn Änderungen zuerst im Projektordner unter
`Final_Model/code/dashboard_brauer` entstehen, kopiere sie anschließend in den
lokalen Clone und pushe von dort. Der lokale Clone ist die Git-Quelle; dieser
Mount-Ordner ist nur die Projekt-/Arbeitskopie.

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

SHAP erklärt das Modellverhalten, nicht kausal den Brauprozess. Das Dashboard trennt deshalb harte additive Group-SHAP-Werte von Soft-SLR-Prozesspfaden: Soft Assignment ist eine diagnostische Wissensschicht, keine neue SHAP-Summe. Qwen3:30B-A3B dient als Dialogschicht mit Tool Calling und ersetzt nicht das XGBoost-Prognosemodell.

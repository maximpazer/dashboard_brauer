# Brau-Coach AI — Frontend

Next.js/TypeScript-Frontend für das Brauer-Dashboard ("Brau-Coach AI"), im
Stil des Prototyps `code/dashboard_brauer/indee.md`: ein 5-Schritte-Wizard
(Sidebar + Tab-State, keine Mehrseiten-Navigation) — **Mein Bier → Prognose →
Prozess-Stufen → Nächste Schritte → Verlauf**. Spricht ausschliesslich mit dem
FastAPI-Backend in `../backend/` (Standard: `http://localhost:8000`,
konfigurierbar über `NEXT_PUBLIC_API_BASE` in `.env.local`).

## Wichtiger Hinweis zur Entwicklungsumgebung

`npm install` / `npm run dev` sollten **nicht direkt auf diesem
netzwerk-gemounteten Verzeichnis** laufen — auf diesem Mount sind manche
Rename-/Tempfile-Operationen (genutzt von `npm`, `rsync`, teils auch von
einfachen Datei-Writes für bestimmte Dateinamen wie `.gitignore`)
unzuverlässig (`EPERM`/`EIO`). Betraf auch schon das Python-`.venv` für
`code/` (siehe `documents/planning/status_und_zielbild_2026-06-24.md`).

**Empfohlener Workflow:** Dieses Verzeichnis (ohne `node_modules`/`.next`) auf
ein lokales Laufwerk kopieren, dort `npm install` + `npm run dev` ausführen,
und Quelldateien nach Änderungen zurück hierher kopieren (per `tar`-Pipe statt
`rsync`/`cp -R` — zuverlässiger auf diesem Mount; bei sehr vielen Dateien in
einem Zug ggf. nach Unterverzeichnis aufteilen, falls die Pipe abbricht).

## Struktur

- `app/layout.tsx` — globaler Header (amber, "Brau-Coach AI") + Chat-Panel
- `app/page.tsx` — Wizard-Shell (Sidebar + aktiver Tab, State in `lib/brewer-state.tsx`)
- `app/methodik/page.tsx` — separate Route, Deep-Link aus dem Prozess-Stufen-Tab
  ("Methodik-Details (HSIC) ansehen") — SLR- vs. HSIC-Faithfulness, Disclaimer
- `components/Sidebar.tsx` — 5 Wizard-Schritte
- `components/tabs/` — `MeinBierTab`, `PrognoseTab`, `ProzessStufenTab`,
  `NaechsteSchritteTab`, `VerlaufTab`
- `components/ChatPanel.tsx` — globaler Chat, Kontext aus `lib/brewer-state.tsx`
- `lib/brewer-state.tsx` — React-Context: aktuelles Sensorikprofil, Notiz,
  letztes Vorhersage-Ergebnis, aktiver Tab — geteilt über alle Tabs

## Workflow

1. **Mein Bier:** alle 20 Sensorik-Merkmale (nach Brauprozess-Stufe gruppiert,
   via `/api/features`-Feld `phase`) + Makro-Parameter (Stammwürze, Alkohol) +
   Notiz. "Zur Prognose" löst `POST /api/predict` aus.
2. **Prognose:** Score-Gauge (1–5-Skala, linear aus der echten TOTAL-Skala
   umgerechnet, siehe Backend `total_to_scale_1_5`) + Benchmark-Balken gegen
   die 195 historischen Biere.
3. **Prozess-Stufen:** horizontale Diverging-Bars je SLR-Brauphase (Group-SHAP
   des eigenen Profils).
4. **Nächste Schritte:** Hebel-Karten aus den Backend-Empfehlungen
   (`recommend_for_phase`), priorisiert nach Einfluss.
5. **Verlauf:** gespeicherte Sude (`POST/GET /api/batches`, JSON-Datei im
   Backend) + einfacher Vergleich zweier Sude.

## Build/Dev

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Produktions-Build (verifiziert)
```

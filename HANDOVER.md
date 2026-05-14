# Doppelkopf — Handover-Briefing

**Letzter Stand:** 2026-05-13 abends
**Adressat:** nächste Claude-Session (Frontend oder Backend)

---

## ⚡ Schnellstart

```bash
# Terminal 1
cd /Users/manfredwolff/ki-projects/doppelkopf/backend && npm run dev
# → ws://localhost:3001

# Terminal 2
cd /Users/manfredwolff/ki-projects/doppelkopf/frontend && npm run dev
# → http://localhost:5174
```

Details in `start.md`.

---

## 🧱 Tech & Struktur

```
/doppelkopf
├── backend/      Node.js + TypeScript, WebSocket auf 3001
│                 GameEngine, RulesValidator, ScoringEngine
├── frontend/     React + Vite + TypeScript, Port 5174
│                 GameBoard, Card, useGameWebSocket, lib/cardLogic
├── mock-server/  Alter Mock (nicht mehr aktiv genutzt)
├── doppelkopf-rules.json  TSR + Essener System (single source of truth)
├── Dokumente/    Spielregeln, UI-Beispiele
└── karten/SVG-cards  externes Repo (LGPL-Karten, kopiert nach frontend/public/cards)
```

API-Contract: `frontend/src/types/game.ts` ist verbindlich.
WebSocket-Vertrag identisch für Backend und Frontend.

---

## ✅ Was funktioniert (MVP-Stand)

**Spielablauf komplett:**
- Vorbehalts-Phase (Position 1→4 reihum, „Gesund" / „Vorbehalt")
- Hochzeit als einziger MVP-Vorbehalt
- Ready-to-play Phase mit Vollbild-„Spiel starten"-Button
- Stiche spielen (Bedienungspflicht clientseitig validiert)
- Trick-Hold 2 s, danach Stich-Winner spielt aus (Backend korrekt)
- Re/Kontra/90/60/30/Schwarz Ansagen
- Spielzettel (kumulativer Score, 20 Spiele, Pflichtsolo-Tracking)
- „Nächstes Spiel" Flow (Backend rotiert Geber, mischt neu)
- Round-finished nach 20 Spielen
- Spoiler-Schutz: party + Score erst nach Kreuz-Dame-Plays oder Ansagen

**UX:**
- 4er-Tisch mit räumlicher Karten-Anordnung (oben/rechts/unten/links)
- West/Ost visuell tiefer als Mitte (deutliche Zuordnung)
- Sortierte Hand (Trümpfe links, Fehlfarben rechts)
- Single-click = Karte spielen (mobile-optimiert)
- Ungültige Karten subtle disabled (kein „valid"-Highlight)
- „Letzter Stich"-Peek-Button im Hand-Header
- Responsive: < 1280 px = kompakt (Phone+Tablet), ≥ 1280 px = großzügig (Desktop)

---

## 🐛 Bekannte offene Punkte / Roadmap

**Niedrige Hürde:**
- Solo-Varianten (Damen, Buben, Fleischlos, Farbsolo) — Frontend-Buttons sind da, aber disabled; Backend implementiert sie noch nicht
- Hochzeit-Klärungsstich-Logik (im Backend; aktuell Hochzeit = simplifiziertes Single)
- Audio-Effekte (Card-Play, Stich-Win, Score-Update)
- Card-Flight-Animationen (Hand → Tisch)
- Dark Mode Toggle (aktuell hardcoded dark)

**Mittlere Hürde:**
- Simuliertes Denken (Wait-vor-Kartenwurf als Signal an Partner — Essener System)
- KI-Erklär-Modus („Lehrmodus", siehe Plan-Datei)
- DB-Persistenz für Spielzettel über Sessions hinweg

**Größere Brocken:**
- Multi-Tisch / Multiplayer mit echten Spielern
- Login/Auth
- Pflichtsolo-Vorführungs-Logik (zwangsweise Solo am Ende der Runde)
- Railway/Docker Deployment

---

## 🚦 Wichtige Konventionen (aus den Sessions gelernt)

1. **API-First.** `frontend/src/types/game.ts` ist der Single Source of Truth.
   Backend MUSS denselben Vertrag implementieren. Bei Änderungen: vorher mit
   beiden Sessions abstimmen, nicht unilateral umbenennen.

2. **Server validiert alles** — Bedienungspflicht, Ansage-Bedingungen,
   Stich-Gewinner. Frontend rechnet `validCardIds` nur clientseitig vor,
   damit Karten visuell disabled werden können. Server-Validierung ist die
   Wahrheit.

3. **playerId ist `'player-human-001'`** (sowohl in App.tsx als auch
   `HUMAN_PLAYER_ID` im Backend). AIs heißen `'ai-1'`, `'ai-2'`, `'ai-3'`.

4. **seatMap** wird beim ersten Render fixiert (Mensch immer seat 4 = unten).
   Backend-Position-Rotation zwischen Spielen ändert die Sitze nicht.
   Mapping ist clockwise-relativ zum Menschen (linker Nachbar → seat 3 / left).

5. **Idempotenter `game:join`** — Backend macht keinen Reset, wenn die
   gleiche gameId reconnected (React-StrictMode-safe). NICHT zurückbauen.

6. **Spoiler-Schutz im Frontend** — `revealedParties` in `lib/cardLogic.ts`
   leitet RE/KONTRA aus Kreuz-Dame-Plays + Ansagen ab. Backend liefert
   `player.party = null` für andere Spieler bis zur Klärung.

7. **Re-/Push-Workflow:** committen ist OK, **pushen nur auf explizite
   Anweisung**. `production` Branch wird **niemals** direkt gepusht — nur
   über PR von `main` aus.

---

## 📚 Referenz-Dokumente

| Datei | Inhalt |
|---|---|
| `ARCHITECTURE.md` | Grundarchitektur (initial geplant) |
| `start.md` | Wie Frontend + Backend lokal starten |
| `doppelkopf-rules.json` | Regelwerk (TSR + Essener System) |
| `BACKEND_BRIEFING.md`, `_v2.md` | Frühere Backend-Aufträge (abgearbeitet) |
| `BACKEND_BUG_REPORT*.md` | Bug-Analysen + Backend-Antworten |
| `FRONTEND_BRIEFING.md` | Backend → Frontend Übergabe nach Engine-Fertigstellung |
| `~/.claude/plans/alles-liegt-in-users-manfredwolff-ki-pro-hashed-waffle.md` | Plan-Datei mit Iterations-Plänen, Future-Backlog (Erklär-Modus) |

---

## 🎯 Vorgeschlagene erste Schritte für die nächste Session

Je nach Lust:

**Frontend-Polish:**
- Audio-Hooks einbauen (`useSound`-Hook, Soundpath aus public/, einfache `Audio()` API)
- Card-Flight-Animation (CSS transition + key-Framing)
- Dark/Light Toggle

**Echtes Feature:**
- Solo-Varianten in Backend + Frontend aktivieren (Backend muss
  `gameType`-Logik um sortHand, Trump-Reihenfolge, Score-Multiplikator erweitern)
- Simuliertes Denken (Wait-Button vor Kartenwurf)

**Production:**
- Dockerfile + docker-compose schreiben (siehe ARCHITECTURE.md Abschnitt)
- Railway deploy

---

## 🪵 Erster Prompt für die neue Session

> Lies bitte `HANDOVER.md` im Doppelkopf-Projekt — das ist der aktuelle
> Stand. Dann lass uns über den nächsten Schritt entscheiden.

Das reicht. Mehr Kontext braucht's nicht.

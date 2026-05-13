# Doppelkopf Backend - Session Briefing

## 📋 Mission

Implementiere die **echte Doppelkopf Game-Engine** als Node.js Backend, die den aktuellen Mock-Server ersetzen wird.

## 📁 Projekt-Ordner

Arbeite in: `/Users/manfredwolff/ki-projects/doppelkopf/`

**Wichtige Referenz-Dokumente:**
- `ARCHITECTURE.md` — Vollständige Architektur-Spezifikation
- `doppelkopf-rules.json` — Maschinenlesbares Regelwerk (TSR + Essener System)
- `Dokumente/Turnierspielregeln-Stand-2026-02-21.txt` — Offizielle Spielregeln
- `mock-server/server.js` — Aktueller Mock-Server (Referenz für API)
- `frontend/src/types/game.ts` — TypeScript Types (API-Contract)
- `frontend/src/hooks/useGameWebSocket.ts` — Wie der Client kommuniziert

## 🎯 Aufgabe für diese Session

Erstelle das Backend unter `/Users/manfredwolff/ki-projects/doppelkopf/backend/` mit:

### 1. Setup
- Node.js + TypeScript + Express + ws (WebSocket)
- Struktur nach ARCHITECTURE.md:
  ```
  /backend
  ├── src/
  │   ├── index.ts
  │   ├── engine/
  │   │   ├── GameEngine.ts
  │   │   ├── GameState.ts
  │   │   ├── RulesValidator.ts
  │   │   ├── ScoringEngine.ts
  │   │   └── Deck.ts (Kartenverwaltung, Shuffle, Deal)
  │   ├── ai/
  │   │   └── SimpleAI.ts (KI-Spieler-Logik)
  │   ├── api/
  │   │   └── websocket.ts
  │   └── shared/
  │       ├── types.ts (von frontend kopieren)
  │       └── rules.ts (doppelkopf-rules.json Parser)
  └── package.json
  ```

### 2. Kernfunktionalität

**Spiellogik (gemäß TSR-Regelwerk):**
- ✅ Authentisches Mischen (mehrfach + Cut + 3-3-3-3 Verteilung) — vorhanden im Mock!
- ✅ Korrekte Kartenrangfolge (Trumpf-Hierarchie aus `doppelkopf-rules.json`)
- ✅ Bedienungspflicht-Validierung (`RulesValidator`)
- ✅ Korrekte Stich-Gewinner (höchste Karte nach Ranking)
- ✅ Doppelkopf-Punkte (Doppelkopf-Stich, Fuchs, Karlchen)
- ✅ Partei-Zuteilung (Kreuz-Damen → RE)

**Spieltypen (MVP-Scope):**
- ✅ Normalspiel (zuerst!)
- ⏳ Solo (später)
- ⏳ Hochzeit (später)

**Ansagen:**
- ✅ Re/Kontra mit Validierung (Kartenzahl, Zeitpunkt)
- ✅ 90/60/30/Schwarz mit Bedingungen aus Rules JSON

**Wichtige Sicherheit:**
- Server validiert ALLES (Karte gültig? Spieler am Zug? Bedienungspflicht?)
- Re/Kontra Punkte erst zeigen, wenn Partei "geklärt" ist (Spoiler-Free!)
- `validCardIds` nur an den aktiven Spieler senden

### 3. KI-Spieler (Simple AI für MVP)

Implementiere eine **einfache KI** für 3 Gegner:
- Folgt Bedienungspflicht (Server zwingt sie dazu)
- Spielt aus Trumpf wenn vorne
- Bewahrt Asse für später wenn möglich
- Macht keine Ansagen (zumindest erstmal nicht)

→ KI muss nicht stark sein, nur **regelkonform**

### 4. WebSocket API

Vollständiger Contract aus `frontend/src/types/game.ts`. Server muss diese Events handhaben:

**Client → Server:**
- `game:join`
- `game:play-card`
- `game:announce`
- `game:state-request`

**Server → Client:**
- `game:joined`
- `game:state-updated`
- `game:card-played`
- `game:trick-won`
- `game:announcement`
- `game:ended`
- `game:error`

→ Schau dir den Mock-Server an (`/mock-server/server.js`) — der hat schon den richtigen Contract!

### 5. MVP-Konfiguration

- **1 Human vs. 3 KI**
- **In-Memory** (keine DB)
- Port: **3001** (gleicher wie Mock-Server)
- Frontend (`/frontend`) kann sofort gegen das echte Backend testen

## 🚦 Frontend bleibt in separater Session

Das Frontend wird parallel weiter entwickelt. Diese Backend-Session kann sich voll auf die Engine konzentrieren.

**Frontend-Test:**
- Frontend läuft auf http://localhost:5174
- Verbindet sich zu ws://localhost:3001
- Wenn echtes Backend auf Port 3001 läuft → Frontend nutzt es automatisch

## 📦 Tech Stack

- Node.js + TypeScript
- Express (für HTTP, falls benötigt)
- ws (WebSocket Library — schon vom Mock-Server bekannt)
- Vitest für Tests
- Strikte TypeScript-Konfig

## ✅ Definition of Done (für diese Session)

- [ ] Backend kompiliert ohne TypeScript-Fehler
- [ ] WebSocket-Server läuft auf Port 3001
- [ ] Frontend kann sich verbinden und ein vollständiges Spiel spielen
- [ ] Bedienungspflicht funktioniert (Karten werden grayed-out, wenn ungültig)
- [ ] Korrekte Stich-Gewinner nach TSR-Regelwerk
- [ ] Re/Kontra-Punkte werden korrekt vergeben
- [ ] KI spielt regelkonform
- [ ] Game-End mit korrektem Winner
- [ ] Unit Tests für GameEngine, RulesValidator, ScoringEngine

## 🎮 Wie testen

1. Backend starten: `cd backend && npm run dev`
2. Frontend läuft schon: http://localhost:5174
3. Mock-Server stoppen (falls läuft): backend wird Port 3001 belegen
4. Spielen!

## 📐 Architektur-Prinzipien

- **Server vertraut Client NICHT** (alle Validierung serverseitig)
- **Clean Code**: kleine Funktionen, klare Verantwortlichkeiten
- **Test-driven** für Kernlogik (RulesValidator, ScoringEngine)
- **Strict TypeScript**: kein `any`, kein `!`-Operator

---

**Viel Erfolg!** Bei Fragen zur Frontend-Integration einfach hier kommen. 🎯

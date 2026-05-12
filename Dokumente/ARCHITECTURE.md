# Doppelkopf Game Engine — Architektur

## Überblick
Vollständiger Doppelkopf-Game-Generator mit Engine, API und responsiver UI.  
**Basis:** Regelwerk (`doppelkopf-rules.json`) + Essener System Konventionen

---

## Tech Stack

| Layer | Technologie | Zweck |
|-------|-------------|-------|
| **Frontend** | React 18 + TypeScript + Vite | Responsive UI (Web, Mobile, Tablet) |
| **Backend** | Node.js + Express + TypeScript | Game Engine + WebSocket API |
| **Kommunikation** | WebSockets | Live Game-State Updates |
| **Deployment** | Railway.app | Production Hosting (~10€/Monat) |
| **Regelwerk** | doppelkopf-rules.json | Maschinenlesbare Game Rules |

---

## Projekt-Struktur (Monorepo)

```
/doppelkopf
├── package.json (root)
├── tsconfig.json (shared TypeScript config)
├── doppelkopf-rules.json (Regelwerk-Quelle)
├── ARCHITECTURE.md (diese Datei)
│
├── /backend
│   ├── package.json
│   ├── src/
│   │   ├── index.ts (Express + WebSocket Server)
│   │   ├── engine/
│   │   │   ├── GameEngine.ts (Hauptlogik)
│   │   │   ├── RulesValidator.ts (Regelprüfung)
│   │   │   └── GameState.ts (State-Verwaltung)
│   │   ├── api/
│   │   │   └── websocket.ts (WebSocket Events)
│   │   └── shared/
│   │       ├── types.ts (Game Types, API Contracts)
│   │       └── rules.ts (Rules JSON Parser)
│   └── dist/
│
├── /frontend
│   ├── package.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── components/ (UI Komponenten)
│   │   ├── hooks/ (useGame, useWebSocket, etc.)
│   │   ├── types/ (TypeScript Types)
│   │   └── styles/
│   └── dist/
│
└── /shared (optional, später)
    └── types.ts (gemeinsame Types zwischen Backend + Frontend)
```

---

## Kommunikation: WebSocket Events

### HTTP Endpunkte (Setup)
```
POST /api/games
  Request: { players: string[] }
  Response: { gameId: string, initialState: GameState }
```

### WebSocket Events (Live Game)

**Client → Server:**
```typescript
game:join
  { gameId: string, playerId: string }

game:play-card
  { gameId: string, cardId: string }

game:announcement
  { gameId: string, announcementType: "re" | "kontra" | "90" | "60" | "30" | "schwarz" }

game:state
  { gameId: string }
```

**Server → Client:**
```typescript
game:state
  { gameId, players, currentRound, gameState, currentPlayer, validMoves, ... }

game:card-played
  { playerId, card, roundNumber }

game:announcement-made
  { playerId, announcementType, timestamp }

game:trick-won
  { winnerId, trick, eyeCount, ... }

game:game-ended
  { winnerId, finalScore, statistics }

game:error
  { message, code }
```

---

## API-Kontrakte (TypeScript Types)

```typescript
// /shared/types.ts oder /backend/src/shared/types.ts

type GameState = {
  gameId: string
  gameType: "normalspiel" | "solo" | "hochzeit"
  players: Player[]
  currentRound: number
  hand: Card[] // pro Spieler sichtbar
  tricks: Trick[]
  announcements: Announcement[]
  score: { re: number, kontra: number }
  isFinished: boolean
}

type Card = {
  suit: "clubs" | "spades" | "hearts" | "diamonds"
  rank: "ace" | "ten" | "king" | "queen" | "jack" | "nine"
}

type Player = {
  id: string
  name: string
  position: 1 | 2 | 3 | 4
  party?: "re" | "kontra" | "solo"
}

type Announcement = {
  playerId: string
  type: "re" | "kontra" | "90" | "60" | "30" | "schwarz"
  round: number
}
```

---

## Deployment: Railway.app

### Setup
1. Git-Repo initialisieren (`git init`)
2. Beide Services konfigurieren:
   - **Backend:** `npm run start` (Node.js auf Port 3000)
   - **Frontend:** `npm run build` (React → Static Files)
   - Frontend wird als **Static Files** vom Backend served
3. Environment Variablen (falls nötig): `.env` in Railway Dashboard

### Build & Start Commands
```json
{
  "scripts": {
    "start": "cd backend && npm install && npm run build && npm start",
    "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\""
  }
}
```

---

## Essener System Integration

Die Engine nutzt das Regelwerk (`doppelkopf-rules.json`) für:
- ✅ Spieltyp-Validierung
- ✅ Kartenranking (Trump-Hierarchie, Farbreihenfolge)
- ✅ Ansage-Bedingungen (Mindest-Eyes, Sicherheitsanforderungen)
- ✅ Punkt-Berechnung (Basiswert, Multiplier, Boni, Strafen)
- ✅ Konventions-Signale (Herz 10, Dame, Buben, Ansagezeitpunkte)

---

## Arbeitsfluss für mehrere Sessions

### Session 1: API-Design & Spec ✅ (Diese Session)
- [x] Tech Stack definiert
- [x] WebSocket Events skizziert
- [x] Types definiert
- [x] Deployment-Plan (Railway)

### Session 2: Backend (Game Engine)
- [ ] Express + WebSocket Server aufsetzen
- [ ] GameEngine.ts implementieren (Regeln + Essener System)
- [ ] RulesValidator.ts
- [ ] WebSocket Event Handler
- [ ] Tests für kritische Logik

### Session 3: Frontend (UI)
- [ ] React-Komponenten (Board, Hand, Announcements, Score)
- [ ] WebSocket Hook (`useGame`)
- [ ] Responsive Design (Web, Mobile, Tablet)
- [ ] Player-Interaktionen

### Session 4: Integration & Deployment
- [ ] Beide Services lokal zusammen testen
- [ ] Railway.app Setup
- [ ] Production Deploy

---

## Wichtige Entscheidungen

| Frage | Entscheidung | Begründung |
|-------|-------------|-----------|
| Monorepo oder Separate Repos? | Monorepo | Einfacheres Deployment auf Railway, shared Types |
| Frontend-Backend Auth? | TBD | Für MVP wahrscheinlich nicht nötig |
| Game Persistence? | TBD | In-Memory für MVP, später DB (PostgreSQL) |
| Fehlerbehandlung | Zentral im Backend | Keine Technik-Details nach außen |

---

## Nächste Schritte

1. **Backend-Session:** GameEngine-Architektur planen + erste Komponenten
2. **Frontend-Session:** UI-Mockups + Komponenten-Plan
3. **Integration:** Beide zusammenbringen
4. **Deploy:** Railway konfigurieren + Live gehen

---

**Erstellt:** 2026-05-12  
**Version:** 0.1.0  
**Status:** Architecture Draft — Ready for Implementation

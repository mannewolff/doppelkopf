# Doppelkopf-GUI Architektur & Implementation Plan

## Context

Ziel: Entwicklung einer **responsive React-GUI** für eine Doppelkopf-Spielplattform mit Node.js-Backend.

**MVP-Szenario:**
- 1 Humaner Spieler vs. 3 KI-Gegner
- Trainings-/Übungs-Modus
- Ein Tisch (sequenzielle Spiele)
- Später: Spielzettel mit 20 Runden + Pflichtsolo-Tracking

**Basis:**
- Turnierspielregeln (Dokument: Turnierspielregeln-Stand-2026-02-21.txt)
- Maschinenlesbares Regelwerk (doppelkopf-rules.json)
- 3 UI-Beispiele von anderen Plattformen (dokoapp, dokopalast, Fuchstreff)

**Tech & Constraints:**
- Websocket-basierte Kommunikation mit Node.js-Backend
- Responsive für Web, Mobile, Tablet
- Mobile: Gestapelte Karten mit Overlap (fächerartig)
- In-Memory (MVP) — später DB für Persistenz & Analyse

---

## Phase 1: Server-Architektur (Backend)

### Responsibilities des Node.js/Express Servers

**Game Engine Layer:**
- `GameEngine.ts` — Spiellogik, Kartenverwaltung, Stich-Auflösung
- `GameState.ts` — Zustandsverwaltung mit Übergängen
- `RulesValidator.ts` — Bedienungspflicht, Kartengültigkeit, Ansage-Bedingungen
- `ScoringEngine.ts` — Komplexe Punkt-Berechnung (Basiswert, Multiplier, Sonderpunkte)

**API Layer:**
- `websocket.ts` — Event-Handler (play-card, announce, state-updates)
- `routes/` — HTTP Endpunkte (POST /api/games, GET /api/games/:id, POST /api/games/:id/join)

**Infrastructure:**
- `GameRepository.ts` — In-Memory Game Storage (MVP), später DB

### Kritische Sicherheitsprinzipien

**Der Server vertraut dem Client NICHT:**
- Kartengültigkeit (validiert auf Server gegen Bedienungspflicht)
- Spieltyp & Partei-Zugehörigkeit (serverseitig festgelegt)
- Punkt-Berechnung (100% serverseitig)
- Ansage-Zeitpunkte (validiert auf Server)

**Validierungspunkte:**
```typescript
// Jeder Play-Card Event wird geprüft:
- Spieler am Zug?
- Karte in Hand?
- Bedienungspflicht erfüllt? (Farbe/Trumpf bedienen)
- Trick nicht bereits gewonnen?
- Spiel nicht beendet?

// Jede Ansage wird geprüft:
- Zu früh? (vor Spieltyp-Klärung)
- Zu spät? (nach Spielende)
- Kartenzahl ausreichend? (Re: 11 Karten, 90: 10 Karten, etc.)
```

---

## Phase 2: Client-Architektur (React)

### MVP-Layout für 1 Human vs. 3 KI

**Spieler-Positionen (fix):**
- **Position 1 (oben):** KI-Gegner 1
- **Position 2 (rechts):** KI-Gegner 2
- **Position 3 (links):** KI-Gegner 3
- **Position 4 (unten):** HUMAN PLAYER ← nur dieser kann Karten spielen!

**Frontend-Implikationen:**
- Nur Human-Spieler kann Kartenzüge machen (Buttons aktiviert)
- KI-Gegner zeigen Kartenwahl-Animation (wird vom Server gesendet)
- Alle Spieler sehen Ansagen/Absagen in Echtzeit
- Server sendet KI-Züge als normal `game:card-played` Events

### Komponenten-Struktur

```
/frontend/src
├── components/
│   ├── GameBoard.tsx              (CSS Grid responsive Layout, 4er-Tisch)
│   ├── PlayerArea.tsx             (Name, Party-Farbe, Ansagen-Anzeige)
│   ├── HandCards.tsx              (12 Karten, Klick/Drag-Drop)
│   ├── TricksHistory.tsx          (Gespielte Karten des aktuellen Stichs)
│   ├── ScorePanel.tsx             (Re/Kontra Punkte, Live-Update)
│   ├── AnnouncementButtons.tsx    (Re/Kontra/90/60/30/Schwarz mit Enable-Logic)
│   └── ChatPanel.tsx              (optional: Game Chat/Kommentare)
│
├── hooks/
│   ├── useGameWebSocket.ts        (WebSocket connect/listen, Event-Handler)
│   ├── useGameState.ts            (lokaler Game-State + Server-Sync via Reducer)
│   ├── useResponsiveLayout.ts     (Window-Resize Listener für Breakpoints)
│   └── useCardInteraction.ts      (Kartenwahl, Drag-Drop Logic)
│
├── types/
│   └── game.ts                    (GameState, Card, Player, Announcement Types)
│
└── styles/
    ├── layout.css                 (Grid: Desktop 4er, Tablet 3er, Mobile 1 Spalte)
    ├── cards.css                  (Card-Größe: 100x160px Desktop, 80x120px Tablet, 60x90px Mobile)
    └── theme.css                  (Dark Mode, Farbnvariablen für Suits)
```

### State Management Strategy

| State-Type | Tool | Begründung |
|-----------|------|-----------|
| Selected Card | useState | Einfach, lokal, UI-Only |
| GameState (Hand, Tricks, Score) | useReducer + Context | Komplexe Übergänge, Multiple Components |
| Settings (Dark Mode, Player ID) | Context API | Globales Teilen, wenig Updates |
| WebSocket Connection | Custom Hook | Single Source of Truth mit Server |

### Responsive Layout

**Desktop (≥1280px):**
- CSS Grid 4x2: Spieler 1 (oben), 2 (rechts), 3 (unten), 4 (links)
- Hand am unteren Rand, große Karten (100x160px)
- Info-Panels rechts (Score, Ansagen, Zeit)

**Tablet (768px–1279px):**
- CSS Grid 3-Spalte oder gestapelt
- Mittlere Kartengröße (80x120px)
- Info oben, Hand unten
- ScrollableContainer für Hand falls nötig

**Mobile (375px–767px):**
- 1 Spalte, vertikal gestapelt
- Kleine Kartengröße (60x90px)
- **Karten gestapelt mit Overlap (fächerartig):**
  - Alle 12 Karten sichtbar
  - Jede Karte um ~15px nach rechts versetzt
  - Hovers/Selects heben Karte heraus
- Stack Overlays für Info (Score, Ansagen)
- Buttons groß (≥48px) für Touch

---

## Phase 3: WebSocket Communication Contract

### Client → Server Events

```typescript
'game:join'
  { gameId: string, playerId: string, playerName: string }

'game:play-card'
  { gameId: string, cardId: string }
  // Server validiert: Bedienungspflicht, gültige Karte, am Zug

'game:make-announcement'
  { gameId: string, announcementType: 're'|'kontra'|'90'|'60'|'30'|'schwarz' }
  // Server validiert: Zeitpunkt, Kartenzahl, keine Duplikate

'game:request-state'
  { gameId: string }
  // Manuelle State-Refresh anfordern (fallback bei Connection-Issues)
```

### Server → Client Events (Broadcast)

```typescript
'game:state-updated'
  {
    gameId, 
    players: [{ id, name, position, party?, announcements }],
    currentPlayer: playerId,
    validCards: [cardId1, cardId2, ...],    // nur für aktiven Spieler
    hand: [card1, card2, ...],              // nur für eigene Hand
    tricks: [{ winner, cards, points }],
    currentTrick: { cards: [card|null, ...] },
    announcements: [{ playerId, type, timestamp }],
    score: { re: number, kontra: number },
    gameType: 'normalspiel'|'solo'|'hochzeit',
    round: number,
    isFinished: boolean,
    gameEndResult?: { winner: 're'|'kontra', finalScore: number }
  }

'game:card-played'
  { playerId: string, card: Card, timestamp: number }

'game:trick-finished'
  { winnerId: string, cards: Card[], points: number }

'game:announcement-made'
  { playerId: string, announcementType: string, timestamp: number }

'game:game-ended'
  { winner: 're'|'kontra', finalScore: { re, kontra }, statistics: {...} }

'game:error'
  { code: 'INVALID_MOVE'|'NOT_YOUR_TURN'|'INVALID_CARD', message: string }
```

---

## Phase 4: Design & Visual Hierarchy

### Farbschema (Dark Mode Default)

| Element | Color | Usage |
|---------|-------|-------|
| Kartentisch | #1a4d2e (Dunkelgrün) | Background |
| Spieler-Info | #ffffff (Weiß) | Text |
| Re Party | #4CAF50 (Grün) | Party-Label |
| Kontra Party | #FF9800 (Orange) | Party-Label |
| Gültige Karten | #00ff00 (Helles Grün) | Border/Highlight |
| Aktive Ansage | #FFC107 (Gelb) | Button Background |
| Fehler/Invalid | #f44336 (Rot) | Error Message |

### Key UI Patterns

**Kartenhand:**
- Hover Effect: Karte leicht hochnehmen (translateY -20px)
- Selected: Green Border, sichtbarer Status
- Disabled/Invalid: Grayed Out (opacity 0.5)

**Announcement Buttons:**
- Normal: Grauer Button, clickable
- Disabled: Grayed Out (gesperrt bis Bedingung erfüllt)
- Active/Announced: Gelber/Grüner Background
- Toast-Notification bei erfolgreicher Ansage

**Trick-Animation:**
- Karte fliegt vom Spieler zur Tisch-Mitte (100ms)
- Am Tisch stapeln sich Karten mit leichtem Overlap
- Nach Stich: Winner-Highlight + Score-Update

---

## Implementation Reihenfolge

### Session Backend-Engine (Separate)
1. GameEngine Core (Kartenverwaltung, Spieltypen)
2. RulesValidator (Bedienungspflicht-Check)
3. ScoringEngine (Punkt-Berechnung)
4. WebSocket Handler

### Session Frontend-GUI (Diese)
1. **Week 1 (Session 1):** 
   - Core Hooks (useGameWebSocket, useGameState)
   - GameBoard responsive Layout
   - HandCards Component

2. **Week 1-2 (Session 2):**
   - PlayerArea, TricksHistory, ScorePanel
   - AnnouncementButtons mit Enable-Logic
   - Kartengültigkeits-Feedback

3. **Week 2 (Session 3):**
   - Animations (Card Moves, Score Updates)
   - Dark Mode Toggle
   - Responsiveness Testing (DevTools)

4. **Week 2 (Session 4):**
   - End-to-End mit Backend
   - Railway Deployment Test
   - Final Polish

---

## Critical Files to Create

```
/Users/manfredwolff/ki-projects/doppelkopf/
├── frontend/
│   ├── src/
│   │   ├── components/GameBoard.tsx
│   │   ├── components/HandCards.tsx
│   │   ├── components/PlayerArea.tsx
│   │   ├── components/TricksHistory.tsx
│   │   ├── components/ScorePanel.tsx
│   │   ├── components/AnnouncementButtons.tsx
│   │   ├── hooks/useGameWebSocket.ts
│   │   ├── hooks/useGameState.ts
│   │   ├── hooks/useResponsiveLayout.ts
│   │   ├── hooks/useCardInteraction.ts
│   │   ├── types/game.ts
│   │   └── styles/
│   │       ├── layout.css
│   │       ├── cards.css
│   │       └── theme.css
│   └── package.json (React + Vite Config)
│
└── ARCHITECTURE.md (diese Datei)
```

---

## Verification & Testing

**Before Session Completion:**
- ✅ Responsive Layout: Test auf Desktop (1920px), Tablet (768px), Mobile (375px)
- ✅ WebSocket Connection: Backend-Mock mit allen Events
- ✅ Kartenwahl: Funktioniert, Feedback sichtbar
- ✅ Ansage-Buttons: Enable/Disable korrekt
- ✅ Dark Mode: Umschaltung funktioniert

**End-to-End (später mit Backend):**
- ✅ Vollständiges Spiel vom Start bis Ende
- ✅ Score-Update live nach Stich
- ✅ Error-Handling bei ungültigem Move
- ✅ Mobile-Responsiveness unter realen Bedingungen

---

## Entscheidungen vom Nutzer (Geklärt)

✅ **Authentication:** Einfach (MVP) — Name + Session, Anmeldung ist Phase 2  
✅ **Game Persistence:** In-Memory (MVP), später DB + Spielzettel-Tracking (20 Runden)  
✅ **Multiplayer:** Ein Tisch (sequenzielle Spiele)  
✅ **Player Setup:** 1 Human vs. 3 KI-Gegner  
✅ **Mobile Cards:** Gestapelt mit Overlap (fächerartig)  

## Offene Fragen für weitere Sessions

- **Spielzettel-UI:** Wie soll die Statistik der 20 Runden + Pflichtsolo angezeigt werden?
- **Animations:** Level der Smoothness für Kartenbewegungen?
- **Sound/Feedback:** Sound Effects bei Kartenzügen, Ansagen, Stich-Ende?
- **Dark Mode:** Immer aktiviert oder Toggle-Option?

---

**Status:** Architecture Definition fertig — Ready for Frontend Implementation  
**Date:** 2026-05-13  
**Version:** 1.0.0
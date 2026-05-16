# CLAUDE.md — Doppelkopf Projektspezifische Standards

**Willkommen zum Doppelkopf Projekt!** 

Dieses Projekt baut ein WebSocket-basiertes Echtzeit-Kartenspiel. Diese Datei dokumentiert **Doppelkopf-spezifische** Standards und Anforderungen. Allgemeine Engineering-Regeln findest du in den Spezialdateien.

---

## 🎯 Schnelleinstieg

- **Neu im Projekt?** Lies diese Datei + [CLAUDE-workflow.md](CLAUDE-workflow.md)
- **React Frontend arbeiten?** → [CLAUDE-react.md](CLAUDE-react.md)
- **Node.js Backend arbeiten?** → [CLAUDE-nodejs.md](CLAUDE-nodejs.md)
- **Security fragen?** → [CLAUDE-security.md](CLAUDE-security.md) (zentral!)
- **Deployment/Git Workflow?** → [CLAUDE-workflow.md](CLAUDE-workflow.md)
- **KI-Assistent?** → [CLAUDE-code-guide.md](CLAUDE-code-guide.md)

---

## 📚 Verfügbare Guides

| Guide | Fokus | Wiederverwendbar |
|-------|-------|-----------------|
| **CLAUDE.md** | Doppelkopf-spezifisch | ❌ Projekt |
| [CLAUDE-react.md](CLAUDE-react.md) | React/Vite/TypeScript | ✅ Allgemein |
| [CLAUDE-nodejs.md](CLAUDE-nodejs.md) | Node.js Backend | ✅ Allgemein |
| [CLAUDE-security.md](CLAUDE-security.md) | Security (OWASP 2025) | ✅ Allgemein |
| [CLAUDE-workflow.md](CLAUDE-workflow.md) | Git, Deployment, Prozess | ✅ Allgemein |
| [CLAUDE-code-guide.md](CLAUDE-code-guide.md) | KI-Assistenten-Regeln | ✅ Allgemein |

---

## 🎮 Doppelkopf Projekt Übersicht

**Stack:**
- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Node.js + TypeScript + WebSocket (ws)
- **Game State:** In-Memory (WebSocket-Server)
- **Deployment:** Railway (Docker)

**Ziel:** Echtzeit-Kartenspiel mit mehreren Spielern, keine externe Datenbank nötig, stateless Design für Skalierung.

---

## 📝 Content Management (Doppelkopf-spezifisch)

**ALLE Spielregeln, Texte und Labels MÜSSEN in JSON-Dateien liegen, nicht im Code.**

**Struktur:** `src/content/*.json`

```
src/content/
├── pages.json          # Seiten-Texte
├── game-rules.json     # Spielregeln (neu!)
├── cards.json          # Kartendefinitionen (neu!)
├── game-states.json    # Game State Labels
└── ...
```

**Beispiel (FALSCH):**
```tsx
<p>Ein Herz ist die stärkste Farbe</p> // ❌ Hardcoded
```

**Beispiel (RICHTIG):**
```tsx
import gameRules from "@/content/game-rules.json"
<p>{gameRules.cardRanking.hearts.description}</p> // ✅
```

**Warum?** Spielregeln können später geändert werden, ohne Code zu berühren. Wichtig für Game Balance!

---

## 🎯 Doppelkopf Spezifische Anforderungen

### Game Architecture
- ✅ **WebSocket-Server** ist Single Source of Truth für Game State
- ✅ **Frontend ist stateless** — alles von Server abholen
- ✅ **No External DB** für MVP (später möglich)
- ✅ **Graceful Disconnect** — Spiele müssen Reconnects handhaben

### Game State Management
- ✅ **Game State auf Server** (Node.js Backend)
- ✅ **Frontend synct nur** via WebSocket Events
- ✅ **Race Conditions** müssen vermieden werden (Server-Authoritative)
- ✅ **Replay-Safe** — Spielzüge müssen idempotent sein (Reconnect-Fall)

### Frontend Components
- ✅ **Hand Component** — Responsive, Touch-freundlich (Mobile!)
- ✅ **Game Board** — Zeigt 4 Spielerpositionen
- ✅ **Card Rendering** — SVG Karten aus `/karten` Verzeichnis
- ✅ **Turn Indicator** — Wer ist dran?

### Testing
- ✅ **Game Logic Tests** müssen existieren
- ✅ **WebSocket Integration Tests** notwendig
- ✅ **Manuell testen:** Mehrere Spieler, Reconnect, Invalid Moves

---

## 📂 Projekt-Dateistruktur

```
/
├── backend/                  # Node.js WebSocket Server
│   ├── src/
│   │   ├── index.ts         # Server Entry
│   │   ├── game/            # Game Logic
│   │   └── websocket/       # WebSocket Handler
│   └── dist/                # Build Output
├── frontend/                 # React App
│   ├── src/
│   │   ├── components/      # React Components
│   │   ├── hooks/           # Custom Hooks
│   │   ├── content/         # JSON Daten (bindend!)
│   │   └── main.tsx
│   └── dist/                # Build Output
├── karten/                   # SVG Card Assets
└── mock-server/             # Fallback (lokal)
```

---

## 🚀 Railway Deployment

**Prod:** https://doppelkopf.railway.app (oder ähnlich)

**Environment Variablen:**
```bash
# Backend
NODE_ENV=production
PORT=3001                    # Railway injiziert automatisch

# Frontend
VITE_WS_URL=wss://doppelkopf.railway.app  # Nach Backend-Deploy setzen!
```

**Services:**
- `backend` — Node.js WebSocket Server (Port 3001)
- `frontend` — Nginx Static + Proxy (Port 3000)

Siehe [CLAUDE-workflow.md](CLAUDE-workflow.md) für Details.

---

## ✅ Vor Deployment

- [ ] Alle Spielregeln in `src/content/game-rules.json`
- [ ] WebSocket Test: 4 Spieler verbinden & spielen
- [ ] Reconnect Test: Spieler disconnect + reconnect
- [ ] Build erfolgreich: `npm run build` in both
- [ ] No Secrets in `.env` oder Code
- [ ] `npm audit` clean (kein high/critical)

---

## 🔗 Weiterführende Guides

- **React Details:** [CLAUDE-react.md](CLAUDE-react.md)
- **Backend Details:** [CLAUDE-nodejs.md](CLAUDE-nodejs.md)
- **Security Checkliste:** [CLAUDE-security.md](CLAUDE-security.md)
- **Git & Workflow:** [CLAUDE-workflow.md](CLAUDE-workflow.md)

---

**Tl;dr:** Game Logic in Code. Game Texts in JSON. Server ist Boss. Teste mit mehreren Spielern. Deploy zu Railway.

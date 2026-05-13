# doppelkopf
Ein Doppelkopfspiel mit Essener Konventionen

# MVP
- Nur ein Mensch und drei Computerspieler
- Computer halten Regeln ein zum Spielen (bedienen)
- Verschiedene Phasen implementiert: Vorbehaltphase etc.
- 20 Spiele ohne Hochzeit und Solo


# Doppelkopf — Lokal starten

So startest du Backend und Frontend in zwei Terminal-Fenstern (Shells) und spielst im Browser.

---

## Voraussetzungen (einmalig)

- **Node.js ≥ 20** muss installiert sein (`node --version` prüfen)
- Im Projekt-Ordner: `/Users/manfredwolff/ki-projects/doppelkopf/`
- Dependencies sind installiert:
  ```bash
  cd /Users/manfredwolff/ki-projects/doppelkopf/backend && npm install
  cd /Users/manfredwolff/ki-projects/doppelkopf/frontend && npm install
  ```
  (musst du nur machen, wenn du frisch gecloned hast oder wenn Pakete geändert wurden)

---

## Shell 1: Backend starten

```bash
cd /Users/manfredwolff/ki-projects/doppelkopf/backend
npm run dev
```

**Was du sehen sollst:**

```
🎮 Doppelkopf Backend ready on ws://localhost:3001
```

Der Server lauscht auf **Port 3001**. Im laufenden Spiel siehst du Logs wie `[ws] client connected`.

**Stoppen:** `Ctrl+C` in dieser Shell.

---

## Shell 2: Frontend starten

```bash
cd /Users/manfredwolff/ki-projects/doppelkopf/frontend
npm run dev
```

**Was du sehen sollst:**

```
VITE v8.x.x  ready in ... ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
```

Der Vite-Dev-Server lauscht auf **Port 5174**.

**Stoppen:** `Ctrl+C` in dieser Shell.

---

## Im Browser

1. Öffne **http://localhost:5174/**
2. Querformat-Modus (Landscape) verwenden — am besten Browser-Fenster breiter als hoch
3. Hard-Reload mit `Cmd+Shift+R` (Mac) bzw. `Ctrl+Shift+R` (Win/Linux) wenn nötig

Das Frontend verbindet sich automatisch zum Backend auf Port 3001.

---

## Reihenfolge

Theoretisch egal, aber empfohlen:

1. **Erst Backend** starten (Shell 1) — wartet still auf Connections
2. **Dann Frontend** (Shell 2)
3. **Dann Browser** öffnen

Wenn das Backend nicht läuft, sieht das Frontend "Connecting to game..." und versucht alle paar Sekunden zu reconnecten.

---

## Häufige Probleme

### „Port 3001 already in use"

Wahrscheinlich läuft schon ein alter Backend- oder Mock-Server-Prozess. Killen:

```bash
lsof -ti tcp:3001 | xargs kill -9
```

### „Port 5174 already in use"

Gleiches Problem mit Vite. Killen:

```bash
lsof -ti tcp:5174 | xargs kill -9
```

(Vite weicht von selbst auf 5175, 5176 etc. aus — dann zeigt es die neue URL im Terminal an, die du im Browser öffnen musst.)

### Browser zeigt leere Seite

- DevTools öffnen (`F12`), `Console`-Tab anschauen — Fehlermeldungen geben Hinweise
- Frontend-Terminal nach roten Vite-Fehlern absuchen
- Hard-Reload (`Cmd+Shift+R`)
- Beide Shells stoppen und neu starten

### „WebSocket connecting error" / Frontend kommt nicht zum Spiel

- Backend-Shell prüfen: läuft `npm run dev` da noch?
- Backend neu starten

---

## Beide Server gleichzeitig anhalten

In beiden Shells `Ctrl+C` drücken. Optional zur Sicherheit nochmal:

```bash
lsof -ti tcp:3001,5174 | xargs kill -9 2>/dev/null
```

---

## Mock-Server (Alternative zum echten Backend)

Es gibt auch noch einen alten Mock-Server unter `/mock-server/`. **Nur für Notfälle / Frontend-Testing ohne Backend.** Achtung: der Mock-Server hat keine echte Regelvalidierung und sollte normalerweise nicht laufen, weil er sich denselben Port 3001 schnappen würde wie das echte Backend.

```bash
cd /Users/manfredwolff/ki-projects/doppelkopf/mock-server
npm start
```

(Vorher das echte Backend stoppen, sonst Port-Konflikt.)

---

## Tipp: Beide Shells nebeneinander

In iTerm2 / macOS Terminal kannst du mit `Cmd+D` ein Fenster vertikal splitten — eine Seite Backend, andere Seite Frontend, beide gleichzeitig sichtbar.

Viel Spaß beim Spielen! 🎴

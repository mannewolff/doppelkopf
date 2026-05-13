# Backend Bug Report #2

**Vom:** Frontend-Session
**Stand:** 2026-05-13
**Status:** Beobachtet, vermutete Ursache, noch nicht reproduziert in Backend-Tests

---

## 🐛 Bug: Vorbehaltsphase „loopt" beim Spielstart

### Symptom

Beim Spielstart durchlaufen die KIs (Position 1 → 3) die Vorbehalts­frage,
sagen reihum „gesund". Sobald der Mensch (Position 4) dran wäre, **wird
der Vorbehalts-Status zurückgesetzt**: Alle KIs sagen erneut „gesund",
und erst beim **zweiten** Durchlauf darf der Mensch klicken.

Effekt für den Nutzer: Er sieht den Status „⏳ Warten…" deutlich länger
als nötig (≈ 2× so lange), und im PlayerInfo-Badge tauchen die ✓-Häkchen
zweimal hintereinander auf.

### Vermutete Ursache

**React StrictMode + Backend erzeugt bei jedem `game:join` ein neues Spiel.**

Reproduktion-Hypothese:
1. React StrictMode in Dev-Mode mountet den `useEffect`-Hook doppelt
2. Erster Mount: WebSocket-Connection → `game:join` → Backend erstellt Spiel A
   → KIs starten via setTimeout zu deklarieren
3. Cleanup: WebSocket schließt, aber der Backend-State und die laufenden
   setTimeouts gehören weiter zu Spiel A
4. Zweiter Mount: WebSocket re-connect → `game:join` → Backend erstellt
   **Spiel B** (frischer State, KIs starten erneut zu deklarieren)
5. Der Mensch (Frontend) sieht den State von Spiel B → wartet auf die
   KIs in Spiel B

Wenn diese Hypothese stimmt, wäre das Backend-Verhalten in Production
ebenfalls problematisch: Bei jedem Reconnect (Verbindungsabbruch +
Reconnect) verliert man das laufende Spiel.

### Empfohlene Backend-Anpassung

`game:join` soll **idempotent** sein:

```typescript
case 'game:join': {
  const { gameId, playerName } = payload
  let game = games.get(gameId)
  if (game) {
    // Existing game (re-connect / StrictMode double-mount):
    // → re-attach client, do NOT reset state
    ws._gameId = gameId
    send(ws, { type: 'game:joined', payload: { playerId: HUMAN_PLAYER_ID, gameState: stripPrivate(game) } })
    return
  }
  // Truly new game
  game = createGameState(gameId, playerName)
  games.set(gameId, game)
  ws._gameId = gameId
  send(ws, { type: 'game:joined', ... })
  // Start AI vorbehalt phase only on the first creation
  scheduleAiVorbehaltKickoff(game, ws)
}
```

Wichtig dabei:
- Bei Re-Join: AI-Schedules NICHT erneut starten
- Bei Re-Join: bestehende KI-Timeouts dürfen weiterlaufen

### Verifizierungs-Repro

1. Frontend in Dev-Mode starten (mit StrictMode)
2. Backend-Logs beobachten:
   ```
   [ws] client connected      ← Mount 1
   [ws] client disconnected   ← StrictMode-Cleanup
   [ws] client connected      ← Mount 2
   ```
3. Schauen, ob in Mount 2 ein NEUES Spiel angelegt wird (Karten frisch
   verteilt?) — wenn ja, ist die Hypothese bestätigt.

### Workaround im Frontend (optional, nicht empfohlen)

Wir könnten im Frontend StrictMode deaktivieren oder die useEffect-Logik
mit einem useRef-Flag StrictMode-immun machen. Beides wäre aber nur ein
Workaround — das eigentliche Problem (nicht-idempotenter `game:join`)
würde in Production auch ohne StrictMode bei jedem Reconnect zuschlagen.

### Priorität

**Mittel** — Spielbar, aber irritierend für den Spieler, weil die
Wartephase 2× durchläuft. Reconnect-Verhalten ist mittel bis hoch
relevant für Production.

---

## 💡 Andere Möglichkeit

Falls obige Hypothese nicht stimmt: Vielleicht startet das Backend die
KI-Vorbehalt-Schleife mehrmals (z.B. weil der Trigger an zwei Stellen
sitzt). Ein gezielter Log-Eintrag direkt in der KI-Vorbehalt-Funktion
würde das schnell aufdecken:

```typescript
console.log(`[ai-vorbehalt] kicking off for game ${game.gameId} (version ${game._version ?? 'n/a'})`)
```

Wenn diese Zeile beim Spielstart **zweimal** loggt, ist es das.

---

## Was im Frontend bereits gemacht ist

- Debug-Logs für alle WebSocket-Events (`[state-updated]`, `[card-played]`, `[trick-won]`)
- Vorbehalts-Buttons werden nach eigenem Klick ausgeblendet
- Tisch zeigt jetzt räumlich (oben/rechts/unten/links) — wartet auf
  euer Re-Test, ob auch der Layout-Crash gefixt ist

---

🎯 Bei Fragen: einfach hier melden.

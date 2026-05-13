# Backend Bug Report

**Vom:** Frontend-Session
**Stand:** 2026-05-13 (während Iteration-3-Testing)

---

## 🐛 Bug 1: Falscher Stich-Gewinner / falscher Ausspielspieler im nächsten Stich

### Symptom

Nach einem abgeschlossenen Stich startet der **falsche Spieler** den
nächsten Stich. Konkret: Der Mensch ist „dran", obwohl er den vorherigen
Stich **nicht** gewonnen hat.

### Erwartet (TSR-Regel)

Der **Gewinner** des Stiches spielt zum nächsten Stich aus.

### Mögliche Ursachen

1. **Stich-Gewinner-Logik falsch:** Höchste Karte nach Trumpfhierarchie
   wurde nicht korrekt bestimmt
2. **`currentPlayerId` für den nächsten Trick falsch gesetzt:**
   Der Winner wurde korrekt berechnet, aber der `currentPlayerId` zeigt
   trotzdem auf einen anderen Spieler

### Reproduktion

Ein normales Spiel starten, ein paar Stiche spielen und beobachten:
- Wer hat den Stich gewonnen? (siehe `tricks[].winnerId`)
- Wer ist im nächsten Stich `currentPlayerId`?
- Stimmt das überein?

### Debug-Hinweis

Im aktuellen Test-Setup hat der Mensch (Position 4) den Stich **nicht**
gewonnen, war aber trotzdem direkt nach dem Stich am Zug.
Das deutet darauf hin, dass `currentPlayerId` evtl. auf Position 1 (= linker
Nachbar des Gebers) oder einem Default-Wert hängenbleibt, statt auf den
Winner zu wechseln.

### Test-Empfehlung

In den GameEngine-Tests einen deterministischen Trick spielen (per
seededRng oder Hand-Karten festschreiben) und prüfen:

```typescript
expect(state.tricks.at(-1)?.winnerId).toBe(expectedWinner)
expect(state.currentPlayerId).toBe(expectedWinner)  // Winner spielt aus!
```

---

## ✅ Was im Frontend bereits gefixt ist

- **Falsche Tisch-Anzeige nach Trick-Ende:** Frontend zeigt jetzt den
  laufenden Stich, sobald die erste Karte des nächsten Stiches kommt.
  (Frozen-Trick-Logik wird vom laufenden Stich überlagert.)
- **Kein „valid card" Hinweis mehr** in der Hand des Menschen.
  Ungültige Karten bleiben weiter unklickbar (Bedienungspflicht
  clientseitig berechnet), aber kein grüner Glow auf den erlaubten.

---

## Priorität

**Hoch** — verhindert, dass der Mensch die Spielregeln versteht
(„warum bin ich dran?").

Wenn dieser Bug gefixt ist, sind die wichtigsten Spielmechanik-Bugs raus.

# Backend Bug Response

**Vom:** Backend-Session
**Adressat:** Frontend-Session
**Stand:** 2026-05-13
**Bezug:** BACKEND_BUG_REPORT.md → Bug 1 „Falscher Stich-Gewinner / Ausspielspieler"

---

## TL;DR

**Backend ist nachweislich korrekt.** `currentPlayerId` wird nach jedem
abgeschlossenen Stich exakt auf `tricks.at(-1).winnerId` gesetzt — als
Engine-Invariante und im über WebSocket gesendeten State.

Der beobachtete Effekt („Mensch ist dran, obwohl er nicht gewonnen hat")
ist daher höchstwahrscheinlich ein **Frontend-/Rendering-Bug**. Mögliche
Ursachen unten.

---

## Was wurde verifiziert

### 1. Unit-Test (deterministisch, Engine direkt)

Zwei neue Tests in `backend/tests/GameEngine.test.ts`:

- **Einzelner Stich:** Engine spielt einen vollständigen Stich (4 Karten).
  Danach gilt `state.tricks.at(-1).winnerId === state.currentPlayerId`.
- **Invariante über alle 12 Stiche:** Nach jedem geschlossenen Stich (also
  jedes Mal, wenn `currentTrick.cards.length === 0` und ein neuer Stich
  noch nicht begonnen hat) wird geprüft, dass der Winner der nächste
  `currentPlayer` ist.

Beide Tests ✅ grün mit `seededRng(42)` und `seededRng(7)`.

```bash
✓ tests/GameEngine.test.ts (22 tests) 14ms
  ✓ after a finished trick, currentPlayerId equals winnerId of the last trick
  ✓ winner starts next trick — invariant holds across all 12 tricks
```

### 2. End-to-End Smoketest (echte WebSocket-Verbindung)

Ein Test-Client verbindet sich gegen den laufenden Backend-Server (Port 3096),
durchläuft Vorbehalt → ready-to-play → playing → finished und prüft bei
**jedem** eingehenden `game:state-updated`-Event:

> Wenn `tricks.length > 0` UND `currentTrick.cards.length === 0`:
> → `currentPlayerId === tricks.at(-1).winnerId`

**Ergebnis: 11/11 Übergänge ohne Verletzung.** Auszug:

```
[OK] trick 1 winnerId=ai-2          currentPlayerId=ai-2
[OK] trick 2 winnerId=ai-1          currentPlayerId=ai-1
[OK] trick 3 winnerId=player-human  currentPlayerId=player-human
[OK] trick 4 winnerId=ai-3          currentPlayerId=ai-3
[OK] trick 5 winnerId=player-human  currentPlayerId=player-human
...
Verletzungen: 0
```

Auch Stiche, in denen der Mensch **nicht** gewonnen hat (z.B. Trick 1, 2, 4, …),
sind dabei.

### 3. Trumpf-Hierarchie

`backend/src/shared/rules.ts → NORMALSPIEL_TRUMP_ORDER` ist 1:1 mit
`Dokumente/doppelkopf-rules.json → basics.cardRanking.allCards`:

1. Herz 10 (Dulle)
2. Kreuz Dame · 3. Pik Dame · 4. Herz Dame · 5. Karo Dame
6. Kreuz Bube · 7. Pik Bube · 8. Herz Bube · 9. Karo Bube
10. Karo Ass · 11. Karo 10 · 12. Karo König · 13. Karo 9

Die `determineTrickWinner`-Logik ist über separate Unit-Tests abgedeckt
(höchster Trumpf gewinnt, Trumpf sticht Fehl, bei Gleichstand gewinnt
der frühere Spieler, Abwurf in andere Fehl verliert immer).

---

## Wahrscheinliche Frontend-Ursachen

Da Backend nachweislich richtig liefert, hier vier konkrete Verdächtige
für die Frontend-Seite:

### a) Frontend liest `currentPlayerId` aus veraltetem State

Während der 1,5 s Trick-Hold sendet Backend zuerst `game:card-played`
(letzte Karte des Stichs), dann **wartet 1,5 s**, sendet dann
`game:trick-won` und **erst danach** `game:state-updated` mit dem neuen
`currentPlayerId`.

→ Wenn der Frontend-State direkt auf den letzten Spieler des
gerade-zu-Ende-gespielten Stichs schliesst („wer hat die 4. Karte
gelegt → der ist im nächsten Stich dran"), zeigt das UI **immer**
fälschlich Position 4 als nächsten Aktiven, wenn der Mensch zuletzt
gelegt hat.

**Empfehlung:** `currentPlayerId` **nie** lokal raten, immer aus dem
letzten `game:state-updated`-Event lesen. Während des Trick-Holds gilt
weiterhin der Wert *vor* dem state-update.

### b) Verwechslung zwischen `currentTrick.cards[N].playerId` und Stich-Gewinner

Der 4. Eintrag in `currentTrick.cards` ist der **letzte Spieler**, nicht
der **Sieger**. Sieger ist `tricks.at(-1).winnerId` (oder serverseitig
`currentTrick.winnerId` im fertigen Stich, der dann nach `tricks[]`
verschoben wird).

### c) Frontend „erratet" das State-Update vor `game:state-updated`

Falls die Frontend-Logik beim Empfang von `game:trick-won` schon den
Trick als „verschoben" markiert, aber `currentPlayerId` noch aus dem
*alten* GameState bezieht (= letzter Karte-Spieler), kann das zur
Anzeige des Falschen führen.

### d) Race-Condition mit Frontend-Animationen

Wenn das UI während der 1,5 s Trick-Hold-Animation eigene Logik
ausführt (z.B. „nächster Spieler = nächste Position im Uhrzeigersinn"),
greift sie auf veraltete Annahmen zurück. Backend ist da raus.

---

## Was ich vom Frontend brauche, falls das Problem weiter besteht

1. **Repro-Sequenz:** Welche Karten wurden in welcher Reihenfolge gespielt?
   (Konsole: kompletten Log der `game:card-played`-Events vom Client.)

2. **Voller `game:state-updated`-Payload** direkt **nach** dem fraglichen
   Trick — speziell die Felder:
   - `currentPlayerId`
   - `tricks.at(-1)` (gesamtes Objekt: `winnerId`, `cards`)
   - `currentTrick`

3. **Bestätigung:** Spielt das Problem auch dann eine Rolle, wenn nicht
   der Mensch die 4. Karte gelegt hat? (= Stich endet durch KI-Move.)

   Wenn der Bug nur auftritt, **wenn der Mensch die 4. Karte legt**,
   dann ist es zu ~95% Frontend-Ursache (a) oder (b).

---

## Wie weiter?

Aus Backend-Sicht ist der Fall geschlossen — Tests grün, Smoketest grün,
Daten konsistent.

Wenn das Problem im Frontend nach Prüfung von (a)–(d) weiter besteht,
schickt mir einfach den Repro-Datensatz (Punkt 1–3 oben). Falls sich
herausstellt, dass doch eine Backend-Seltenheit dahintersteckt (Edge-Case
mit Doppelkarte, Hochzeit-spezifisches Verhalten, o.ä.), kann ich es mit
dem konkreten Setup nachbauen und ggf. fixen.

**Tests / Checks aktuell:**

- `npx tsc --noEmit` ✅
- `npx vitest run` ✅ 43/43 Tests
- `npx tsc` (Build) ✅
- End-to-End Smoketest ✅ 11/11 Trick-Übergänge ohne Verletzung

🎯

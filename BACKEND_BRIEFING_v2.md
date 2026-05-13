# Doppelkopf Backend — Iteration 2 Briefing

**Adressat:** Backend-Session
**Stand:** 2026-05-13
**Vom:** Frontend-Session

---

## 📋 Status Frontend

Das Frontend wurde nach dem ersten erfolgreichen Backend-Integration auf das echte Backend umgestellt und basierend auf Nutzer-Feedback überarbeitet. Folgende Frontend-Änderungen sind bereits committed und live:

- **Single-Click-Spielen**: Klick = Karte spielen (mobile-optimiert, kein 2-Step mehr)
- **2-Sekunden Trick-Hold**: Frontend hält den fertigen Stich 2 s sichtbar (Trigger über `tricks[]`-Array)
- **Client-side Kartenlogik**: Frontend sortiert Hand und berechnet Bedienungspflicht selbst (siehe Abschnitt "Was sich geändert hat")
- **"Letzter Stich"-Button**: Spieler kann jederzeit einen Peek auf den letzten abgeschlossenen Stich werfen
- **Vorbehaltsphase-UI**: Bereits gebaut, wartet auf Backend-Support

---

## 🎯 Was das Backend ergänzen sollte

### Priorität 1: Vorbehaltsphase 🔴

**Status:** Frontend-UI ist fertig, Backend liefert aber direkt `phase: 'playing'`.
**Erwartetes Verhalten:** Vor dem ersten Spielzug muss eine Vorbehaltsphase durchlaufen werden.

**Spielablauf:**

```
1. Karten verteilt
2. phase: 'finding' → reihum Vorbehalt-Frage (Position 1 → 2 → 3 → 4)
3. Jeder Spieler antwortet 'gesund' oder 'vorbehalt'
4a. Wenn alle 'gesund' → phase: 'playing' (Normalspiel)
4b. Wenn jemand 'vorbehalt' → phase: 'finding-vorbehalt-type'
5. Spieler mit Vorbehalt wählt Typ
   (MVP nur Hochzeit, später Solo-Varianten)
6. phase: 'playing'
```

**API-Ergänzung — Client → Server:**

```typescript
| { type: 'game:declare-vorbehalt'; payload: { decision: 'gesund' | 'vorbehalt' } }
| { type: 'game:choose-vorbehalt-type'; payload: { type: VorbehaltDecision } }
```

Wobei `VorbehaltDecision` schon im `types/game.ts` definiert ist:

```typescript
type VorbehaltDecision =
  | 'gesund'
  | 'hochzeit'
  | 'damen-solo'
  | 'buben-solo'
  | 'fleischlos'
  | 'farbsolo-clubs'
  | 'farbsolo-spades'
  | 'farbsolo-hearts'
  | 'farbsolo-diamonds'
```

**Erweiterte Server → Client Felder im `GameState`:**

```typescript
phase: 'finding' | 'finding-vorbehalt-type' | 'playing' | 'finished'
vorbehaltActivePlayerId?: string  // wer hat 'vorbehalt' angemeldet
```

**Erweiterte `Player`-Felder:**

```typescript
vorbehaltDecision?: VorbehaltDecision  // undefined = noch nicht entschieden
```

**MVP-Scope:** Nur `'gesund'` und `'hochzeit'` müssen funktional sein. Die anderen Typen sind im Frontend bereits sichtbar aber disabled.

**KI-Verhalten für jetzt:** Alle KIs deklarieren `'gesund'` (kein Vorbehalt). Sobald das Backend Kreuz-Damen-Erkennung hat, kann später eine KI mit beiden Kreuz-Damen `'vorbehalt' → 'hochzeit'` wählen.

---

### Priorität 2: Spoiler-Schutz für Re/Kontra 🟠

**Hintergrund:** Das Backend-Briefing v1 erwähnte schon:
> ⚠️ Achtung Spoiler-Schutz: Aktuell sendet das Backend `players[i].party` auch im laufenden Spiel an alle Clients. Wenn euch das stört (Re/Kontra-Spoiler), sagt Bescheid

**Bitte umstellen.** Die Doppelkopf-Spannung basiert darauf, dass man **nicht weiß**, wer Mitspieler ist.

**Konkrete Regel (vereinfacht, MVP):**

Pro Client/Spieler werden die Felder `party` und `score` nach folgenden Regeln gefiltert:

| Feld | Sichtbar wenn… |
|---|---|
| **eigene `player.party`** | sofort (eigene Karten kennt der Spieler ja) |
| **andere `player.party`** | erst wenn deren Partei „geklärt" ist (z.B. durch Ansage einer Partei, oder offensichtlich durch eine ausgespielte Kreuz-Dame), spätestens am Spielende |
| **score.re / score.kontra** | erst wenn beide Parteien geklärt sind, spätestens am Spielende |

Vor der Klärung kann der Score wahlweise unsichtbar sein oder als zwei neutrale Zähler "Stiche A / Stiche B" pro Sitzgruppe angezeigt werden – Frontend-seitig handhabbar wenn das Feld einfach `null` ist.

**Konkreter API-Vorschlag:**

```typescript
interface GameState {
  // ...
  score: { re: number | null; kontra: number | null }
  players: Array<{
    // ...
    party: 're' | 'kontra' | null  // null wenn aus Sicht dieses Clients unklar
  }>
}
```

`null` statt `0` sagt dem Frontend „diese Information darfst du noch nicht sehen". Frontend rendert dann z.B. „?" oder gar nichts.

**Wenn das aufwendig ist:** Alternative wäre, einfach `party: null` für alle anderen Spieler zu senden bis zur Klärung. Score-Felder bleiben numerisch (Augen sind ja zählbar im Spiel, das ist OK – nur die *Zuordnung* zu RE/KONTRA ist der Spoiler).

---

### Priorität 2.5: Manueller „Nächstes Spiel" + Spielzettel 🟠

**Hintergrund:** Aktuell endet das Spiel mit `phase: 'finished'`, der Mensch
sieht den End-Screen und muss die Seite reloaden, um neu zu starten. Es gibt
keine Score-Akkumulation. Im echten Doppelkopf werden 20 Spiele auf einem
Spielzettel kumuliert (plus 4 Pflichtsoli, eines pro Spieler).

**Erwartetes Verhalten:**

Nach `phase: 'finished'` wartet das Backend auf einen Client-Event vom
Menschen, bevor das nächste Spiel beginnt:

```
phase: 'finished' (mit gameEndResult)
        ↓
   Frontend zeigt Spielzettel + „Nächstes Spiel" Button
        ↓
   Mensch klickt → game:next-game
        ↓
Backend: 
  - Geber rotiert (Position 1 wird die nächste, alle rücken auf)
  - 3-3-3-3 neu mischen
  - gameNumber++
  - cumulativeScore += letzte Spielpunkte
  - gameHistory.push(letztes Spiel)
        ↓
Wenn gameNumber > totalGames (default 20):
  phase: 'round-finished'    ← Endabrechnung
Sonst:
  phase: 'finding'           ← neue Vorbehaltsphase
```

**API-Ergänzung — Client → Server:**

```typescript
| { type: 'game:next-game'; payload: Record<string, never> }
```

**Erweiterte `GameState`-Felder:**

```typescript
interface GameState {
  // ... existing fields
  
  /** Spielnummer in der aktuellen 20er-Runde (1..20) */
  gameNumber: number
  /** Spiele pro Runde, default 20 */
  totalGames: number
  /** Akkumulierte Punkte pro Spieler über alle bisherigen Spiele der Runde */
  cumulativeScore: Record<string, number>  // playerId → punkte
  /** History der bisherigen Spiele dieser Runde */
  gameHistory: Array<{
    gameNumber: number
    gameType: GameType
    winnerParty: 're' | 'kontra'
    pointValue: number              // gewonnene Punkte für Sieger
    soloPlayer?: string             // playerId wenn es ein Solo war
  }>
  /** Welche Spieler haben ihr Pflichtsolo schon gespielt */
  pflichtsoloPlayed: Record<string, boolean>  // playerId → bool
}
```

**Initialwerte beim ersten Spiel:**
- `gameNumber: 1`
- `totalGames: 20`
- `cumulativeScore`: alle 4 Spieler mit 0
- `gameHistory: []`
- `pflichtsoloPlayed`: alle 4 mit `false`

**Pflichtsolo-Regel (für jetzt nur Tracking):**
- Wenn `gameType` ein Solo ist (alle Solo-Varianten außer `hochzeit`), markiere
  den Solospieler in `pflichtsoloPlayed[id] = true`.
- Vorführungs-Logik (zwangsweise Solo am Ende) ist **NICHT** Teil dieser
  Iteration — kommt Phase 3.

**`round-finished` Phase:**
- Spiel kann hier enden, neue Runde wird über eigenes UI / Reload eingeleitet
- Frontend wird hierfür eine Endabrechnungs-Anzeige bauen

---

### Priorität 3: Stich-Bestätigung 🟡 (Optional, nice-to-have)

**Hintergrund:** Das Frontend hält jeden fertigen Stich 2 Sekunden auf dem Tisch sichtbar (per Trigger auf `tricks[]`-Wachstum). Das funktioniert, weil das Backend die Stiche ins `tricks[]`-Array pusht bevor der nächste Trick beginnt.

**Bitte beibehalten und sicherstellen:**
1. **`game:trick-won`-Event wird gesendet**, sobald der 4. Spieler seine Karte legt
2. **`tricks[]`-Array wird im nächsten `game:state-updated` mit dem vollständigen Stich (4 Karten + winnerId + points) gefüllt**, bevor `currentTrick` zurückgesetzt wird
3. Wenn möglich: Backend macht **selbst eine 1.5 s Pause** zwischen "Trick voll" und "neuer Trick beginnt" – das gibt Frontend-Animationen Raum

**Aktueller Eindruck:** Klappt schon. Bitte nicht ohne Absprache schneller machen.

---

### Priorität 4: validCardIds optional weglassen 🟢 (Aufräum-Hinweis)

Das Frontend ignoriert `validCardIds` seit dieser Iteration und berechnet die Bedienungspflicht selbst (siehe `frontend/src/lib/cardLogic.ts`). Der Server validiert weiter beim Spielen (Sicherheit gegen Cheating), das ist gut so.

**Das Feld kann bleiben** (kostet nichts), aber wenn du beim nächsten Refactor den Code aufräumen willst:

- `validCardIds` kann aus dem Server→Client State entfernt werden
- Wichtig: Server-Validierung beim `game:play-card` **muss** weiter stattfinden — gerade weil das Frontend nicht mehr alleinige Autorität ist.

---

## 📐 Geänderter API-Contract (Übersicht)

Die **breaking** Änderungen im `GameState`:

```typescript
type GamePhase =
  | 'waiting'
  | 'finding'                       // ← NEU (Vorbehaltsphase 1)
  | 'finding-vorbehalt-type'        // ← NEU (Vorbehaltsphase 2)
  | 'ready-to-play'                 // ← NEU (Wartephase auf Spielstart-Klick)
  | 'playing'
  | 'finished'
  | 'round-finished'                // ← NEU (Endabrechnung nach 20 Spielen)

type GameType =
  | 'normalspiel'
  | 'hochzeit'                      // ← als gameType, wenn Hochzeit gewählt
  | 'damen-solo'                    // ← Phase 3
  | 'buben-solo'                    // ← Phase 3
  | 'fleischlos'                    // ← Phase 3
  | 'farbsolo-clubs'                // ← Phase 3
  | 'farbsolo-spades'               // ← Phase 3
  | 'farbsolo-hearts'               // ← Phase 3
  | 'farbsolo-diamonds'             // ← Phase 3

interface Player {
  // ... existing
  vorbehaltDecision?: VorbehaltDecision  // ← NEU
}

interface GameState {
  // ... existing
  vorbehaltActivePlayerId?: string       // ← NEU
  score: { re: number | null; kontra: number | null }  // ← null vor Klärung
  
  // Spielzettel-Felder (kumulative Runde aus 20 Spielen)
  gameNumber: number                                          // ← NEU
  totalGames: number                                          // ← NEU
  cumulativeScore: Record<string, number>                     // ← NEU
  gameHistory: Array<{                                        // ← NEU
    gameNumber: number
    gameType: GameType
    winnerParty: 're' | 'kontra'
    pointValue: number
    soloPlayer?: string
  }>
  pflichtsoloPlayed: Record<string, boolean>                  // ← NEU
}
```

Neue Client→Server-Events:

```typescript
| { type: 'game:declare-vorbehalt'; payload: { decision: 'gesund' | 'vorbehalt' } }
| { type: 'game:choose-vorbehalt-type'; payload: { type: VorbehaltDecision } }
| { type: 'game:start-playing'; payload: Record<string, never> }              // ← NEU
| { type: 'game:next-game'; payload: Record<string, never> }                  // ← NEU
```

Die Typen sind teils bereits im `frontend/src/types/game.ts` definiert — bitte denselben Vertrag im Backend spiegeln und die neuen Felder ergänzen.

---

## 🧪 Akzeptanzkriterien

Nach der Backend-Iteration sollte folgender Flow funktionieren (Frontend ist schon dafür ausgelegt):

**Vorbehaltsphase:**
- [ ] Spielstart → `phase: 'finding'`, Position 1 (`ai-1`) ist `currentPlayerId`
- [ ] KI 1 deklariert „gesund" → Position 2 dran → KI 2 deklariert → Position 3 → KI 3 → Position 4 (Mensch)
- [ ] Mensch sieht im Footer "GESUND" / "VORBEHALT" Buttons
- [ ] Mensch klickt „gesund" → wenn alle gesund → `phase: 'ready-to-play'`
- [ ] Wenn Mensch „vorbehalt" klickt → `phase: 'finding-vorbehalt-type'`, Hochzeit-Button erscheint
- [ ] Mensch wählt „Hochzeit" → `gameType: 'hochzeit'`, `phase: 'ready-to-play'`

**Wartephase + Spielstart:**
- [ ] `phase: 'ready-to-play'` wird gesendet, KIs warten
- [ ] Mensch sendet `game:start-playing` → `phase: 'playing'`
- [ ] Wenn Ausspielspieler eine KI ist → diese spielt nach kurzer Pause die erste Karte
- [ ] Wenn Ausspielspieler der Mensch ist → Mensch ist am Zug, validCardIds = alle Karten

**Spielende + Nächstes Spiel:**
- [ ] Spielende: `phase: 'finished'` mit `gameEndResult`
- [ ] Während des Spiels: andere Spieler haben `party: null` (Spoiler-Schutz)
- [ ] `score.re` und `score.kontra` zeigen Punkte erst wenn Parteien geklärt sind
- [ ] Spielende: `gameEndResult` enthält finalen Score, alle Parteien sichtbar
- [ ] Mensch sendet `game:next-game` → Geber rotiert, neu mischen, `gameNumber++`, `phase: 'finding'`
- [ ] `cumulativeScore` enthält Summe aller bisherigen Spielergebnisse pro Spieler
- [ ] `gameHistory` enthält Eintrag für jedes abgeschlossene Spiel
- [ ] Nach Spiel 20 → `phase: 'round-finished'`, neue Runde wird nicht automatisch gestartet

**Pflichtsolo-Tracking:**
- [ ] Wenn `gameType` ein Solo-Typ ist (außer hochzeit): `pflichtsoloPlayed[soloplayerId] = true`
- [ ] Frontend kann den Status aus jedem `state-updated` ablesen

---

## 🗺️ Was nicht in diese Iteration gehört

Bitte **nicht** in diese Iteration aufnehmen (kommt Phase 3):

- Hochzeit-Klärungsstich-Logik (für MVP reicht: gameType='hochzeit' → Spiel als Hochzeit-Single, vereinfacht)
- Solo-Varianten (Damen/Buben/Fleischlos/Farb) — diese sind im UI sichtbar aber disabled
- Pflichtsolo-Vorführungs-Logik (zwangsweises Solo am Rundenende für nicht-Solier)
- DB-Persistenz über Runden hinweg
- Multi-Tisch
- Echte KI für Vorbehalt-Entscheidungen (KIs deklarieren immer 'gesund')

---

## 📞 Bei Fragen

Falls etwas am API-Contract unklar ist oder Anpassungen nötig sind, bitte zurück an die Frontend-Session — ich passe das Frontend bei Bedarf an. Hauptziel: Frontend und Backend nutzen denselben Vertrag.

**Test-Setup beim Start einer Backend-Session:**

```bash
# Backend neu starten
cd /Users/manfredwolff/ki-projects/doppelkopf/backend
npm run dev

# Frontend läuft schon auf Port 5174 und verbindet sich automatisch
```

---

**Viel Erfolg!** 🎯

Mit Vorbehaltsphase und Spoiler-Schutz wird das Spiel deutlich authentischer.

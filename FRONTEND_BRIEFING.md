# Doppelkopf Frontend — Integration Briefing

**Adressat:** Frontend-Session (separater Claude/Entwickler)
**Stand:** 2026-05-13
**Vom:** Backend-Session

---

## 📋 Status

Das **echte Backend ist fertig** und ersetzt den Mock-Server vollständig.
Verzeichnis: `/Users/manfredwolff/ki-projects/doppelkopf/backend/`

- ✅ TypeScript strict, kompiliert sauber
- ✅ 27/27 Unit-Tests grün (Deck, RulesValidator, ScoringEngine, GameEngine end-to-end)
- ✅ WebSocket-Server auf Port **3001** (gleicher wie Mock-Server)
- ✅ Smoke-getestet: Client kann joinen, Parteien werden korrekt zugewiesen, KI startet automatisch

---

## 🚦 Was du als nächstes tun musst

### 1. Backend starten (ersetzt Mock-Server!)

```bash
# Mock-Server stoppen, falls läuft (Port 3001 muss frei sein)
# Im Backend:
cd /Users/manfredwolff/ki-projects/doppelkopf/backend
npm install   # (einmalig, falls noch nicht geschehen)
npm run dev   # Server auf ws://localhost:3001
```

→ Das Frontend (`http://localhost:5174`) verbindet sich automatisch dorthin.

### 2. Echtes Spiel testen — Erwartete Unterschiede zum Mock

Der Mock war absichtlich permissiv. Mit dem echten Backend wirst du Verhalten sehen, das vorher nicht da war:

| Bereich | Mock | Echt |
|---|---|---|
| **Bedienungspflicht** | Alle Karten immer gültig | `validCardIds` enthält nur erlaubte Karten |
| **Stich-Gewinner** | Zufällig | Nach TSR (Trumpfhierarchie, Karo 9 unten, Kreuz Dame ganz oben außer Herz 10) |
| **Augensummen** | Zufällig | Korrekt nach gewonnenen Stichen |
| **Spielsieger** | Score-Vergleich | Re bei ≥ 121 Augen, sonst Kontra |
| **Parteien** | `null` für alle | Re/Kontra anhand Kreuz-Damen-Verteilung |
| **Reihenfolge** | Mensch startet | Linker Nachbar des Gebers (= Position 1 = `ai-1`) startet |
| **KI-Züge** | Random | Regelkonform (Bedienen, schwächste stechende Karte, Abwurf) |
| **Ansagen** | Werden akzeptiert | Validiert (Kartenzahl, Partei, Duplikat, Folge-Ansage erfordert Erstansage) |

### 3. UI-Aspekte, die jetzt sinnvoll werden

Diese Features wurden im Mock entweder gar nicht oder fehlerhaft simuliert — jetzt sind sie real und visuell sichtbar:

- **Disabled-Karten:** Karten, die nicht in `validCardIds` sind, müssen visuell ausgegraut/nicht-klickbar dargestellt werden (Briefing v1 forderte das schon, jetzt ist es echt nötig).
- **Partei-Farbe pro Spieler:** Sobald geklärt (im Normalspiel: ab spätestens Spielende, manchmal früher per Ansage), `player.party` für UI-Hint nutzen.
- **Live-Score:** `score.re` / `score.kontra` werden mit jeder Stich-Auflösung aktualisiert.
- **Spielende-Modal:** `gameEndResult` enthält `winner`, `finalScore`, `statistics.{re,kontra}.{players, score}`, `tricks`, `announcements`.

### 4. Ansage-Button Enable-Logic

Das Backend validiert serverseitig. Das Frontend kann/sollte Ansage-Buttons aber UI-seitig vorab deaktivieren, basierend auf:

- **Re:** Hand muss noch ≥ 11 Karten haben + Spieler hat Kreuz-Dame
- **Kontra:** Hand ≥ 11 Karten + Spieler hat KEINE Kreuz-Dame
- **90:** Hand ≥ 10, eigene Partei hat Re/Kontra bereits angesagt
- **60:** Hand ≥ 9, eigene Partei hat Re/Kontra bereits angesagt
- **30:** Hand ≥ 8, eigene Partei hat Re/Kontra bereits angesagt
- **Schwarz:** Hand ≥ 7, eigene Partei hat Re/Kontra bereits angesagt

Konstanten dafür stehen in `backend/src/shared/rules.ts → ANNOUNCEMENT_MIN_CARDS`.

⚠️ Achtung Spoiler-Schutz: Aktuell sendet das Backend `players[i].party` auch im laufenden Spiel an alle Clients. Wenn euch das stört (Re/Kontra-Spoiler), sagt Bescheid — Backend kann das umschalten auf "erst nach Klärung sichtbar".

---

## 📐 API-Contract — KEINE Änderungen am Frontend nötig

Der WebSocket-Contract ist exakt derselbe wie beim Mock-Server. Alle Events:

**Client → Server:** `game:join`, `game:play-card`, `game:announce`, `game:state-request`, `game:leave`

**Server → Client:** `game:joined`, `game:state-updated`, `game:card-played`, `game:trick-won`, `game:announcement`, `game:ended`, `game:error`

→ `useGameWebSocket.ts` und `types/game.ts` sollten **unverändert weiter funktionieren**.

### Neue Error-Codes

Zusätzlich zu den bisherigen Codes kann jetzt vorkommen:

- `rule-violation` — z.B. Bedienungspflicht verletzt
- `announcement-invalid` — Ansage zu spät / falsche Partei / Duplikat / fehlende Erstansage

Beide sollten als Toast/Inline-Fehler angezeigt werden. Die `message`-Felder sind bereits deutsch und nutzerfreundlich formuliert.

---

## 🔍 Verifikations-Checkliste fürs Frontend

Spielt am besten ein komplettes Spiel von Anfang bis Ende und prüft:

- [ ] Spiel startet, Hand zeigt 12 Karten
- [ ] KI macht den ersten Zug automatisch (nicht der Mensch!)
- [ ] Sobald Mensch dran ist: nur erlaubte Karten sind anklickbar
- [ ] Ungültiger Klick → Karte ausgegraut, kein Crash
- [ ] Nach 4 Karten: Stich wird kurz angezeigt (1.5 s Pause), dann Score-Update
- [ ] Augensummen stimmen (am Ende: re + kontra = 240)
- [ ] Re-Ansage: Button geht aus, wenn Hand < 11 Karten
- [ ] Spielende-Screen zeigt Sieger + finalen Punktwert
- [ ] Reconnect funktioniert (Backend-Restart → Frontend bekommt neue Verbindung)

---

## 🐛 Was tun bei Problemen

**Frontend zeigt nichts / Connection fails:**
- `lsof -ti tcp:3001` — wer hört auf Port 3001? Mock-Server killen.
- Backend-Logs anschauen (Terminal mit `npm run dev`)

**Karte legen → Error "Bedienungspflicht":**
- Das ist korrektes Verhalten. Prüft, ob die UI `validCardIds` korrekt aus dem `state-updated`-Event übernimmt.

**KI hängt:**
- Backend-Console schaut nach Stack-Trace. Im Zweifel: `game:state-request` schicken zum Resync.

**Spiel scheint nie zu enden:**
- Nach 12 Stichen kommt automatisch `game:ended`. Prüft, ob das Frontend das Event korrekt verarbeitet.

---

## 🗺️ Roadmap nach diesem MVP

Das Backend ist auf Erweiterung vorbereitet, aber bewusst klein gehalten:

**Phase 2 (Backend-Erweiterungen, später):**
- Solo + Hochzeit
- Spielzettel mit 20 Runden + Pflichtsolo-Tracking
- DB-Persistenz statt In-Memory
- Multi-Tisch / Mehrspielmodus

**Phase 2 (Frontend, in Reichweite):**
- Card-Animations (Karte fliegt zur Tischmitte)
- Dark Mode Toggle
- Mobile Responsive Layout finalisieren
- Toast-Notifications für Ansagen

---

## 📞 Kommunikation

Wenn ihr im Frontend Anpassungen am API-Contract braucht (z.B. zusätzliche Felder im State, anderes Event-Format), öffnet einen kurzen Punkt in einer Backend-Session und der Contract wird abgestimmt erweitert. **Bitte nicht** unilateral `types/game.ts` ändern — das ist der gemeinsame Vertrag.

**Bei Bugs im Backend:**
- Reproduktion notieren (welche Karten, welche Reihenfolge)
- Backend-Console-Output mitschicken
- Bei kritischen Bugs gibt es deterministische Tests via `seededRng` — siehe `tests/GameEngine.test.ts`

---

**Viel Erfolg beim Integrieren!** 🎯

Das Backend ist robust getestet — kleinere UI-Probleme oder Layout-Fragen sollten der Hauptfokus sein.

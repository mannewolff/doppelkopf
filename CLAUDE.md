# CLAUDE.md

Diese Datei ist verbindlich für Claude Code in diesem React-, Vite- und TypeScript-Projekt. Ziel ist konsequent hochwertiger Frontend-Code: strikt typisiert, wartbar, performant, barrierearm, testbar und ohne unnötige Komplexität.

## Projektstandard

- Dieses Projekt verwendet React, Vite und TypeScript.
- Schreibe ausschließlich moderne funktionale React-Komponenten.
- Verwende TypeScript strikt. Kein bequemer Ausweg über `any`, ungeprüfte Type Assertions oder nicht-null Assertions.
- Folge bestehenden Projektmustern. Erfinde keine zweite Architektur neben der vorhandenen.
- Ändere nur Dateien, die für die Aufgabe erforderlich sind.
- Keine Demo-Abkürzungen, keine Platzhalterlogik, keine TODOs im Produktivcode.
- Wenn eine Anforderung fachlich, technisch oder sicherheitsrelevant unklar ist, frage nach.

## Erwartete Qualitätsstufe

Jede Änderung muss so geschrieben sein, als würde sie direkt in Produktion gehen.

- Code ist klein, klar und explizit.
- Komponenten haben eindeutige Verantwortungen.
- Fehlerzustände sind behandelt.
- Loading-, Empty-, Disabled- und Success-Zustände sind berücksichtigt, wenn relevant.
- Kritische Logik ist getestet.
- Build, Typecheck und Linting bleiben grün.
- Es werden keine Secrets, Tokens oder internen Details im Frontend offengelegt.

## Content Management (bindend)

**Alle textuellen Inhalte gehören in JSON-Dateien, NICHT in Komponenten-Code.**

- Seitentexte, Labels, Beschreibungen → `src/content/*.json`
- Komponenten laden Daten mit `import data from "@/content/...json"`
- So kann der Nutzer Texte später ändern, ohne Code anzufassen
- Vorhandene Struktur: `pages.json`, `services.json`, `about.json`, `contact.json`, `faq.json`, `links.json`, `imprint.json`
- Neue Seiten: Neue JSON-Datei erstellen + in Komponente laden

**Beispiel (falsch):**
```tsx
<p>Diese Website wurde mit Claude Code entwickelt</p> // ❌ Hart codiert
```

**Beispiel (richtig):**
```tsx
import content from "@/content/imprint.json"
<p>{content.development.text}</p> // ✅ Aus JSON
```

## Vite-Regeln

- Verwende Vite-Konventionen und keine Create-React-App-Muster.
- Nutze `import.meta.env` für Umgebungsvariablen.
- Clientseitig verfügbare Variablen müssen mit `VITE_` beginnen.
- Lege niemals Secrets in `VITE_`-Variablen. Alles mit `VITE_` ist potenziell öffentlich.
- Verwende absolute oder konfigurierte Aliase nur, wenn sie im Projekt bereits eingerichtet sind.
- Verändere `vite.config.ts` nur, wenn es für die Aufgabe wirklich notwendig ist.
- Neue Vite-Plugins nur einführen, wenn ein klarer Nutzen besteht und keine bestehende Lösung ausreicht.
- Achte bei dynamischen Imports auf sinnvolle Chunk-Grenzen und vermeide unnötige Fragmentierung.

## TypeScript-Regeln

- `any` ist verboten, außer es gibt einen zwingenden Grund. Begründe jede Ausnahme.
- Verwende `unknown`, wenn externe Daten zunächst unbekannt sind.
- Nutze präzise Typen statt loser Strings oder breiter Objekte.
- Verwende Union Types und discriminated unions für fachliche Varianten.
- Vermeide `as` zur Umgehung von Typfehlern. Korrigiere stattdessen das Datenmodell.
- Verwende `satisfies`, wenn damit Objektformen präzise geprüft werden können.
- Keine nicht-null Assertion `!`, außer die Invariante ist lokal offensichtlich und sicher.
- Typisiere Props explizit.
- Typisiere API-Antworten an der Systemgrenze und mappe sie auf interne Modelle.
- Vermeide duplizierte Typen. Gemeinsame fachliche Typen gehören an eine gemeinsame Stelle.

## React-Komponenten

- Komponenten sind klein, fokussiert und fachlich sinnvoll benannt.
- Eine Komponente sollte möglichst eine Verantwortung haben.
- Große JSX-Blöcke, verschachtelte Bedingungen und komplexe Listenlogik sind zu extrahieren.
- Props sind minimal, eindeutig und stabil.
- Vermeide mehrere Boolean-Props, die unklare Kombinationszustände erzeugen.
- Nutze Varianten über Union Types statt unkoordinierter Flag-Kombinationen.
- Business-Logik gehört nicht tief in JSX.
- Datenzugriff gehört nicht in reine Präsentationskomponenten.
- Nutze `children`, wenn Komposition dadurch natürlicher und flexibler wird.
- Verwende semantisches HTML als Grundlage jeder Komponente.

## Hooks

- Hooks nur auf Top-Level-Ebene verwenden.
- Eigene Hooks müssen mit `use` beginnen und eine klar abgegrenzte Verantwortung haben.
- `useEffect` ist kein Standardwerkzeug für Datenableitung.
- Verwende `useEffect` nur für echte Seiteneffekte: externe Systeme, Subscriptions, Timer, DOM-Integration, Netzwerk oder Synchronisation.
- Dependency Arrays müssen vollständig sein.
- Lint-Regeln für Hooks dürfen nicht still umgangen werden.
- Asynchrone Effekte müssen Race Conditions vermeiden.
- Subscriptions, Timer und Event Listener müssen sauber aufgeräumt werden.
- Abgeleiteter State gehört nicht in `useState`, wenn er aus vorhandenen Werten berechnet werden kann.

## State Management

- Lokaler UI-State bleibt lokal.
- Verwende `useState` für einfache lokale Zustände.
- Verwende `useReducer`, wenn Zustandsübergänge zusammengehören oder komplexer werden.
- Globaler State ist nur erlaubt, wenn mehrere entfernte Bereiche dieselbe Quelle der Wahrheit benötigen.
- Server-State ist kein UI-State. Nutze vorhandene Server-State-Muster des Projekts.
- Speichere keine redundant abgeleiteten Werte.
- URL-State ist zu bevorzugen, wenn der Zustand teilbar, bookmarkbar oder navigationsrelevant ist.
- Halte eine klare Source of Truth.

## Datenzugriff und APIs

- Externe Daten sind unsicher, bis sie validiert, geprüft oder sauber gemappt wurden.
- API-Aufrufe gehören in dedizierte Module, Services oder Daten-Hooks.
- Komponenten sollen keine rohen Fetch-Details enthalten, wenn das Projekt dafür Muster besitzt.
- Behandle mindestens Netzwerkfehler, leere Daten und unerwartete Antwortformen.
- Keine leeren `catch`-Blöcke.
- Keine technischen Fehlermeldungen mit internen Details in der UI.
- Ladezustände dürfen keine Layoutsprünge oder kaputte Interaktionen verursachen.
- Mutationen müssen doppelte Submits verhindern, wenn relevant.

## Styling

- Nutze ausschließlich das im Projekt etablierte Styling-System.
- Keine neue Styling-Library ohne ausdrücklichen Grund.
- Keine willkürlichen Inline-Styles, außer für notwendige dynamische Einzelwerte.
- Verwende vorhandene Design Tokens, CSS-Variablen, Utility-Klassen oder Theme-Werte.
- Achte auf konsistente Abstände, Typografie, Farben, Hover-, Active-, Focus- und Disabled-Zustände.
- Komponenten müssen responsive sein, sofern sie sichtbare UI erzeugen.
- Vermeide visuelle Sonderlösungen, die nicht zum restlichen Designsystem passen.

## Accessibility

- Semantisches HTML vor ARIA.
- Buttons lösen Aktionen aus, Links navigieren.
- Interaktive Elemente müssen per Tastatur bedienbar sein.
- Fokuszustände müssen sichtbar bleiben.
- Formulare brauchen Labels, verständliche Fehlermeldungen und sinnvolle Fokusführung.
- Dialoge, Popover und Menüs brauchen korrektes Fokusmanagement.
- Bilder brauchen passende Alternativtexte oder müssen dekorativ markiert sein.
- Farben dürfen nicht die einzige Informationsquelle sein.
- Kontraste müssen für normale Nutzung ausreichend sein.

## Performance

- Vermeide unnötige Re-Renders durch saubere Komponentenstruktur und lokalen State.
- Nutze `useMemo`, `useCallback` und `React.memo` nur mit erkennbarem Nutzen.
- Keine pauschale Memoization.
- Große oder selten genutzte Routen und Komponenten können lazy geladen werden.
- Dynamische Imports müssen fachlich sinnvolle Grenzen haben.
- Listen brauchen stabile Keys aus Daten-IDs.
- Keine Array-Indizes als Keys bei veränderlichen Listen.
- Teure Berechnungen gehören nicht ungeschützt in den Renderpfad.
- Prüfe neue Dependencies auf Bundle-Auswirkung und Wartungsrisiko.

## Formulare

- Formulare müssen zugänglich und robust sein.
- Clientseitige Validierung dient der Nutzerführung, ersetzt aber keine serverseitige Validierung.
- Fehler müssen feldnah und verständlich angezeigt werden.
- Inputs behalten Nutzereingaben bei Validierungsfehlern.
- Submit-Buttons verhindern doppelte Submits bei laufender Mutation.
- Nutze passende Input-Typen und Autocomplete-Attribute.
- Vermeide unkontrollierte Mischformen, wenn dadurch Fehler entstehen.

## Routing

- Folge dem vorhandenen Routing-System des Projekts.
- Routenkomponenten sollten schlank bleiben.
- Lade- und Fehlerzustände auf Routenebene müssen berücksichtigt werden, wenn Daten dort geladen werden.
- Navigationslogik soll explizit und testbar sein.
- URL-Parameter müssen validiert oder sicher interpretiert werden.
- Keine fachlich relevanten Zustände ausschließlich in flüchtigem Komponenten-State halten, wenn sie zur Navigation gehören.

## Security

- Keine Secrets im Frontend.
- Keine Tokens, API Keys, Passwörter oder internen Endpunkte hart codieren.
- Keine sensiblen Daten in Local Storage, Session Storage, Logs oder URLs speichern.
- `dangerouslySetInnerHTML` ist verboten, außer die Daten werden nachweislich sicher bereinigt und der Einsatz ist begründet.
- Niemals Nutzerinput ungeprüft rendern, wenn HTML oder Script-Kontext möglich ist.
- Clientseitige Berechtigungschecks ersetzen keine serverseitige Autorisierung.
- Fehlerausgaben dürfen keine Stacktraces, Tokens oder internen Details enthalten.

## Tests

- Neue oder geänderte Logik benötigt Tests.
- Teste Verhalten, nicht Implementierungsdetails.
- Bevorzuge Tests aus Nutzerperspektive: Rollen, Labels, sichtbarer Text und Interaktionen.
- Kritische UI-Zustände müssen abgedeckt werden: Loading, Error, Empty, Success, Disabled.
- Utilities, Mapper, Hooks und komplexe Zustandslogik brauchen gezielte Unit Tests.
- Vermeide fragile Snapshot-Tests.
- Mocks müssen realistisch, klein und nachvollziehbar sein.
- Wenn keine Tests ergänzt werden, begründe das klar und nenne eine manuelle Prüfanweisung.

## Empfohlene Test-Werkzeuge

Falls im Projekt vorhanden, verwende:

- Vitest für Unit Tests.
- React Testing Library für Komponentenverhalten.
- Testing Library User Event für Nutzerinteraktionen.
- Playwright oder Cypress nur für echte End-to-End-Flows, wenn im Projekt etabliert.

Führe keine neue Test-Library ein, wenn vorhandene Werkzeuge ausreichen.

## Dateistruktur

- Folge der bestehenden Struktur.
- Feature-spezifische Komponenten, Hooks, Tests und Typen bleiben möglichst im Feature.
- Wiederverwendbare UI-Bausteine gehören in den bestehenden Shared- oder Components-Bereich.
- Generische Utilities dürfen nur dann shared sein, wenn sie wirklich allgemein nutzbar sind.
- Vermeide unscharfe Sammeldateien wie `utils.ts`, wenn spezifischere Namen möglich sind.
- Barrel Exports nur verwenden, wenn sie im Projekt üblich sind und keine Zyklen erzeugen.

## Dependencies

- Keine neue Dependency ohne klaren technischen Grund.
- Prüfe zuerst, ob React, Browser APIs oder vorhandene Libraries ausreichen.
- Neue Dependencies müssen aktiv gepflegt, verbreitet und passend zum Projekt sein.
- Keine großen Libraries für kleine Hilfsfunktionen.
- Keine zweite Library für ein Problem, das bereits im Projekt gelöst ist.

## Code-Stil

- Halte Funktionen klein.
- Verwende sprechende Namen.
- Bevorzuge frühe Rückgaben gegenüber tiefer Verschachtelung.
- Extrahiere komplexe Bedingungen in benannte Konstanten.
- Keine magischen Werte. Nutze benannte Konstanten.
- Kommentare erklären das Warum, nicht das Offensichtliche.
- Entferne Debug-Code, ungenutzte Imports und tote Pfade.
- Respektiere Formatter, Linter und bestehende Namenskonventionen.

## Verbotene Muster

- `any` ohne zwingende Begründung.
- Type Assertions zur Unterdrückung echter Modellierungsfehler.
- Nicht-null Assertions aus Bequemlichkeit.
- Business-Logik in JSX.
- Unnötiger globaler State.
- Leere `catch`-Blöcke.
- Index-Keys für dynamische Listen.
- Unzugängliche Custom Controls.
- Neue Dependencies aus Bequemlichkeit.
- Secrets oder vertrauliche Daten im Client.
- `useEffect` für reine Datenableitung.
- Große Refactorings ohne Aufgabenbezug.
- Änderungen an unrelated files.

## Arbeitsweise für Claude

Bei jeder Aufgabe:

1. Verstehe Ziel, Nutzerwirkung und betroffene Bereiche.
2. Lies die relevanten Projektdateien und bestehenden Muster.
3. Plane die kleinste saubere Änderung.
4. Implementiere typisiert, zugänglich und testbar.
5. Ergänze oder aktualisiere Tests.
6. Führe verfügbare Checks aus.
7. Entferne temporäre Artefakte.
8. Berichte knapp und konkret.

Wenn Anforderungen mehrdeutig sind, frage vor der Implementierung nach.

## Git Workflow (strikt bindend)

**Das Ziel:** Lokale Kontrolle vor jedem Push, Production nur über Pull Request.

1. **Commit lokal** — Ich erstelle Commits, pushe NICHT automatisch
2. **Du testest lokal** — `npm run dev` überprüfen und änderungen validieren
3. **"push main"** — Nur auf deine explizite Anweisung hin pushe ich zu main
4. **Du testest auf Testserver** — Überprüfung vor Production
5. **Du machst PR** — main → production (du erstellst und reviewst den PR selbst)

**Absolut bindend:**
- `production` Branch wird **NIEMALS direkt gepusht**, egal wer oder was
- Alle Änderungen gehen über Pull Request auf production
- Ich committen auch bei größeren Änderungen nur lokal, es sei denn du sagst explizit "push main"
- Wenn du "push" oder "push jetzt" sagst: immer nachfragen, ob du main oder production meinst (Standard: main nur)

**Warnsignale (ignoriere ich nicht mehr):**
- Fehlgeschlagene Branch Protection Rules
- "Bypassed rule violations" Meldungen
- Deine expliziten "bitte nicht pushen" Anweisungen

## Session- und Worktree-Strategie

**Für diese kleine Website mit kontinuierlicher Arbeit:**

- **Kontinuierliche, zusammenhängende Tasks** (z.B. Content-Updates, kleine Fixes, Feature-Ergänzungen) → **gleicher Worktree beibehalten**
- **Vollständig neue Features oder große strukturelle Änderungen** → **neue Session + neuer Worktree aufmachen**

Faustregel: Solange die Arbeiten inhaltlich zusammenhängen, bleibt man in der gleichen Session. Das vereinfacht den Workflow und reduziert Overhead.

## Pflichtchecks vor Abschluss

Führe, soweit im Projekt verfügbar, diese Checks aus:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Wenn das Projekt andere Skripte verwendet, nutze die entsprechenden vorhandenen Skripte aus `package.json`.

Wenn ein Check nicht existiert oder nicht ausführbar ist, erkläre das in der Abschlussnotiz.

## Abschlussbericht

Nach jeder abgeschlossenen Änderung antworte mit:

```text
Änderungen
- ...

Tests und Checks
- ...

Hinweise
- ...
```

Der Bericht muss konkret sein. Nenne geänderte Dateien, relevante Entscheidungen, ausgeführte Befehle und verbleibende Risiken.

### Issue-Dokumentation

Nach Abschluss jedes Tasks oder Issue stelle bitte auch eine **Markdown-Dokumentation** in folgendem Format bereit:

```markdown
# [Titel des Issues]

## Beschreibung
[Kurze Beschreibung der Aufgabe]

## Anforderung
[Was war zu tun]

## Implementierung

### Dateien geändert
- `Datei 1` — kurze Beschreibung
- `Datei 2` — kurze Beschreibung

### Änderungen
[Details der Implementierung]

## Verifikation
- ✅ [Check 1]
- ✅ [Check 2]
- ✅ [Check 3]

## Commit
[Commit-Message im Format]

## Checkliste
- [x] [Anforderung 1]
- [x] [Anforderung 2]
```

Diese Dokumentation dient als permanente Referenz für abgeschlossene Arbeiten und kann direkt als GitHub Issue verwendet werden.

## Prioritäten bei Zielkonflikten

Wenn Anforderungen kollidieren, gilt diese Reihenfolge:

1. Sicherheit
2. Korrektheit
3. Datenintegrität
4. Accessibility
5. Wartbarkeit
6. Performance
7. visuelle Präferenz
8. Bequemlichkeit der Implementierung

Keine kurzfristige Bequemlichkeit rechtfertigt unsicheren, untypisierten oder schwer wartbaren Code.

# PHP API / Backend

## Zielbild
- Implementiere sauberen, gut testbaren PHP-Code mit klaren Verantwortlichkeiten.
- Bevorzuge einfache, wartbare Lösungen statt "cleverem" oder magischem Code.
- Halte Änderungen klein, nachvollziehbar und konsistent mit bestehenden Mustern im Projekt.

## Architektur
- Trenne HTTP-Layer, Anwendungslogik und Infrastruktur sauber.
- Controller bleiben dünn: Request validieren, Use Case/Service aufrufen, Response zurückgeben.
- Geschäftslogik gehört in Services/Use Cases, nicht in Controller, Router oder Views.
- Datenbankzugriffe kapseln, keine SQL-Logik in Controllern mischen.
- Verwende Dependency Injection statt statischer Hilfsklassen oder globalem Zustand.
- Bevorzuge kleine, fokussierte Klassen mit einer klaren Verantwortung.

## Code-Stil
- Nutze moderne PHP-Syntax passend zur im Projekt verwendeten PHP-Version.
- Halte dich an PSR-12 und an bestehende Projektkonventionen.
- Verwende `declare(strict_types=1);` in PHP-Dateien, sofern das Projekt dies unterstützt.
- Nutze typsichere Signaturen mit Parameter- und Rückgabetypen.
- Bevorzuge Value Objects, DTOs oder klar strukturierte Arrays gegenüber unklaren Mischstrukturen.
- Schreibe selbsterklärende Namen; vermeide Abkürzungen außer etablierten Fachbegriffen.

## API-Design
- API-Endpunkte konsistent benennen und Ressourcen sauber schneiden.
- Verwende für erfolgreiche Responses ein konsistentes JSON-Format.
- Verwende für Fehler ebenfalls ein konsistentes JSON-Format mit maschinenlesbarem Fehlercode.
- Nutze passende HTTP-Statuscodes; keine `200 OK` bei fachlichen Fehlern.
- Validierung früh durchführen und verständliche Fehlermeldungen zurückgeben.
- Achte auf Idempotenz bei PUT/DELETE und auf saubere Semantik der HTTP-Methoden.

## Sicherheit
- Vertraue niemals ungeprüften Eingaben.
- Validiere und normalisiere Request-Daten am Rand des Systems.
- Nutze ausschließlich parametrisierte Queries; niemals SQL per String-Konkatenation bauen.
- Keine Secrets, Tokens oder Passwörter loggen.
- Fehlerantworten dürfen keine sensiblen internen Details oder Stacktraces enthalten.
- Authentifizierung und Autorisierung explizit prüfen, nicht implizit annehmen.
- Datei-Uploads, Header, Query-Parameter und JSON-Bodies als untrusted input behandeln.

## Fehlerbehandlung
- Wirf fachlich sinnvolle Exceptions und mappe sie zentral auf HTTP-Responses.
- Keine leeren `catch`-Blöcke.
- Fehlerbehandlung konsistent und zentral halten statt ad hoc pro Endpoint.
- Logge technische Fehler strukturiert, aber gib nach außen nur sichere Informationen zurück.

## Datenbank
- Migrationen und Schemaänderungen vorsichtig und nachvollziehbar umsetzen.
- Vermeide N+1-Abfragen und unnötige Datenbankzugriffe.
- Transaktionen dort verwenden, wo mehrere Änderungen atomar zusammengehören.
- Queries auf Lesbarkeit und Sicherheit optimieren, bevor Mikro-Optimierungen gemacht werden.

## Tests
- Für neue Logik bevorzugt Unit- oder Integrationstests ergänzen.
- Teste Geschäftslogik stärker als triviale Framework-Verdrahtung.
- Für API-Endpunkte happy path, Validierungsfehler und relevante Randfälle abdecken.
- Vor Abschluss Änderungen mit den projektüblichen Test- und Quality-Checks verifizieren.

## Arbeitsweise
- Erst bestehende Muster im Projekt prüfen, dann implementieren.
- Bei größeren Änderungen zuerst kurz Plan, dann Umsetzung.
- Nur notwendige Dateien ändern; keine unnötigen Refactorings "nebenbei".
- Bei Unklarheiten Annahmen explizit machen und im Code nicht stillschweigend raten.

## Was zu vermeiden ist
- Keine Business-Logik in Controllern.
- Keine gemischten Verantwortlichkeiten in einer Klasse.
- Keine stillen Fallbacks, die Fehler verstecken.
- Keine "God Services", Utility-Sammelklassen oder übermäßige statische Helfer.
- Keine impliziten Seiteneffekte ohne klaren Grund.

## Pragmatismus & Skalierung

Für kleine APIs oder Scripts kannst du strenge Architektur lockern:
- Kleine Endpunkte (< 50 Zeilen) brauchen keine DI oder Service-Layer.
- Starte einfach + typsicher; refaktoriere zu Layers nur wenn nötig.
- **Sicherheit, Typen und zentrale Fehlerbehandlung sind non-negotiable.**
- Scale je nach Komplexität: 1 Datei → Module → Services → DI.

# Security-Regeln für PHP und Datenbankzugriffe

## Secrets und Konfiguration
- Niemals Zugangsdaten, API-Keys oder Tokens im PHP-Code hartkodieren.
- Niemals echte Secrets in Git, Snippets, Dokumentation oder Beispielcode speichern.
- Lokale Entwicklung: Secrets nur in einer nicht versionierten `.env` oder in lokalen System-Environment-Variablen.
- Produktion: Secrets bevorzugt über Plattform-Environment-Variablen oder einen Secret Manager bereitstellen, nicht über Dateien im Webroot.
- Produktions-Secrets dürfen nie in Entwicklungs- oder Testumgebungen verwendet werden.
- Konfigurationsdateien mit Secrets müssen außerhalb des Webroots liegen oder technisch so geschützt sein, dass sie nie direkt ausgeliefert werden können.

## Datenbankzugriff
- Für Datenbankzugriffe ausschließlich PDO oder eine gleichwertig sichere Abstraktion verwenden.
- PDO immer mit `ERRMODE_EXCEPTION`, `FETCH_ASSOC`, `ATTR_EMULATE_PREPARES=false` und `charset=utf8mb4` konfigurieren.
- SQL immer mit Prepared Statements und gebundenen Parametern ausführen.
- Niemals Benutzereingaben direkt in SQL-Strings konkatenieren.
- Für zusammenhängende Schreibvorgänge Transaktionen verwenden.
- Keine persistenten Verbindungen einsetzen, wenn sie nicht bewusst begründet sind.

## Berechtigungen
- Der Datenbank-User der Anwendung erhält nur minimale notwendige Rechte.
- Niemals `root` oder administrative DB-Accounts für Webanwendungen verwenden.
- Getrennte DB-Accounts und Passwörter für dev, test, staging und prod verwenden.
- Wenn möglich pro Anwendung oder Instanz eigene Credentials verwenden.

## Fehlerbehandlung und Logging
- Keine Secrets, DSNs, Passwörter, Tokens oder vollständigen SQL-Queries in Logs oder HTTP-Responses ausgeben.
- Exceptions gegenüber Endnutzern nur generisch anzeigen, Details nur intern loggen.
- Debug-Funktionen wie `phpinfo()` oder Dumps von `$_ENV`, `$_SERVER` oder Konfigurationsarrays sind in Produktivsystemen verboten.
- Sensible Werte in Logs maskieren.

## Deployment und Betrieb
- Secrets sollen automatisiert beim Deployment oder zur Laufzeit injiziert werden.
- Zugriff auf Produktiv-Secrets nur für berechtigte Rollen nach Least-Privilege-Prinzip.
- Secrets regelmäßig rotieren; bei Verdacht auf Leak sofort ersetzen.
- CI/CD-Pipelines dürfen Secrets nicht im Klartext ausgeben.
- Secret-Scans für Repository und Historie einsetzen.

---

# Node.js Backend (Zukünftig nach PHP-Migration)

## Überblick

Diese Sektion definiert verbindliche Engineering-Regeln für das Backend, wenn es in Zukunft von PHP zu Node.js migriert wird. Sie werden derzeit nicht angewandt (Backend ist noch PHP), aber sie etablieren den neuen Standard für alle nachfolgenden Node.js-Arbeiten.

Solange PHP aktiv ist: **PHP-Regeln (oben) übersteigen diese Node.js-Regeln**. Nach Migration: **Diese Regeln werden primär, PHP-Sektion wird gelöscht.**

---

## 0. Grundprinzipien (NICHT VERHANDELBAR)

1. Korrektheit > Geschwindigkeit > Eleganz. In dieser Reihenfolge.
2. Explizit > Implizit. Kein "Magic", keine versteckten Side-Effects.
3. Fail fast, fail loud. Fehler werden nie geschluckt, nie geloggt-und-ignoriert.
4. Keine Spekulation. Wenn du eine API, Library oder ein Verhalten nicht kennst → nachschlagen oder fragen. Nie raten.
5. Kein Code ohne Tests. Jede neue Funktion mit Geschäftslogik braucht mindestens einen Unit-Test.
6. Security ist nicht optional. Jede Eingabe von außen ist feindlich, bis das Gegenteil bewiesen ist.
7. Lies vor dem Schreiben. Bevor du eine Datei änderst, lies sie vollständig. Bevor du eine neue Funktion baust, prüfe, ob es schon eine gibt.

## 1. Projekt- & Architektur-Regeln

### 1.1 Runtime & Tooling

* Node.js LTS only. Niemals odd-numbered oder EOL-Versionen. Version pinnen via `.nvmrc` und `engines` in `package.json`.
* Package Manager: Ein einziger pro Projekt (npm, pnpm oder yarn). Lockfile (`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`) immer committen.
* TypeScript verpflichtend für jedes Projekt > 200 LOC oder mit mehr als einem Entwickler. `strict: true` in `tsconfig.json`, plus:
   * `noUncheckedIndexedAccess: true`
   * `noImplicitOverride: true`
   * `exactOptionalPropertyTypes: true`
   * `noFallthroughCasesInSwitch: true`
* ES Modules (`"type": "module"`) als Default. CommonJS nur in Legacy-Kontexten.
* Kein `any`. `unknown` + Type Guards verwenden. Wenn `any` unvermeidbar ist: Kommentar mit Begründung + `// eslint-disable-next-line` lokal.

### 1.2 Layering / Architektur

Strikt dreischichtig (oder Hexagonal/Clean, falls explizit gewählt):

```
src/
├── domain/          # Geschäftslogik, reine Funktionen, keine I/O
├── application/     # Use-Cases, orchestriert Domain + Infrastruktur
├── infrastructure/  # DB, HTTP-Clients, Filesystem, externe APIs
├── interfaces/      # HTTP-Routen, CLI, GraphQL-Resolver, Message-Consumer
└── shared/          # Cross-cutting: Logger, Config, Errors, Types

```

Regeln:

* `domain/` darf nichts importieren außer `shared/types`.
* `application/` darf nur aus `domain/` und `shared/` importieren.
* `interfaces/` darf nur `application/` aufrufen – nie direkt `infrastructure/` oder `domain/`.
* Zirkuläre Imports sind verboten. Bei Verdacht: `madge --circular` ausführen.

### 1.3 Dateien & Module

* Eine Verantwortung pro Datei. Wenn der Name mit "and" oder "utils" endet → falsch.
* Maximale Dateilänge: 300 Zeilen. Darüber → Refactoring Pflicht.
* Maximale Funktionslänge: 40 Zeilen. Darüber → in kleinere Funktionen aufteilen.
* Maximale zyklomatische Komplexität: 10 (via ESLint `complexity`).
* Maximale Parameteranzahl: 4. Mehr → in Options-Objekt zusammenfassen.

## 2. Code-Stil & Konventionen

### 2.1 Naming

* `camelCase` für Variablen und Funktionen.
* `PascalCase` für Klassen, Types, Interfaces, Enums.
* `SCREAMING_SNAKE_CASE` für Konstanten in der Modulebene.
* `kebab-case` für Dateinamen (`user-service.ts`, nicht `UserService.ts`).
* Keine Abkürzungen außer Industrie-Standard (`id`, `url`, `http`). `usr`, `cfg`, `mgr` → verboten.
* Boolean: Präfix `is`, `has`, `can`, `should`. Nie `flag`, `status`, `state` als Boolean.

### 2.2 Sprachgebrauch

* `const` ist Default. `let` nur wenn Reassignment nachweislich nötig. `var` ist verboten.
* Pfeilfunktionen für Callbacks. Klassische `function` nur bei benötigtem `this` oder Hoisting.
* Keine Klassen für reine Datencontainer. Stattdessen `type` oder `interface`. Klassen nur bei echtem Verhalten + State.
* Pure Functions bevorzugen. Side-Effects an die Ränder (Infrastructure-Layer).
* Immutability: `readonly` für Properties, `as const` für Literals, `Object.freeze()` für Konfig-Objekte.
* Kein `delete` auf Objekten. Neue Objekte konstruieren.

### 2.3 Async-Code

* `async/await` überall. Kein `.then()`-Chaining außer in genau einer Zeile.
* Jede `Promise` wird `await`ed oder explizit mit `.catch()` versehen. `floating-promises` ESLint-Regel aktivieren.
* Parallele Operationen mit `Promise.all` / `Promise.allSettled`. Sequenzielles `await` in Schleifen nur, wenn nötig (kommentieren!).
* Niemals `async` in `forEach`. Stattdessen `for...of` mit `await` oder `Promise.all(map(...))`.
* AbortController verwenden für alle abbruchfähigen Operationen (HTTP, DB-Queries, Timer).

### 2.4 Formatierung

* Prettier ist die einzige Quelle der Wahrheit für Formatierung. Keine Diskussion.
* ESLint für Linting. Empfohlener Stack: `@typescript-eslint/strict`, `eslint-plugin-security`, `eslint-plugin-promise`, `eslint-plugin-n` (Node), `eslint-plugin-unicorn`.
* Pre-commit Hook via `husky` + `lint-staged`. Kein Commit ohne grünen Lint.

## 3. Fehlerbehandlung

### 3.1 Regeln

* Kein `throw "string"`. Immer `Error`-Subklassen.
* Eigene Error-Klassen für Domain-Fehler, mit eindeutigem `code` und `cause`: 

```ts
export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

* `try/catch` nur dort, wo der Fehler behandelt werden kann. Sonst hochwerfen.
* Niemals leere Catch-Blöcke. Mindestens loggen mit Kontext. Wenn das Schlucken bewusst ist: Kommentar mit Begründung.
* `process.on('uncaughtException')` und `('unhandledRejection')` registrieren → loggen + kontrolliertes Shutdown.
* `Result`-Typen (z. B. `neverthrow`) für erwartbare Fehler in Domain-Code. Exceptions für unerwartbare.
* Stack-Traces niemals an Clients ausliefern in Produktion.

### 3.2 Validierung

* Alle externen Inputs validieren mit `zod`, `valibot` oder `typebox`. Keine manuellen `typeof`-Checks für komplexe Strukturen.
* Validierung am Eingangstor (HTTP-Handler, Message-Consumer, CLI-Argumente). Danach: vertrauenswürdige Types.
* Niemals `JSON.parse` ohne Schema-Validation danach.

## 4. Security (Pflichtprogramm)

### 4.1 Dependencies

* `npm audit` / `pnpm audit` bei jedem CI-Lauf. Build bricht bei `high`/`critical`.
* `npm ci` in CI, nie `npm install`.
* Dependabot/Renovate aktivieren. Updates wöchentlich reviewen.
* Keine ungeprüften Pakete. Vor `npm install` eines unbekannten Pakets: Downloads, Maintainer, letzter Commit, Issues prüfen. Verdächtig (Typosquatting, frische Pakete mit Postinstall-Scripts) → ablehnen.
* `ignore-scripts=true` in `.npmrc` erwägen, plus selektive Erlaubnis.
* `package-lock.json` committen. Niemals ohne Lockfile deployen.

### 4.2 Secrets

* Niemals Secrets im Code. Auch nicht in Tests, nicht in Kommentaren, nicht in Git-History.
* `.env` lokal, niemals committen. `.env.example` mit Dummy-Werten committen.
* In Produktion: Secrets aus Secret-Manager (Vault, AWS Secrets Manager, Doppler, etc.), nicht aus Env-Vars in Plain-Files.
* Bei versehentlichem Commit eines Secrets: Sofort rotieren, dann aus History entfernen (`git filter-repo`). Nicht nur löschen.
* Logs niemals Secrets enthalten. Tokens, Passwörter, API-Keys → durch Logger-Redaction filtern (`pino-redact`, `bunyan` mask).

### 4.3 Input & Output

* SQL: Ausschließlich parametrisierte Queries oder Query Builder (Prisma, Drizzle, Knex). Niemals String-Konkatenation.
* NoSQL Injection: Bei MongoDB & Co. Operatoren in User-Input filtern (`$where`, `$ne` etc.).
* Command Injection: Niemals `child_process.exec` mit User-Input. `execFile` mit Argument-Array verwenden.
* Path Traversal: Bei Datei-Operationen `path.resolve` + Whitelist-Verzeichnis prüfen. `..` nicht erlauben.
* SSRF: Bei ausgehenden HTTP-Requests mit User-URL: Hostname auflösen, Private-IP-Ranges blocken (`10.0.0.0/8`, `127.0.0.1`, `169.254.169.254` etc.).
* XSS: Bei Server-Side Rendering: Template-Engine mit Auto-Escaping (EJS mit `<%-` vermeiden, Handlebars Default).
* CSRF: Bei Cookie-basierten Sessions: SameSite=Strict + CSRF-Token.
* Rate Limiting: Auf alle öffentlichen Endpoints (`express-rate-limit`, `@fastify/rate-limit`). Anmeldung/Passwort-Reset strenger.

### 4.4 HTTP-Hardening

* `helmet` (oder Fastify-Äquivalent) immer aktiv. CSP individuell konfigurieren.
* CORS explizit konfigurieren, niemals `*` in Produktion mit Credentials.
* HTTPS only. HSTS-Header. `secure: true` für Cookies.
* Body-Size-Limits setzen (`express.json({ limit: '100kb' })`).
* `X-Powered-By` entfernen.

### 4.5 AuthN / AuthZ

* Passwörter: `argon2id` (bevorzugt) oder `bcrypt` mit cost ≥ 12. Niemals MD5/SHA-1/SHA-256 pur.
* JWTs: Nur wenn nötig. Access-Token kurzlebig (≤ 15 min), Refresh-Token rotierend + serverseitig invalidierbar.
* Sessions: Server-side Storage (Redis), HttpOnly + Secure + SameSite Cookies.
* Authorization auf jeder Route explizit prüfen. Niemals nur im Frontend. Default = deny.
* MFA für Admin-Accounts Pflicht.

## 5. Persistenz & I/O

### 5.1 Datenbank

* Migrations versioniert (Prisma Migrate, Drizzle Kit, Knex Migrations). Niemals Schema manuell ändern.
* Transaktionen für Multi-Step-Writes. Isolation Level bewusst wählen.
* Connection Pool konfigurieren. Pool-Größe an Datenbank-Limits anpassen.
* N+1-Queries sind ein Bug. Nutze `JOIN`, `IN`-Clauses, Dataloader.
* Indizes für alle Felder in `WHERE`, `ORDER BY`, `JOIN`. Migrations mit `EXPLAIN` validieren.
* Soft Deletes nur, wenn fachlich nötig. Sonst echtes Löschen.

### 5.2 Externe APIs

* Timeouts für jeden HTTP-Call. Default: 5 Sekunden. Niemals unendlich.
* Retries mit exponentiellem Backoff + Jitter. Maximale Versuche begrenzen.
* Circuit Breaker für kritische Abhängigkeiten (`opossum`).
* Idempotency-Keys bei nicht-idempotenten Operationen.
* HTTP-Client: `undici` (nativ), `got` oder `ky`. Nicht `axios` ohne triftigen Grund (Bundle-Size, veraltete Defaults).

### 5.3 Filesystem

* `fs/promises` verwenden, nicht Callbacks oder Sync-Methoden im Hot-Path.
* Streams für große Dateien. Niemals `readFile` für > 10 MB.
* Atomare Schreibvorgänge: Erst in temp-Datei schreiben, dann `rename`.

## 6. Logging, Monitoring & Observability

### 6.1 Logging

* Strukturiertes Logging (JSON) mit `pino` (bevorzugt) oder `winston`.
* Log-Level konsequent:
   * `error` – etwas ist kaputt, Mensch muss eingreifen.
   * `warn` – ungewöhnlich, aber selbst-heilend.
   * `info` – wichtige Geschäfts-Events (Login, Bestellung, Job-Start).
   * `debug` – Entwicklung.
* `console.log` ist verboten außer in CLI-Tools mit User-Output.
* Jeder Log-Eintrag mit `requestId` / `traceId` korreliert.
* Niemals PII, Passwörter, Tokens, vollständige Kreditkartennummern loggen.

### 6.2 Metrics & Tracing

* OpenTelemetry für Traces und Metrics. Auto-Instrumentation für HTTP, DB, Queues.
* Health-Endpoints: `/health/live` (Prozess lebt), `/health/ready` (kann Traffic annehmen).
* Graceful Shutdown auf `SIGTERM`: neue Requests ablehnen, laufende beenden, dann exit.

## 7. Testing

### 7.1 Pflicht

* Test-Runner: `vitest` (bevorzugt) oder `node:test`. Nicht Jest in neuen Projekten (langsamer, ESM-Probleme).
* Coverage-Ziele:
   * Domain-Layer: ≥ 90 %.
   * Application-Layer: ≥ 80 %.
   * Infrastructure: Integration-Tests, nicht Coverage-getrieben.
* Test-Pyramide: Viele Unit, einige Integration, wenige E2E.
* Test-Naming: `describe('UserService.createUser', () => { it('throws when email is duplicate', ...) })`.
* Arrange-Act-Assert Struktur. Keine Logik in Tests.

### 7.2 Regeln

* Keine `setTimeout` in Tests. Fake-Timer verwenden (`vi.useFakeTimers`).
* Keine echten HTTP-Calls. `msw` oder `nock` zum Mocken.
* Keine echten DBs in Unit-Tests. In Integration-Tests: Testcontainers oder in-memory.
* Snapshots nur für stabile, gut definierte Strukturen. Niemals für UI-Outputs.
* Flaky Tests sind kein Problem – sie sind ein Bug. Sofort fixen oder skippen mit Ticket.

## 8. Performance

* Premature Optimization ist verboten – aber Premature Pessimization auch (z. B. `JSON.parse(JSON.stringify(x))` als Clone).
* Benchmarks vor Optimierung. `mitata`, `tinybench`, oder `--cpu-prof`.
* Streams statt Buffers bei großen Datenmengen.
* Memory Leaks ernst nehmen. Bei Long-Running Services: Heap-Snapshots periodisch reviewen.
* CPU-bound Work in Worker Threads (`worker_threads`), nicht im Event Loop.
* Caching bewusst: Layer, TTL, Invalidation explizit dokumentieren.

## 9. Git & Workflow

* Commit Messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
* Branch Naming: `feat/<ticket>-<kurz>`, `fix/<ticket>-<kurz>`.
* Kleine Commits. Ein Commit = eine logische Änderung. Niemals "WIP" auf main.
* Pull Requests mit Beschreibung: Was, Warum, Wie getestet. Self-Review zuerst.
* Squash-Merge in main. Linear History.
* Niemals `--force` auf shared branches. `--force-with-lease` falls nötig.

## 10. Was Claude (oder andere KI-Assistenten) konkret tun und lassen müssen

### 10.1 IMMER

* Vor Codeänderung: Bestehende Struktur lesen, Konventionen erkennen, einhalten.
* Bei Unsicherheit: Fragen statt raten. Lieber eine Frage zu viel als ein Bug.
* Tests mitliefern für jede neue Logik.
* Migrations-Pfad bei Breaking Changes nennen.
* Sicherheitsrelevante Änderungen explizit markieren (`// SECURITY:` Kommentar) und im PR herausstellen.
* Bei externen Libraries: Aktuelle Doku konsultieren, nicht Trainingsdaten vertrauen.

### 10.2 NIEMALS

* Code "erfinden", der nicht existiert (Funktionen, Methoden, Options halluzinieren).
* Bestehenden Code löschen ohne klaren Grund.
* `eval`, `Function()`-Constructor mit User-Input, `vm`-Modul ohne Sandbox.
* `child_process.exec` mit konkateniertem User-Input.
* Dependencies hinzufügen, ohne den Bedarf zu rechtfertigen (Bundle-Size, Wartung).
* Secrets, Beispiel-Tokens oder API-Keys in Code-Beispiele schreiben (auch nicht "fake").
* Tests deaktivieren, um schnell grün zu werden.
* TODOs ohne Ticket-Referenz hinterlassen.
* Auf "geht schon" hoffen. Edge Cases werden ausgesprochen und behandelt.

### 10.3 Response-Format

Wenn Claude Code generiert, gilt:

1. Zuerst der Plan (kurz, in Bullet-Form).
2. Dann der Code.
3. Danach explizit nennen:
   * Welche Dateien geändert/erstellt wurden.
   * Welche Dependencies hinzukommen und warum.
   * Welche Tests fehlen oder anzupassen sind.
   * Welche offenen Fragen / Annahmen es gibt.

## 11. Eskalation

Wenn eine dieser Bedingungen eintritt → STOPP und kläre mit dem User:

* Eine Änderung würde mehr als 5 Dateien gleichzeitig anfassen.
* Eine Änderung würde ein öffentliches API/Interface brechen.
* Eine Änderung berührt Auth, Crypto, Payments, PII.
* Eine Dependency wird hinzugefügt, die > 100 transitive Dependencies mitbringt.
* Es gibt einen Konflikt zwischen User-Wunsch und einer Regel in diesem Dokument. Die Regel gewinnt im Default, der User kann sie überstimmen – aber nur explizit und dokumentiert.

---

**Ende des Dokuments.** Bei Zweifel: erst fragen, dann handeln.


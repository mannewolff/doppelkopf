# CLAUDE-nodejs.md — Node.js Backend Development

**Für:** Node.js Backend-Developer (nach PHP-Migration)  
**Status:** ⏳ Zukünftig  
**Länge:** ~650 Zeilen  
**Cross-Referenzen:** → [CLAUDE.md](CLAUDE.md), [CLAUDE-security.md](CLAUDE-security.md), [CLAUDE-workflow.md](CLAUDE-workflow.md)

---

## ⚠️ Status

```
Dieses Dokument definiert die ZUKÜNFTIGEN Standards für Node.js Backend.

AKTUELL: Backend ist noch PHP. Diese Sektion ist der Plan.
Folge heute: → CLAUDE-php.md

Nach PHP-Migration wird diese Sektion primär, und CLAUDE-php.md wird gelöscht.
```

---

## 🔥 Grundprinzipien (NICHT VERHANDELBAR)

1. **Korrektheit > Geschwindigkeit > Eleganz** — In dieser Reihenfolge
2. **Explizit > Implizit** — Kein "Magic", keine versteckten Side-Effects
3. **Fail fast, fail loud** — Fehler werden nie stumm geschluckt
4. **Keine Spekulation** — Wenn du ein Verhalten nicht kennst → nachschlagen, nicht raten
5. **Kein Code ohne Tests** — Jede neue Logik mit Geschäftslogik braucht mindestens einen Unit-Test
6. **Security ist nicht optional** — Jede externe Eingabe ist feindlich bis zum Gegenbeweis
7. **Lies vor dem Schreiben** — Ganztüre Datei lesen vor Änderung, Funktion prüfen vor Neubau

---

## 1️⃣ Projekt- & Architektur-Regeln

### Runtime & Tooling

- ✅ **Node.js LTS only** — Niemals odd-numbered oder EOL-Versionen
- ✅ **Version pinnen** via `.nvmrc` + `engines` in `package.json`
- ✅ **Ein Package Manager** pro Projekt (npm, pnpm oder yarn)
- ✅ **Lockfile IMMER committen** (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`)
- ✅ **TypeScript verpflichtend** für Projekte > 200 LOC oder mit mehreren Entwicklern
  - `strict: true` in `tsconfig.json`
  - Plus: `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`
- ✅ **ES Modules (`"type": "module"`)** als Default
- ❌ **Kein `any`** — `unknown` + Type Guards. Wenn unvermeidbar: Kommentar mit Begründung

### Architektur & Layering

Strikt dreischichtig:

```
src/
├── domain/          # Geschäftslogik, reine Funktionen, keine I/O
├── application/     # Use-Cases, orchestriert Domain + Infrastruktur
├── infrastructure/  # DB, HTTP-Clients, Filesystem, externe APIs
├── interfaces/      # HTTP-Routen, CLI, GraphQL, Message-Consumer
└── shared/          # Logger, Config, Errors, Types (Cross-Cutting)
```

**Regeln:**
- `domain/` darf nichts importieren außer `shared/types`
- `application/` darf nur aus `domain/` & `shared/` importieren
- `interfaces/` darf nur `application/` aufrufen (nie direkt `infrastructure/` oder `domain/`)
- **Zirkuläre Imports sind verboten** — Bei Verdacht: `madge --circular` ausführen

### Module & Dateien

- ✅ **Eine Verantwortung pro Datei** — Wenn Name "and" oder "utils" endet → falsch
- ✅ **Max. 300 Zeilen pro Datei** — Darüber → Refactoring Pflicht
- ✅ **Max. 40 Zeilen pro Funktion** — Darüber → aufteilen
- ✅ **Max. zyklomatische Komplexität: 10** (ESLint Rule)
- ✅ **Max. 4 Parameter pro Funktion** — Mehr → Options-Objekt

---

## 2️⃣ Code-Stil & Konventionen

### Naming

- **`camelCase`** für Variablen, Funktionen
- **`PascalCase`** für Klassen, Types, Interfaces, Enums
- **`SCREAMING_SNAKE_CASE`** für Modulebenen-Konstanten
- **`kebab-case`** für Dateinamen (`user-service.ts`, nicht `UserService.ts`)
- ❌ **Keine Abkürzungen** außer Industrie-Standard (`id`, `url`, `http`)
- ✅ **Boolean-Präfixe:** `is`, `has`, `can`, `should` (nicht `flag`, `status`)

### Sprachgebrauch

- ✅ **`const` ist Default** — `let` nur wenn Reassignment nötig — `var` ist verboten
- ✅ **Pfeilfunktionen für Callbacks** — Klassische `function` nur bei `this` oder Hoisting
- ✅ **Keine Klassen für Datencontainer** — Stattdessen `type` oder `interface`
- ✅ **Klassen nur bei echtem Verhalten + State**
- ✅ **Pure Functions bevorzugen** — Side-Effects an die Ränder (Infrastructure)
- ✅ **Immutability:** `readonly`, `as const`, `Object.freeze()` für Konfig
- ❌ **Kein `delete` auf Objekten** → Neue Objekte konstruieren

### Async Code

- ✅ **`async/await` überall** — Kein `.then()`-Chaining außer 1 Zeile
- ✅ **Jede `Promise` wird `await`ed oder `.catch()`d** — `floating-promises` ESLint Regel!
- ✅ **Parallele Ops:** `Promise.all` / `Promise.allSettled`
- ❌ **NIEMALS `async` in `forEach`** — Stattdessen `for...of` mit `await` oder `Promise.all(map(...))`
- ✅ **`AbortController`** für abbruchfähige Operationen (HTTP, DB, Timer)

### Formatierung & Linting

- ✅ **Prettier** — Einzige Quelle der Wahrheit für Format. Keine Diskussion.
- ✅ **ESLint** Stack:
  - `@typescript-eslint/strict`
  - `eslint-plugin-security`
  - `eslint-plugin-promise`
  - `eslint-plugin-n` (Node)
  - `eslint-plugin-unicorn`
- ✅ **Pre-commit Hook** via `husky` + `lint-staged` — Kein Commit ohne grünen Lint

---

## 3️⃣ Fehlerbehandlung

### Regeln

- ❌ **Kein `throw "string"`** — Immer `Error`-Subklassen
- ✅ **Eigene Error-Klassen** für Domain-Fehler mit Code + Cause
- ✅ **`try/catch` nur wo Fehler behandelt** werden — Sonst hochwerfen
- ❌ **Keine leeren `catch`-Blöcke** — Min. loggen + Kontext
- ✅ **`process.on('uncaughtException')` und `('unhandledRejection')`** registrieren → log + shutdown
- ✅ **`Result`-Typen** (neverthrow) für erwartbare Fehler in Domain-Code
- ❌ **Stack-Traces NICHT an Clients** in Produktion

### Validierung

- ✅ **Alle externen Inputs validieren** mit `zod`, `valibot` oder `typebox`
- ❌ **Keine manuellen `typeof`-Checks** für komplexe Strukturen
- ✅ **Validierung am Eingangstor** (HTTP-Handler, CLI, Consumer)
- ❌ **`JSON.parse` NIEMALS ohne Schema-Validation** danach

---

## 4️⃣ Security

→ **[CLAUDE-security.md](CLAUDE-security.md)** — Zentrale Security Reference

### Dependencies
- ✅ **`npm audit` bei jedem CI-Run** — Build bricht bei high/critical
- ✅ **`npm ci` in CI, niemals `npm install`**
- ✅ **Dependabot/Renovate aktivieren** — Wöchentlich reviewen
- ❌ **Keine ungeprüften Pakete** — Pre-Install Check: Maintainer, letzter Commit, Issues
- ✅ **`package-lock.json` committen** — Niemals ohne Lockfile

### Secrets
- ❌ **Niemals Secrets in Code** — Nicht in Tests, nicht in Comments, nicht in History
- ✅ **`.env` lokal**, niemals committen — `.env.example` mit Dummies
- ✅ **Production:** Secret Manager (Vault, AWS, Doppler) — nicht Plain Files
- ✅ **Versehentlicher Secret?** Sofort rotieren + History bereinigen (`git filter-repo`)
- ✅ **Logger redaction** (`pino-redact`, `bunyan` mask)

### Input & Output
- ✅ **SQL:** Parametrisierte Queries oder Query Builder (Prisma, Drizzle, Knex)
- ✅ **NoSQL:** Operatoren filtern (`$where`, `$ne`)
- ❌ **`child_process.exec` mit User-Input verboten** — `execFile` mit Array
- ✅ **Path Traversal:** `path.resolve` + Whitelist
- ✅ **SSRF:** Private-Ranges blocken (`10.0.0.0/8`, `127.0.0.1`, etc.)

### HTTP Hardening
- ✅ **`helmet` immer aktiv** — CSP individuell
- ✅ **CORS explizit** — Never `*` mit Credentials in Production
- ✅ **HTTPS only. HSTS-Header. `secure: true` Cookies.**
- ✅ **Body-Size-Limits setzen**
- ✅ **Rate Limiting** auf öffentliche Endpoints

### AuthN / AuthZ
- ✅ **Passwörter:** `argon2id` (bevorzugt) oder `bcrypt` cost ≥ 12
- ✅ **JWTs:** Access-Token kurz (≤ 15 min), Refresh rotierend + serverseitig invalidierbar
- ✅ **Sessions:** Server-side Redis, HttpOnly + Secure + SameSite Cookies
- ✅ **Authorization IMMER serverseitig prüfen** — Default = deny
- ✅ **MFA für Admin-Accounts Pflicht**

---

## 5️⃣ Persistenz & I/O

### Datenbank
- ✅ **Migrationen versioniert** (Prisma, Drizzle, Knex) — Niemals manuell
- ✅ **Transaktionen** für Multi-Step-Writes
- ✅ **Connection Pool** konfiguriert
- ❌ **N+1-Queries sind ein Bug** → JOIN, IN-Clauses
- ✅ **Indizes** für WHERE, ORDER BY, JOIN Felder
- ✅ **Soft Deletes** nur wenn fachlich nötig

### Externe APIs
- ✅ **Timeouts für ALLE HTTP-Calls** — Default 5 Sekunden
- ✅ **Retries mit exponentiellem Backoff + Jitter**
- ✅ **Circuit Breaker** für kritische Dependencies
- ✅ **Idempotency-Keys** bei nicht-idempotenten Ops
- ✅ **HTTP-Client:** `undici`, `got`, `ky` (nicht `axios` ohne Grund)

### Filesystem
- ✅ **`fs/promises`** — Nicht Callbacks
- ✅ **Streams** für große Dateien (> 10MB)
- ✅ **Atomare Writes:** Temp-Datei → `rename`

---

## 6️⃣ Logging & Observability

### Logging
- ✅ **Strukturiert JSON** mit `pino` oder `winston`
- ✅ **Log-Levels:** error (fix!), warn (self-healing), info (business), debug (dev)
- ❌ **`console.log` verboten** außer CLI-Tools
- ✅ **`requestId`/`traceId`** pro Log-Eintrag
- ❌ **Keine PII, Passwörter, Tokens, Kreditkarten** in Logs

### Health & Shutdown
- ✅ **Health-Endpoints:** `/health/live` (Prozess) + `/health/ready` (Traffic)
- ✅ **Graceful Shutdown:** `SIGTERM` → neue Requests ablehnen, alte beenden, exit

---

## 7️⃣ Testing

- ✅ **Test-Runner:** `vitest` (bevorzugt) oder `node:test`
- ✅ **Coverage-Ziele:**
  - Domain-Layer: ≥ 90%
  - Application-Layer: ≥ 80%
  - Infrastructure: Integration-Tests
- ✅ **Test-Pyramide:** Viele Unit, einige Integration, wenige E2E
- ✅ **Test-Naming:** `describe('UserService.createUser', () => { it('throws when email duplicate', ...) })`
- ✅ **Arrange-Act-Assert** Struktur
- ❌ **Keine `setTimeout`** in Tests — Fake-Timer (`vi.useFakeTimers`)
- ❌ **Keine echten HTTP-Calls** — `msw` oder `nock` mocken
- ❌ **Keine echten DBs** in Unit-Tests — Testcontainers oder in-memory in Integration-Tests

---

## 8️⃣ Performance

- ✅ **Benchmarks vor Optimierung** — `mitata`, `tinybench`, `--cpu-prof`
- ✅ **Streams** statt Buffers bei großen Datenmengen
- ✅ **Memory-Leaks ernst nehmen** — Heap-Snapshots periodisch
- ✅ **CPU-Work** in Worker Threads, nicht Event Loop
- ✅ **Caching bewusst:** Layer, TTL, Invalidation dokumentiert

---

## 9️⃣ Git & Workflow

- ✅ **Conventional Commits:** `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- ✅ **Branch Naming:** `feat/<ticket>-<kurz>`, `fix/<ticket>-<kurz>`
- ✅ **Kleine Commits** — Jeder = eine logische Änderung
- ✅ **PRs mit Beschreibung:** Was, Warum, Wie getestet
- ✅ **Squash-Merge** in main — Linear History
- ❌ **Niemals `--force`** auf shared Branches — `--force-with-lease` falls nötig

---

## 🔟 Was Claude (& KI-Assistenten) tun/lassen muss

→ Siehe [CLAUDE-code-guide.md](CLAUDE-code-guide.md)

---

## 1️⃣1️⃣ Eskalation

STOPP & kläre mit User wenn:

- Änderung betrifft > 5 Dateien
- Public API/Interface würde brechen
- Auth, Crypto, Payments, PII betroffen
- Dependency mit > 100 transitive Deps
- Regelkonflikt zwischen User-Wunsch und diesem Dokument

---

## 🔗 Weiterführende

- [CLAUDE-security.md](CLAUDE-security.md) — Security im Detail
- [CLAUDE.md](CLAUDE.md) — Überblick
- [CLAUDE-workflow.md](CLAUDE-workflow.md) — Prozesse

---

**Zusammengefasst:** Strikt typensicher, layered Architektur, reine Funktionen, zentrale Error-Handling, Security-first. Tests überall.

# CLAUDE-security.md — Security & Compliance

**Für:** Alle Entwickler (Frontend, Backend, KI-Assistenten)  
**Status:** ✅ Aktiv  
**Länge:** ~300 Zeilen  
**Cross-Referenzen:** → [CLAUDE-react.md](CLAUDE-react.md), [CLAUDE-php.md](CLAUDE-php.md), [CLAUDE-nodejs.md](CLAUDE-nodejs.md)

---

## 🔒 Sicherheits-Grundprinzipien (NICHT VERHANDELBAR)

1. **Jede externe Eingabe ist feindlich**, bis das Gegenteil bewiesen ist
2. **Fail fast, fail loud** — Fehler werden nie stumm geschluckt
3. **Defense in depth** — Mehrere Sicherheitsebenen, nicht nur eine
4. **Least Privilege** — Nur minimale Rechte für jede Komponente
5. **Secrets sind kritisch** — Niemals im Code, Git, Logs oder URLs

---

## 🔐 Frontend Security

### Secrets & Tokens
- ❌ **Keine Secrets im Frontend-Code**
- ❌ **Keine API Keys, Tokens, Passwörter hardcoded**
- ❌ **Keine Secrets in Umgebungsvariablen mit `VITE_` Präfix** (alle sind potenziell öffentlich!)
- ❌ **Keine sensiblen Daten in Local Storage, Session Storage, Logs oder URLs**

### Input & XSS
- ✅ **Nutzer-Input validieren** vor Rendering
- ❌ **`dangerouslySetInnerHTML` ist verboten** (außer beweislich sichere Daten + Begründung)
- ❌ **Nutzer-Input nie ungeprüft rendern** wenn HTML/Script-Kontext möglich
- ✅ **Framework auto-escaping verwenden** (React escapet standardmäßig)

### Autorisierung
- ❌ **Clientseitige Berechtigungschecks ersetzen NICHT serverseitige Autorisierung**
- ✅ **Nutzer-Berechtigungen IMMER im Backend prüfen**
- Backend-Rule: Default = Deny. Explizit zulassen nach Prüfung.

### Error Messages
- ❌ **Stack-Traces niemals an Nutzer zeigen**
- ❌ **Keine internen URLs, API-Endpunkte, Dateistrukturen preisgeben**
- ✅ **Generische Fehlermeldungen für Nutzer** ("Fehler aufgetreten")
- ✅ **Technische Details nur intern loggen**

---

## 🛡️ Backend Security (Generisch)

### Input Validation
- ✅ **ALLE externen Daten validieren** — Query-Parameter, JSON-Body, Headers, Datei-Uploads
- ✅ **Schema-basierte Validation verwenden** (zod, valibot, typebox)
- ❌ **Niemals Benutzereingaben direkt in Queries/Commands/Pfade konkatenieren**
- ✅ **Normalisieren & Whitelist verwenden** statt Blacklist

### Error Handling & Logging
- ❌ **Keine leeren `catch`-Blöcke**
- ❌ **Keine Secrets in Logs** (Passwörter, Tokens, API-Keys, DSNs, SQL-Queries)
- ✅ **Sensible Werte maskieren** wenn Logging nötig
- ✅ **Exception Details zentral mappen** auf generische HTTP-Responses

---

## 🐘 PHP-Backend Security

### Secrets & Konfiguration
- ❌ **Niemals Zugangsdaten, API-Keys, Tokens im PHP-Code hardcoded**
- ❌ **Niemals echte Secrets in Git, Snippets, Docs oder Beispielcode**
- ✅ **Lokal:** Secrets nur in nicht-versionierter `.env` oder System-Environment-Variablen
- ✅ **Produktion:** Secrets via Platform-Environment-Variablen oder Secret Manager (nicht Dateien im Webroot)
- ❌ **Produktions-Secrets NICHT in Dev/Test Umgebungen verwenden**

### Datenbankzugriff (CRITICAL)
- ✅ **Ausschließlich PDO oder gleichwertig sichere Abstraktion verwenden**
- ✅ **PDO konfigurieren:** `ERRMODE_EXCEPTION`, `FETCH_ASSOC`, `ATTR_EMULATE_PREPARES=false`, `charset=utf8mb4`
- ✅ **SQL IMMER mit Prepared Statements + gebundene Parameter ausführen**
- ❌ **NIEMALS Benutzereingaben in SQL-Strings konkatenieren**
- ✅ **Transaktionen** für zusammenhängende Schreibvorgänge

### Datenbank-Berechtigungen
- ✅ **DB-User hat NUR minimale notwendige Rechte**
- ❌ **NIEMALS `root` oder admin Accounts für Web-Apps verwenden**
- ✅ **Getrennte Credentials** für dev, test, staging, production
- ✅ **Pro Anwendung eigene Credentials** (falls möglich)

---

## 🟢 Node.js Backend Security

### Dependencies Management
- ✅ **`npm audit` bei jedem CI-Lauf. Build bricht bei high/critical.**
- ✅ **`npm ci` in CI/CD, niemals `npm install`**
- ✅ **Dependabot/Renovate aktivieren**, Updates wöchentlich reviewen
- ❌ **Keine ungeprüften Pakete** — vor `npm install`: Downloads, Maintainer, letzter Commit, Issues prüfen
- ✅ **`package-lock.json` committen.** Niemals ohne Lockfile deployen

### Secrets Handling
- ❌ **Niemals Secrets im Code. Nicht in Tests, nicht in Kommentaren, nicht in History.**
- ✅ **`.env` lokal, niemals committen. `.env.example` mit Dummy-Werten committen.**
- ✅ **Production:** Secrets aus Secret-Manager (Vault, AWS Secrets Manager, Doppler)
- ✅ **Versehentlicher Secret in Git?** Sofort rotieren + aus History entfernen (`git filter-repo`)
- ✅ **Logger: Secrets filtern** (`pino-redact`, `bunyan` mask)

### Input & Output Injection
- ✅ **SQL:** Nur parametrisierte Queries oder Query Builder (Prisma, Drizzle, Knex)
- ✅ **NoSQL:** Operatoren in User-Input filtern (`$where`, `$ne` etc.)
- ❌ **Command Injection:** NIEMALS `child_process.exec` mit User-Input. `execFile` mit Argument-Array verwenden.
- ✅ **Path Traversal:** `path.resolve` + Whitelist-Directory. `..` nicht erlauben.
- ✅ **SSRF:** Private-IP-Ranges blocken (`10.0.0.0/8`, `127.0.0.1`, `169.254.169.254`)

### HTTP Hardening
- ✅ **`helmet` (oder Fastify-Äquivalent) IMMER aktiv**
- ✅ **CORS explizit konfigurieren,** niemals `*` in Produktion mit Credentials
- ✅ **HTTPS only. HSTS-Header. `secure: true` für Cookies.**
- ✅ **Body-Size-Limits setzen** (`express.json({ limit: '100kb' })`)
- ✅ **`X-Powered-By` entfernen**
- ✅ **Rate Limiting** auf alle öffentlichen Endpoints, Anmeldung/Reset strenger

### AuthN / AuthZ
- ✅ **Passwörter:** `argon2id` (bevorzugt) oder `bcrypt` mit cost ≥ 12
- ❌ **Niemals MD5/SHA-1/SHA-256 pur für Passwörter**
- ✅ **JWTs:** Nur wenn nötig. Access-Token kurzlebig (≤ 15 min), Refresh-Token rotierend + serverseitig invalidierbar
- ✅ **Sessions:** Server-side Storage (Redis), HttpOnly + Secure + SameSite Cookies
- ✅ **Authorization explizit prüfen** auf jeder Route. Default = deny.
- ✅ **MFA für Admin-Accounts** Pflicht

---

## 🔍 Security Checklist (vor Commit)

- [ ] Keine `.env` oder Secrets in Git (`git status`)
- [ ] Keine `any`-Types ohne Begründung
- [ ] Input-Validation am Eingangstor (HTTP, CLI, externe Daten)
- [ ] Error-Messages generisch (keine internen Details)
- [ ] Logs enthalten keine Secrets
- [ ] Dependencies aktuell? (`npm audit`)
- [ ] SQL-Queries nutzen Prepared Statements
- [ ] Datenbankzugriff sicher konfiguriert
- [ ] Autorisierung serverseitig geprüft
- [ ] HTTPS, CORS, Rate-Limiting in Produktion

---

## 🚨 Rote Flaggen

Wenn diese Meldungen auftauchen → STOPP & eskaliere:

- **`eval`, `Function()`-Constructor** mit User-Input
- **`child_process.exec`** mit Variablen-Interpolation
- **`dangerouslySetInnerHTML`** ohne Sanitization
- **SQL-Query mit String-Konkatenation**
- **Secrets in Environment-Variablen** (VITE_API_KEY, etc.)
- **Leere `catch`-Blöcke**
- **Kein Timeout** bei HTTP-Calls
- **Unverschlüsselte Passwörter** in Logs/Responses
- **Implizite Autorisierung** ("nur Frontend prüft")

---

## 🔗 Weiterführende Docs

- [CLAUDE-react.md](CLAUDE-react.md) — Frontend-Security im Detail
- [CLAUDE-php.md](CLAUDE-php.md) — PHP-spezifische Sicherheit
- [CLAUDE-nodejs.md](CLAUDE-nodejs.md) — Node.js-spezifische Sicherheit
- [CLAUDE-workflow.md](CLAUDE-workflow.md) — Audit & Review Prozesse

---

**Grundregel:** Vertrau keinem externen Input. Validiere, sanitize, log sauber, teste Edge-Cases.

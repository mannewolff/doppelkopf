# CLAUDE-php.md — PHP Backend Development

**Für:** PHP Backend-Developer  
**Status:** ✅ Aktiv  
**Länge:** ~250 Zeilen  
**Cross-Referenzen:** → [CLAUDE.md](CLAUDE.md), [CLAUDE-security.md](CLAUDE-security.md) (wichtig!), [CLAUDE-workflow.md](CLAUDE-workflow.md)

---

## 🏛️ Zielbild

- Sauberer, gut testbarer PHP-Code mit klaren Verantwortlichkeiten
- Einfache, wartbare Lösungen statt "cleverer" oder magischer Code
- Kleine, nachvollziehbare Änderungen konsistent mit bestehenden Mustern

---

## 🏗️ Architektur

Trennung von HTTP-Layer, Anwendungslogik, Infrastruktur:

- **Controller:** Dünn. Request validieren → Service aufrufen → Response zurückgeben
- **Services/Use Cases:** Geschäftslogik gehört hier, nicht in Controller/Router/Views
- **Data Access:** Datenbankzugriffe kapseln, keine SQL-Logik in Controllern
- **Dependency Injection:** Verwenden statt statische Helfer oder globaler State
- **Klassen-Design:** Klein, fokussiert, eine klare Verantwortung

---

## 📝 Code-Stil

- ✅ **Moderne PHP-Syntax** passend zur Projekt-PHP-Version
- ✅ **PSR-12 Standard** + bestehende Projektkonventionen
- ✅ **`declare(strict_types=1);`** in PHP-Dateien (wenn Projekt unterstützt)
- ✅ **Typsichere Signaturen:** Parameter- & Rückgabetypen explizit
- ✅ **Value Objects, DTOs oder klar strukturierte Arrays** statt ungeklärte Mischstrukturen
- ✅ **Selbsterklärende Namen** — vermeide Abkürzungen außer etablierten Fachbegriffen

---

## 🔌 API-Design

- ✅ **Konsistent benannte Endpunkte** + sauber geschnittene Ressourcen
- ✅ **Einheitliches JSON-Response-Format** für Erfolg
- ✅ **Einheitliches JSON-Response-Format** für Fehler (mit Code/Message)
- ✅ **Passende HTTP-Status-Codes** (keine `200 OK` bei fachlichen Fehlern)
- ✅ **Validierung früh, verständliche Fehlermeldungen**
- ✅ **Idempotenz bei PUT/DELETE**
- ✅ **Saubere HTTP-Methoden-Semantik**

---

## 🔒 Sicherheit

**WICHTIG:** Lese [CLAUDE-security.md](CLAUDE-security.md) komplett!

### Input Validation
- ✅ **Alle externen Inputs validieren** (Query-Parameter, JSON-Body, Headers, Uploads)
- ✅ **Normalisiere & Whitelist** statt Blacklist
- ❌ **NIEMALS Benutzereingaben in SQL konkatenieren**

### Database Access
- ✅ **PDO oder gleichwertig sichere Abstraktion**
- ✅ **PDO-Konfiguration:** `ERRMODE_EXCEPTION`, `FETCH_ASSOC`, `ATTR_EMULATE_PREPARES=false`, `charset=utf8mb4`
- ✅ **Prepared Statements + gebundene Parameter IMMER**
- ✅ **Transaktionen** für zusammenhängende Schreibvorgänge
- ❌ **Keine persistenten Verbindungen** außer bewusst begründet

### Secrets & Configuration
→ **[CLAUDE-security.md — PHP-Backend Security](CLAUDE-security.md)**

- ✅ `.env` lokal, nicht committen
- ✅ `.env.example` mit Dummy-Werten committen
- ✅ Production: Environment-Variablen oder Secret Manager
- ❌ Niemals echte Secrets in Git

---

## ❌ Fehlerbehandlung

- ✅ **Fachlich sinnvolle Exceptions werfen**
- ✅ **Zentral mappen auf HTTP-Responses** (nicht pro Endpoint)
- ✅ **Logge technische Fehler**, gib Nutzer nur sichere Infos zurück
- ❌ **Keine leeren `catch`-Blöcke**
- ❌ **Keine Stack-Traces, Tokens, Passwörter in Responses/Logs**
- ✅ **Generische Error-Messages für Nutzer**

---

## 🗄️ Datenbank

- ✅ **Migrationen versioniert** (nicht manuell Schema ändern)
- ✅ **Lade-/Schemaänderungen vorsichtig & nachvollziehbar**
- ❌ **N+1-Queries sind ein Bug** → JOIN, IN-Clauses, Eager-Loading
- ✅ **Transaktionen** wo mehrere Änderungen atomar zusammengehören
- ✅ **Indizes** für WHERE, ORDER BY, JOIN Felder
- ✅ **Queries auf Lesbarkeit & Sicherheit** vor Mikro-Optimierungen

---

## 🧪 Tests

- ✅ **Neue Logik:** Unit- oder Integrationstests ergänzen
- ✅ **Teste Geschäftslogik** stärker als triviale Framework-Verdrahtung
- ✅ **API-Endpunkte:** Happy Path, Validierungsfehler, relevante Randfälle
- ✅ **Vor Abschluss:** Mit Projekt-Test-Checks verifizieren

---

## 🚀 Arbeitsweise für Claude

1. **Lese** bestehende Patterns im Projekt zuerst
2. **Plane** kurz, dann implementiere
3. **Nur notwendige Dateien** ändern — keine Refactorings "nebenbei"
4. **Bei Unklarheiten:** Explizite Annahmen machen (nicht stillschweigend raten)

---

## ❌ Zu vermeiden

- Business-Logik in Controllern
- Gemischte Verantwortlichkeiten in einer Klasse
- Stille Fallbacks, die Fehler verstecken
- "God Services", Utility-Sammelklassen, statische Helfer
- Implizite Seiteneffekte ohne klaren Grund

---

## 🔄 Pragmatismus & Skalierung

Für kleine APIs/Scripts darfst du strenge Architektur lockern:

- Kleine Endpunkte (< 50 Zeilen) brauchen keine DI/Service-Layer
- Starte einfach + typsicher; refaktoriere zu Layers nur wenn nötig
- **ABER:** Sicherheit, Types, zentrale Error-Handling sind **non-negotiable**
- Scale je nach Komplexität: 1 Datei → Module → Services → DI

---

## 🔗 Weiterführende Docs

- [CLAUDE-security.md](CLAUDE-security.md) — Security (PDO, Secrets, etc.)
- [CLAUDE.md](CLAUDE.md) — Überblick
- [CLAUDE-workflow.md](CLAUDE-workflow.md) — Workflow & Tests

---

**Zusammengefasst:** Saubere Architektur, typsicher, sauber validiert, zentrale Error-Handling. PDO Prepared Statements immer. Secrets aus Environment.

# Plan: CLAUDE.md in mehrere Dateien aufteilen

**Status:** Plan Mode  
**Datum:** 2026-05-16  
**Scope:** Umstrukturierung der großen monolithischen CLAUDE.md in spezialisierte, lesbare Dateien  

---

## Context

Die aktuelle `CLAUDE.md` ist 840 Zeilen lang und mischt:
- Allgemeine Projektstandards
- React/Frontend-spezifische Regeln (30% Inhalt)
- PHP-Backend-Regeln (20% Inhalt)
- Node.js Backend-Regeln (30% Inhalt, zukünftig)
- Security-Regeln (überall verstreut + dediziert)
- Workflows & Prozesse (Git, Worktree, Abschluss)

**Problem:** 
- Zu viel auf einmal lesen
- React-Developer braucht PHP-Infos nicht
- Security-Regeln sind redundant zwischen Sektionen
- Node.js Sektion ist "Zukünftig" und verwirrt aktuelle User

**Lösung:** Aufteilen in spezialisierte, fokussierte Dateien

---

## Zielstruktur

```
CLAUDE.md                          ← Index + Allgemeine Regeln (neu, kurz)
├── CLAUDE-security.md            ← Security & Compliance (zentral, alle lesen)
├── CLAUDE-react.md               ← React/Frontend-spezifisch
├── CLAUDE-php.md                 ← PHP-Backend-spezifisch
├── CLAUDE-nodejs.md              ← Node.js Backend (zukünftig, optional)
├── CLAUDE-workflow.md            ← Git, Deployment, Prozesse
└── CLAUDE-code-guide.md          ← Was Claude als KI tun/lassen muss
```

**Format:**
- Jede Datei standalone lesbar
- Querverweise wo relevant (`→ siehe CLAUDE-security.md`)
- Prioritätsregeln zentral in CLAUDE-security.md

---

## Aufteilung im Detail

### 1. **CLAUDE.md** (NEU - Index & Allgemein)
**Ziel:** Einstiegspunkt, schnelle Übersicht, 150-200 Zeilen

**Inhalt:**
- Kurze Projektbeschreibung
- Warum diese Struktur
- Inhaltsverzeichnis mit Links zu den SpezialDateien
- Projekt-Standard (nur übergreifend)
- Expecteduality Level (nur übergreifend)
- Content Management (bindend - Alle müssen das kennen!)
- Code-Stil Generisch (Naming, Funktionslängen, Kommentare)
- Dateistruktur & Dependencies (übergreifend)
- Prioritäten bei Zielkonflikten

**Weg:**
- Vite-Regeln → CLAUDE-react.md
- TypeScript (wird zu CLAUDE-react.md, NODE KOPIE)
- React-Komponenten → CLAUDE-react.md
- Hooks → CLAUDE-react.md
- State Management → CLAUDE-react.md
- Datenzugriff und APIs → CLAUDE-react.md
- Styling → CLAUDE-react.md
- Accessibility → CLAUDE-react.md
- Performance → CLAUDE-react.md
- Formulare → CLAUDE-routing
- Routing → CLAUDE-react.md
- Security (Frontend) → CLAUDE-security.md
- Tests → CLAUDE-react.md
- PHP-Sektion → CLAUDE-php.md
- Security-Regeln (PHP/DB) → CLAUDE-security.md
- Node.js → CLAUDE-nodejs.md (optional)
- Was Claude tun/lassen muss → CLAUDE-code-guide.md
- Git Workflow → CLAUDE-workflow.md
- Session/Worktree → CLAUDE-workflow.md
- Pflichtchecks → CLAUDE-workflow.md
- Abschlussbericht → CLAUDE-workflow.md
- Issue-Dokumentation → CLAUDE-workflow.md

---

### 2. **CLAUDE-security.md** (NEU - Zentrale Security & Compliance)
**Ziel:** One-stop Security Reference, 250-350 Zeilen

**Inhalt:**
- Security-Grundprinzipien (Top Priority List)
- **Frontend Security:**
  - Keine Secrets im Frontend
  - Tokens, API Keys, Passwörter
  - Sensible Daten nicht in Storage/Logs/URLs
  - dangerouslySetInnerHTML Verbot
  - Input Validation & XSS
  - Clientseitige Berechtigungschecks reichen nicht
  - Error Messages
  
- **Backend Security (Generisch):**
  - Input Validation
  - Error Handling
  
- **PHP-spezifisch:**
  - Secrets und Konfiguration
  - Datenbankzugriff (PDO, Prepared Statements)
  - Berechtigungen (DB-User)
  - Fehlerbehandlung und Logging
  - Deployment und Betrieb
  
- **Node.js-spezifisch:**
  - Dependencies Management
  - Secrets Handling
  - Input & Output Security
  - HTTP-Hardening
  - AuthN / AuthZ
  
- **Allgemein:**
  - Grundsätze Sicherheit
  - Best Practice Checklist
  - Red Flags

**Cross-referenzen:**
- "Mehr zum Datenbankzugriff → CLAUDE-php.md"
- "Node.js Auth → CLAUDE-nodejs.md"

---

### 3. **CLAUDE-react.md** (NEU - React/Vite/Frontend)
**Ziel:** Alles was React-Developer wissen muss, 400-500 Zeilen

**Inhalt:**
- Warum React-spezifisch
- TypeScript im Frontend (strict rules)
- Vite Regeln
- React Komponenten (klein, fokussiert)
- Hooks (Top-Level, useEffect sparsam)
- State Management (useState, useReducer, Context)
- Datenzugriff und APIs
- Styling (Dein System verwenden)
- Accessibility (a11y)
- Performance (Keys, Memoization)
- Formulare
- Routing
- Verbotene Muster (React-spezifisch)
- Tests (Vitest, RTL)
- Empfohlene Test-Werkzeuge
- Dateistruktur (Frontend)
- Dependencies (Frontend)

**Cross-referenzen:**
- "Security → CLAUDE-security.md"
- "Content Management → CLAUDE.md"
- "Git Workflow → CLAUDE-workflow.md"

---

### 4. **CLAUDE-php.md** (NEU - PHP/Backend)
**Ziel:** Alles für PHP-Developer, 200-300 Zeilen

**Inhalt:**
- Warum PHP-Sektion
- Zielbild (sauber, wartbar)
- Architektur (HTTP-Layer, Logik, Infrastruktur)
- Code-Stil (PSR-12, moderne PHP)
- API-Design
- Sicherheit (Input, Validierung, SQL)
  → *"Detaillierte Security → CLAUDE-security.md"*
- Fehlerbehandlung
- Datenbank (Migrationen, Queries, Transaktionen)
- Tests
- Arbeitsweise
- Was zu vermeiden ist
- Pragmatismus & Skalierung

**Cross-referenzen:**
- "Secrets Management → CLAUDE-security.md"
- "Datenbankzugriff im Detail → CLAUDE-security.md"

---

### 5. **CLAUDE-nodejs.md** (NEU - Node.js Backend, zukünftig)
**Ziel:** Blueprint für zukünftige Node.js Migration, 600+ Zeilen

**Inhalt:**
- AKTUELL: "Dieses Dokument ist zukünftig. PHP ist heute primär."
- Grundprinzipien (Korrektheit, Explizit, Fail-Fast)
- Projekt- & Architektur-Regeln (Layering)
- Code-Stil (Naming, Async/Await, Formatierung)
- Fehlerbehandlung & Validierung
- Security (Dependencies, Secrets, Input/Output)
  → *"Detaillierte Security → CLAUDE-security.md"*
- Persistenz & I/O
- Logging, Monitoring, Observability
- Testing
- Performance
- Git & Workflow
- Was KI tun/lassen muss (Node.js-spezifisch)
- Eskalation

**Status-Banner:**
```
⚠️ ZUKÜNFTIG: Diese Sektion wird aktuell nach PHP wird migriert. 
Folge heute CLAUDE-php.md. Diese Regeln sind der Plan für Node.js.
```

---

### 6. **CLAUDE-workflow.md** (NEU - Prozesse, Git, Deployment)
**Ziel:** Wie man arbeitet in diesem Projekt, 200-250 Zeilen

**Inhalt:**
- Überblick: 6-Phasen Workflow (Plan → Issue → GO → Impl → Summary → Push)
- Phase 1: Plan Mode
- Phase 2: Issue Formulierung
- Phase 3: GO – Auto-Mode
- Phase 4: Zusammenfassung
- Phase 5: Lokales Testen
- Phase 6: Push (strikt bindend)
- Git Workflow (strikt bindend)
  - Commit lokal
  - push main nur explicit
  - production nur via PR
  - Warnsignale
- Session- und Worktree-Strategie
- Pflichtchecks vor Abschluss (`npm run typecheck`, etc.)
- Abschlussbericht Format
- Issue-Dokumentation Format

**Cross-referenzen:**
- "Security Checks → CLAUDE-security.md"
- "Sprachspezifische Checks → CLAUDE-react.md, CLAUDE-php.md, etc."

---

### 7. **CLAUDE-code-guide.md** (NEU - Was KI-Assistenten tun/lassen)
**Ziel:** Meta-Regeln für Claude & AI-Assistenten, 100-150 Zeilen

**Inhalt:**
- IMMER:
  - Struktur lesen vor Ändern
  - Bei Unsicherheit fragen
  - Tests mitliefern
  - Migrations-Pfad nennen
  - Security-Änderungen markieren
  - Aktuelle Doku, nicht Trainingsdaten
  
- NIEMALS:
  - Code erfinden/halluzinieren
  - Code löschen ohne Grund
  - eval, Function, vm
  - child_process.exec mit Input
  - Dependencies ohne Begründung
  - Secrets in Beispiele
  - Tests skippen
  - TODOs ohne Ticket
  - "geht schon" hoffen

- Response-Format:
  - Plan → Code → Dateien & Dependencies & Tests & Fragen

- Eskalation:
  - > 5 Dateien
  - Public API Break
  - Auth/Crypto/Payments/PII
  - > 100 transitive Deps
  - Regelkonflikt

---

## Navigationsstruktur

Alle Dateien starten mit:

```markdown
# CLAUDE-[name].md

**Für:** [Zielgruppe]  
**Länge:** ~XXX Zeilen  
**Status:** [Aktiv / Zukünftig]  
**Cross-Referenzen:** → CLAUDE-security.md, CLAUDE-workflow.md, etc.

---

[Inhaltsverzeichnis Kurz]

[Inhalte...]
```

**Root CLAUDE.md enthält:**

```markdown
# CLAUDE.md — Projektstandards Doppelkopf

Willkommen! Dieses Dokument ist in spezialisierte Guides aufgeteilt:

## Schnelleinstieg
- **Neu im Projekt?** → Lese zuerst CLAUDE.md (diese Datei)
- **React arbeiten?** → CLAUDE-react.md
- **PHP arbeiten?** → CLAUDE-php.md
- **Secure Code?** → CLAUDE-security.md
- **Deployment/Workflow?** → CLAUDE-workflow.md

## Alle Guides
| Guide | Für | Größe |
|-------|-----|-------|
| CLAUDE.md | Überblick + Allgemein | 150-200 ZL |
| CLAUDE-security.md | Security & Compliance | 250-350 ZL |
| CLAUDE-react.md | React/Frontend Dev | 400-500 ZL |
| CLAUDE-php.md | PHP Backend Dev | 200-300 ZL |
| CLAUDE-nodejs.md | Node.js Backend (zukünftig) | 600+ ZL |
| CLAUDE-workflow.md | Prozesse & Git | 200-250 ZL |
| CLAUDE-code-guide.md | KI-Assistenten | 100-150 ZL |

[... Inhalte CLAUDE.md ...]
```

---

## Dateien zu erstellen

| Datei | Neue Zeilen | Quelle |
|-------|-----------|--------|
| CLAUDE.md (NEU) | 150-200 | Aus aktuellem CLAUDE.md selektiv |
| CLAUDE-security.md | 250-350 | Aus "Security" + "Security-Regeln PHP" + Node.js Security |
| CLAUDE-react.md | 400-500 | Aus Vite, TypeScript, React, Hooks, State, API, Styling, a11y, Perf, Forms, Routing, Tests |
| CLAUDE-php.md | 200-300 | Aus "PHP API / Backend" + Security-PHP-Teile |
| CLAUDE-nodejs.md | 600+ | Aus "Node.js Backend (Zukünftig)" |
| CLAUDE-workflow.md | 200-250 | Aus Git Workflow, Session-Worktree, Pflichtchecks, Abschluss, Issue-Doku, Prioritäten |
| CLAUDE-code-guide.md | 100-150 | Aus "Was Claude tun/lassen muss" + Eskalation |

**Alte Dateien:**
- Aktuelle `CLAUDE.md` → Archive als `CLAUDE-BACKUP.md` (falls nötig)

---

## Testing & Verifikation

### Akzeptanzkriterien
- ✅ Alle 7 Dateien erstellt
- ✅ Querverweise konsistent (→ Link prüfen)
- ✅ Keine duplizierte Regeln zwischen Dateien (nur absichtliche)
- ✅ Jede Datei <= 600 Zeilen (lesbar)
- ✅ Inhaltsverzeichnisse funktionieren
- ✅ Navigation im Root CLAUDE.md klar
- ✅ Zukünftige Node.js Sektion klar als "optional" markiert
- ✅ `CLAUDE.md` selbst nicht größer als 200 Zeilen

### Lesbarkeits-Check
- [ ] Root CLAUDE.md in < 10 Min lesbar
- [ ] CLAUDE-react.md in < 20 Min lesbar
- [ ] CLAUDE-php.md in < 15 Min lesbar
- [ ] CLAUDE-security.md in < 20 Min lesbar
- [ ] Navigation intuiv (kein "wo finde ich X?")

---

## Nächste Schritte nach Plan-Genehmigung

1. **Phase 3:** Alle 7 Dateien neu schreiben (kopiert + organisiert)
2. **Phase 4:** Links prüfen, Querverweise testen
3. **Phase 5:** Lokale Review (alle Dateien lesen durcheinander)
4. **Phase 6:** 1 Commit mit allen 7 Dateien
5. **Phase 7:** User testet Navigation + Lesbarkeit
6. **Phase 8:** Optional: Markdownify / HTML Docs

---

## Offene Fragen

1. **Wo liegt die alte CLAUDE.md?** Archive als `CLAUDE-BACKUP.md` im gleichen Verzeichnis?
2. **Node.js Sektion:** Soll sie in diesem Refactoring dabei sein oder nur die 6 aktiven Dateien?
3. **GitHub Gist/Wiki?** Später als HTML/Wiki exportieren, oder nur als `.md` Dateien im Repo?
4. **Versionierung:** Die großen Dateien in Zukunft als "CLAUDE-[name]-v2.md" versionieren, oder immer überschreiben?

---

**Plan fertig.** Bereit für dein GO zur Implementierung nächste Woche!

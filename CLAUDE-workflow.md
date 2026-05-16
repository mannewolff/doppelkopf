# CLAUDE-workflow.md — Workflow, Prozesse & Git

**Für:** Alle (Workflow & Prozesse)  
**Status:** ✅ Aktiv  
**Länge:** ~250 Zeilen  
**Cross-Referenzen:** → [CLAUDE.md](CLAUDE.md), [CLAUDE-security.md](CLAUDE-security.md), [CLAUDE-code-guide.md](CLAUDE-code-guide.md)

---

## 🔄 Mandatorischer Workflow für größere Tasks

Dieses Projekt folgt einem standardisierten 6-Schritte-Workflow:

### **Phase 1: Plan Mode** (Claude)
- Claude **exploriert** Codebase, Struktur, Anforderungen
- Claude erstellt **detaillierten Plan** (`.claude/plans/*.md`)
- **NUR READ-ONLY Operationen** — Keine Implementierung!

### **Phase 2: Issue Formulierung** (Claude)
- Claude formuliert **klares GitLab Issue** basierend auf Plan
- Issue enthält: Beschreibung, Anforderungen, Implementierungsschritte, Akzeptanzkriterien
- Issue wird **User zur Genehmigung** vorgelegt

### **Phase 3: GO – Auto-Mode** (Claude)
- **Nur nach explizitem "GO"** vom User startet Claude die Implementierung
- Claude implementiert nach Plan, **macht lokale Commits**
- Full-Stack: Code, Tests, Verifikation
- **Keine Push zu Origin**, keine PR-Erstellung

### **Phase 4: Zusammenfassung** (Claude)
- Nach Implementierung: **GitLab-taugliche Zusammenfassung**
- Format: Markdown, strukturiert, ready für Issue-Kommentar
- Enthält: Was getan, wie getestet, Dateien, Commits

### **Phase 5: Lokales Testen** (User)
- User testet lokal: `npm run dev`, `npm run build`, `npm run test`
- Bei OK: Weiter zu Phase 6 oder weitere Requests

### **Phase 6: Git Push** (User)
- **Nur auf explizites "push main"** vom User!
- Prüfung: `git status`, `git log -1` verifizieren
- **Regel:** `production` wird NIEMALS direkt gepusht (nur via PR)
- Nach Push: User erstellt selbst PR `main` → `production`

---

## 🔒 Git Workflow (STRIKT BINDEND)

### Das Ziel
Lokale Kontrolle vor jedem Push. Production nur über Pull Request.

### Die 6 Schritte
1. **Commit lokal** — Claude erstellt Commits, pusht NICHT automatisch
2. **Du testest lokal** — `npm run dev`, Änderungen validieren
3. **"push main"** — Nur auf deine explizite Anweisung pushe ich zu main
4. **Du testest auf Testserver** — Verifikation vor Production
5. **Du machst PR** — main → production (du erstellst + reviewst selbst)
6. **Du deployst** — Via Railway UI oder `railway deploy`

### Absolut Bindend
- ❌ **`production` Branch wird NIEMALS direkt gepusht** — Egal von wem
- ✅ **Alle Änderungen gehen über Pull Request** auf production
- ✅ **Ich committe lokal auch bei großen Änderungen** — Es sei denn du sagst "push main"
- ⚠️ **Wenn du "push" oder "push jetzt" sagst:** Ich frage immer nach, ob du **main** oder **production** meinst (Standard: nur main)

### Warnsignale (ich ignoriere diese NICHT mehr)
- Fehlgeschlagene Branch Protection Rules
- "Bypassed rule violations" Meldungen
- Deine expliziten "bitte nicht pushen" Anweisungen

---

## 📂 Session- & Worktree-Strategie

**Für kleine Websites mit kontinuierlicher Arbeit:**

- ✅ **Kontinuierliche, zusammenhängende Tasks** (Content-Updates, kleine Fixes, Feature-Ergänzungen)  
  → **Gleicher Worktree beibehalten**
  
- ✅ **Vollständig neue Features oder große strukturelle Änderungen**  
  → **Neue Session + neuer Worktree**

**Faustregel:** Solange die Arbeiten inhaltlich zusammenhängen, bleibt man in der gleichen Session. Das vereinfacht den Workflow und reduziert Overhead.

---

## ✅ Pflichtchecks vor Abschluss

Führe, soweit verfügbar, diese Checks aus:

```bash
npm run typecheck   # TypeScript Typ-Prüfung
npm run lint        # ESLint, Prettier
npm run test        # Unit Tests
npm run build       # Production Build
```

**Wenn ein Check nicht existiert/nicht ausführbar:** Erklär das in der Abschlussnotiz.

---

## 📋 Abschlussbericht Format

Nach jeder abgeschlossenen Änderung:

```
## Änderungen
- Datei 1: Was geändert
- Datei 2: Was hinzugefügt
- etc.

## Tests und Checks
- npm run typecheck: ✅ Passing
- npm run lint: ✅ Clean
- npm run test: ✅ 95% Coverage
- npm run build: ✅ No Errors

## Hinweise
- Abhängigkeiten: Keine neuen hinzugefügt
- Breaking Changes: Keine
- Risiken: Minimal (Refactoring ist lokal auf useGameWebSocket)
- Nächste Schritte: User testet lokal, dann "push main"
```

**Konkret sein:** Nenne Dateien, Entscheidungen, Befehle, Risiken.

---

## 📄 Issue-Dokumentation Format

Nach Abschluss jedes Tasks/Issues stelle **Markdown-Dokumentation** bereit:

```markdown
# [Titel des Issues]

## Beschreibung
[Kurze Task-Zusammenfassung]

## Anforderung
[Was war zu tun]

## Implementierung

### Dateien geändert
- `file1.ts` — Was gemacht
- `file2.tsx` — Was hinzugefügt

### Änderungen
[Details der Implementierung, Begründung von Entscheidungen]

## Verifikation
- ✅ Check 1
- ✅ Check 2
- ✅ Check 3

## Commit
```
feat(feature): Kurze Beschreibung

- Details Punkt 1
- Details Punkt 2

Fixes #<Issue-Nr>
```

## Checkliste
- [x] Anforderung 1
- [x] Anforderung 2
```

Diese Dokumentation wird permanente Referenz für abgeschlossene Arbeiten.

---

## ⚠️ Prioritäten bei Zielkonflikten

Wenn Anforderungen kollidieren, gilt diese Reihenfolge:

1. **Sicherheit** (Keine Kompromisse)
2. **Korrektheit** (Funktioniert)
3. **Datenintegrität** (Keine Verluste)
4. **Accessibility** (Für alle nutzbar)
5. **Wartbarkeit** (Lesbar & änderbar)
6. **Performance** (Schnell genug)
7. **Visuelle Präferenz** (Nice-to-have)
8. **Bequemlichkeit der Implementierung** (Egal)

**Goldene Regel:** Keine kurzfristige Bequemlichkeit rechtfertigt unsicheren, untypisierten oder schwer wartbaren Code.

---

## 🧪 Test & Quality Standards

### Unit Tests
- ✅ **Alle neuen/geänderten Logik-Funktionen** brauchen Tests
- ✅ **Teste Verhalten, nicht Implementierungsdetails**
- ✅ **Nutzer-Perspektive:** Labels, sichtbarer Text, Interaktionen
- ✅ **Kritische Zustände:** Loading, Error, Empty, Success, Disabled
- ✅ **Utilities, Hooks, Logik:** Unit Tests
- ❌ **Keine fragilen Snapshot-Tests**
- ✅ **Mocks:** Realistisch, klein, nachvollziehbar

### Coverage
- ✅ **Domain-Layer:** ≥ 90%
- ✅ **Application-Layer:** ≥ 80%
- ✅ **Infrastructure:** Integration-Tests (nicht Coverage-getrieben)

### Wenn KEINE Tests
- ✅ **Grund nennen** ("UI-Test nur manuell möglich, siehe Anleitung:")
- ✅ **Manuelle Prüf-Anweisung geben** konkret beschreiben
- Beispiel:
  ```
  Manuelle Verifikation:
  1. npm run dev
  2. Browser: http://localhost:5174
  3. Navigiere zu /game
  4. Starte neues Spiel, prüfe ob Karten sichtbar sind ✅
  ```

---

## 🔐 Security Checks vor Merge

- [ ] Kein `.env` in Commits
- [ ] Keine Secrets in Code/Tests/Logs
- [ ] Alle Inputs validiert
- [ ] Error-Messages generisch
- [ ] Dependencies aktuell (`npm audit`)
- [ ] Keine `any`-Types ohne Begründung

---

## 🔗 Weiterführende

- [CLAUDE.md](CLAUDE.md) — Überblick & Projektstandard
- [CLAUDE-security.md](CLAUDE-security.md) — Security-Checkliste
- [CLAUDE-code-guide.md](CLAUDE-code-guide.md) — Was Claude tun/lassen muss

---

**TL;DR:** Plan → Issue → GO → Impl → Summary → Test → Commit Lokal → "push main" explicit → PR → Deploy.

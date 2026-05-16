# CLAUDE.md — Projektstandards Doppelkopf

**Willkommen!** Dieses Projekt hat hohe Engineering-Standards. Um sie lesbar zu halten, sind die Regeln in spezialisierte Guides aufgeteilt.

---

## 🎯 Schnelleinstieg

- **Neu im Projekt?** Lies diese Datei + CLAUDE-workflow.md
- **React arbeiten?** → [CLAUDE-react.md](CLAUDE-react.md)
- **PHP arbeiten?** → [CLAUDE-php.md](CLAUDE-php.md)
- **Security fragen?** → [CLAUDE-security.md](CLAUDE-security.md) (zentral, alle lesen)
- **Workflow/Git/Deploy?** → [CLAUDE-workflow.md](CLAUDE-workflow.md)
- **KI-Assistent?** → [CLAUDE-code-guide.md](CLAUDE-code-guide.md)

---

## 📚 Alle Guides

| Guide | Für | Größe | Status |
|-------|-----|-------|--------|
| **CLAUDE.md** (diese Datei) | Überblick + Allgemein | ~200 ZL | ✅ Aktiv |
| [CLAUDE-security.md](CLAUDE-security.md) | Security & Compliance (zentral!) | ~300 ZL | ✅ Aktiv |
| [CLAUDE-react.md](CLAUDE-react.md) | React/Vite/Frontend-Dev | ~450 ZL | ✅ Aktiv |
| [CLAUDE-php.md](CLAUDE-php.md) | PHP Backend-Dev | ~250 ZL | ✅ Aktiv |
| [CLAUDE-nodejs.md](CLAUDE-nodejs.md) | Node.js Backend | ~650 ZL | ⏳ Zukünftig (nach PHP-Migration) |
| [CLAUDE-workflow.md](CLAUDE-workflow.md) | Prozesse, Git, Deployment | ~250 ZL | ✅ Aktiv |
| [CLAUDE-code-guide.md](CLAUDE-code-guide.md) | Was KI-Assistenten tun/lassen | ~150 ZL | ✅ Aktiv |

---

## 🏗️ Projektstandard

- Dieses Projekt verwendet **React**, **Vite**, **TypeScript** (Frontend) und **PHP** (Backend).
- Schreibe ausschließlich moderne funktionale React-Komponenten.
- Verwende TypeScript **strikt**. Kein `any`, keine ungeprüften Type Assertions.
- Folge bestehenden Projektmustern. Erfinde keine zweite Architektur neben der vorhandenen.
- Ändere nur Dateien, die für die Aufgabe erforderlich sind.
- Keine Demo-Abkürzungen, keine Platzhalterlogik, keine TODOs im Produktivcode.
- **Wenn eine Anforderung fachlich, technisch oder sicherheitsrelevant unklar ist → frage nach.**

---

## ⭐ Erwartete Qualitätsstufe

Jede Änderung muss so geschrieben sein, als würde sie direkt in Produktion gehen.

- Code ist klein, klar und explizit.
- Komponenten/Funktionen haben eindeutige Verantwortungen.
- Fehlerzustände sind behandelt.
- Loading-, Empty-, Disabled-, Success-Zustände berücksichtigt (wenn relevant).
- Kritische Logik ist getestet.
- Build, Typecheck, Linting bleiben grün.
- **Keine Secrets, Tokens, API Keys oder internen Details im Frontend/Code.**

---

## 📝 Content Management (bindend)

**Alle textuellen Inhalte gehören in JSON-Dateien, NICHT in Komponenten-Code.**

- Seitentexte, Labels, Beschreibungen → `src/content/*.json`
- Komponenten laden Daten: `import data from "@/content/...json"`
- So kann der Nutzer Texte später ändern, ohne Code anzufassen
- Vorhandene Struktur: `pages.json`, `services.json`, `about.json`, `contact.json`, `faq.json`, `links.json`, `imprint.json`

**Falsch:**
```tsx
<p>Diese Website wurde mit Claude Code entwickelt</p> // ❌
```

**Richtig:**
```tsx
import content from "@/content/imprint.json"
<p>{content.development.text}</p> // ✅
```

---

## 🔤 Code-Stil (Generisch)

- **Funktionslänge:** Max. 40 Zeilen. Darüber → aufteilen.
- **Dateilänge:** Max. 300 Zeilen. Darüber → Module/Refactoring.
- **Naming:** 
  - `camelCase` für Variablen/Funktionen
  - `PascalCase` für Klassen/Types/Interfaces
  - `kebab-case` für Dateinamen
  - Keine Abkürzungen außer Standard (`id`, `url`, `http`)
- **Kommentare:** Erklären das **Warum**, nicht das Offensichtliche.
- **Frühe Rückgaben:** Bevorzugte Struktur statt tiefer Verschachtelung.
- **Magische Werte:** Nie. Nutze benannte Konstanten.
- **Entfernen:** Debug-Code, ungenutzte Imports, tote Pfade.

---

## 📂 Dateistruktur

Folge der bestehenden Struktur:

- Feature-spezifische Komponenten, Hooks, Tests & Typen bleiben im Feature
- Wiederverwendbare UI-Bausteine → Shared-/Components-Bereich
- Generische Utilities nur wenn wirklich allgemein nutzbar
- Vermeide unscharfe Dateien wie `utils.ts` (besser: `string-helpers.ts`)
- Barrel Exports nur wenn Projekt üblich + keine Zyklen

---

## 📦 Dependencies

- **Keine neue Dependency ohne klaren technischen Grund.**
- Prüfe zuerst: Reichen React, Browser APIs, vorhandene Libraries?
- Neue Dependency muss sein: aktiv gepflegt, verbreitet, passend zum Projekt
- Keine großen Libraries für kleine Hilfsfunktionen
- Keine zweite Library für ein Problem, das bereits gelöst ist

---

## ⚠️ Prioritäten bei Zielkonflikten

Wenn Anforderungen kollidieren, gilt diese Reihenfolge:

1. **Sicherheit** (Keine Kompromisse)
2. **Korrektheit** (Funktioniert nicht = Problem)
3. **Datenintegrität** (Keine Datenverluste)
4. **Accessibility** (Für alle nutzbar)
5. **Wartbarkeit** (Lange zu lesen ist schlecht)
6. **Performance** (Zählt, aber Sicherheit > Perf)
7. **Visuelle Präferenz** (Nice-to-have)
8. **Bequemlichkeit der Implementierung** (Für wen? Nicht wichtig)

**Keine kurzfristige Bequemlichkeit rechtfertigt unsicheren, untypisierten oder schwer wartbaren Code.**

---

## 🚀 Nächste Schritte

- **React Dev?** Lese [CLAUDE-react.md](CLAUDE-react.md) komplett
- **PHP Dev?** Lese [CLAUDE-php.md](CLAUDE-php.md) komplett
- **Security?** Lese [CLAUDE-security.md](CLAUDE-security.md) (zentral, alle!)
- **Arbeitsweise?** Lese [CLAUDE-workflow.md](CLAUDE-workflow.md)
- **Fragen?** → Frag lieber einmal zu viel als zu wenig

---

**Faustregel:** 
> Lies die relevanten Guides, frag bei Unklarheiten, implementiere typisiert & sauber, teste, commit lokal. Auf "push main" oder "GO" warten.

---

**Bei Zweifel:** Siehe [CLAUDE-security.md](CLAUDE-security.md) oder [CLAUDE-workflow.md](CLAUDE-workflow.md).

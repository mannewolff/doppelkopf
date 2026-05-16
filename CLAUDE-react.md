# CLAUDE-react.md — React/Vite/Frontend Development

**Für:** React und Frontend-Developer  
**Status:** ✅ Aktiv  
**Länge:** ~450 Zeilen  
**Cross-Referenzen:** → [CLAUDE.md](CLAUDE.md), [CLAUDE-security.md](CLAUDE-security.md), [CLAUDE-workflow.md](CLAUDE-workflow.md)

---

## 🏗️ Frontend Stack

- **React 19** (funktionale Komponenten nur)
- **Vite** (Bundler, nicht CRA)
- **TypeScript** (strict: true, Kein `any`)
- **CSS/Styling** (Projekt-bestehendes System)

---

## 📘 TypeScript im Frontend

- ✅ **`any` ist VERBOTEN** außer zwingende Gründe mit Kommentar
- ✅ **`unknown` verwenden** wenn externe Daten zunächst unbekannt
- ✅ **Präzise Types statt loser Strings/Objekte**
- ✅ **Union Types & discriminated unions** für fachliche Varianten
- ❌ **`as` zur Umgehung von Type-Errors verhindern** → Fix das Datenmodell stattdessen
- ✅ **`satisfies` verwenden** zur präzisen Objektform-Prüfung
- ❌ **Non-null Assertion `!` vermeiden** außer lokal offensichtlich sicher
- ✅ **Props explizit typisieren**
- ✅ **API-Responses an der Systemgrenze typisieren** + auf interne Modelle mappen

---

## 🔧 Vite Regeln

- ✅ **`import.meta.env` für Umgebungsvariablen**
- ✅ **Client-Variablen MÜSSEN mit `VITE_` beginnen**
- ❌ **NIEMALS Secrets in `VITE_` Variablen** (alles ist potenziell öffentlich!)
- ✅ **Absolute/konfigurierte Aliase nur wenn bereits im Projekt eingerichtet**
- ⚠️ **`vite.config.ts` nur ändern wenn wirklich nötig**
- ❌ **Neue Vite-Plugins nur wenn klarer Nutzen + keine bestehende Lösung**
- ✅ **Dynamische Imports:** Sinnvolle Chunk-Grenzen, nicht willkürlich fragmentieren

---

## ⚛️ React Komponenten

### Größe & Struktur
- ✅ **Komponenten klein, fokussiert, sinnvoll benannt**
- ✅ **Eine Komponente = eine Verantwortung**
- ❌ **Große JSX-Blöcke → extrahieren**
- ❌ **Verschachtelte Bedingungen → extrahieren**
- ❌ **Komplexe Listenlogik → extrahieren**

### Props
- ✅ **Props minimal, eindeutig, stabil**
- ❌ **Nicht: Mehrere Boolean-Props, unklar kombinierbar**
- ✅ **Stattdessen: Union Types für Varianten**
- ✅ **`children` verwenden** wenn Komposition dadurch flexibler wird

### Code Organisation
- ❌ **Business-Logik nicht tief in JSX** → eigene Funktionen
- ❌ **Datenzugriff nicht in reine Präsentationskomponenten**
- ✅ **Semantisches HTML** als Grundlage jeder Komponente
- ✅ **Accessibility** von Anfang an (Labels, Roles, Navigation)

---

## 🪝 Hooks (Regeln & Patterns)

### Grundregeln
- ✅ **Hooks NUR auf Top-Level verwenden** (nicht in Schleifen, Bedingungen, nested Funktionen)
- ✅ **Eigene Hooks mit `use` Prefix** und klarer abgegrenzter Verantwortung
- ❌ **`useEffect` ist NICHT zur Datenableitung** → State manuell updaten wenn nötig
- ✅ **`useEffect` nur für echte Seiteneffekte:** externe Systeme, Subscriptions, Timer, DOM, Netzwerk

### useEffect Best Practices
- ✅ **Dependency Array MUSS vollständig sein**
- ✅ **Linting-Rules für Hooks nicht umgehen**
- ✅ **Asynchrone Effekte:** Race-Conditions vermeiden (AbortController, isMounted checks)
- ✅ **Cleanups:** Subscriptions, Timer, Event-Listener aufräumen
- ❌ **Abgeleiteter State nicht in `useState`** wenn aus vorhandenen Werten berechenbar

---

## 🎛️ State Management

- ✅ **Lokaler UI-State bleibt lokal** (`useState` in der Komponente)
- ✅ **`useState` für einfache lokale Zustände**
- ✅ **`useReducer` wenn Zustandsübergänge zusammengehören oder komplex**
- ✅ **Globaler State NUR wenn mehrere entfernte Bereiche dieselbe Quelle der Wahrheit brauchen**
- ❌ **Server-State ist kein UI-State** → Nutze Projekt-Pattern
- ❌ **Redundant abgeleitete Werte nicht speichern**
- ✅ **URL-State bevorzugen** wenn Zustand teilbar, bookmarkbar, navigationsrelevant
- ✅ **Klare Source of Truth** (Single Source of Truth)

---

## 🌐 Datenzugriff & APIs

- ✅ **Externe Daten sind unsicher** bis validiert/gemappt
- ✅ **API-Calls in dedizierte Module/Services/Hooks** (nicht in Komponenten)
- ✅ **Komponenten ohne rohe Fetch-Details** wenn Projekt Muster dafür hat
- ✅ **Behandle:** Netzwerkfehler, leere Daten, unerwartete Responses
- ❌ **Keine leeren `catch`-Blöcke**
- ✅ **Error-Messages für Nutzer verständlich**
- ❌ **Keine technischen Details/Stack-Traces in UI**
- ✅ **Ladezustände:** Keine Layoutsprünge, keine kaputten Interaktionen
- ✅ **Mutationen:** Doppelte Submits verhindern (Button disabled, Spinner, etc.)

---

## 🎨 Styling

- ✅ **Ausschließlich bestehendes Projekt-System verwenden**
- ❌ **Keine neue Styling-Library ohne triftigen Grund**
- ❌ **Keine willkürlichen Inline-Styles** außer notwendige dynamische Einzelwerte
- ✅ **Design Tokens, CSS-Variablen, Utility-Klassen, Theme-Werte verwenden**
- ✅ **Konsistente Abstände, Typografie, Farben, Hover, Active, Focus, Disabled**
- ✅ **Responsive Design** für sichtbare UI
- ❌ **Keine visuellen Sonderlösungen** die nicht zum Design-System passen

---

## ♿ Accessibility

- ✅ **Semantisches HTML vor ARIA**
- ✅ **`<button>` für Aktionen, `<a>` für Navigation**
- ✅ **Interaktive Elemente per Tastatur bedienbar**
- ✅ **Fokuszustände sichtbar bleiben**
- ✅ **Formulare:** Labels, verständliche Errors, sinnvolle Fokusführung
- ✅ **Dialoge/Popover/Menüs:** Richtiges Fokusmanagement
- ✅ **Bilder:** Passende Alt-Texte oder `aria-hidden` wenn dekorativ
- ✅ **Farben:** Nicht die einzige Informationsquelle
- ✅ **Kontraste:** Ausreichend für normale Nutzung (WCAG AA minimum)

---

## ⚡ Performance

- ✅ **Unnötige Re-Renders vermeiden** durch saubere Struktur & lokalen State
- ✅ **`useMemo`, `useCallback`, `React.memo` NUR mit erkennbarem Nutzen**
- ❌ **Keine pauschale Memoization** "zur Sicherheit"
- ✅ **Große/selten genutzte Routes/Komponenten lazy laden** wenn sinnvoll
- ✅ **Dynamische Imports:** Fachlich sinnvolle Grenzen
- ✅ **Listen:** Stabile Keys aus Daten-IDs
- ❌ **NIEMALS Array-Indizes als Keys** bei veränderlichen Listen
- ✅ **Teure Berechnungen nicht ungeschützt im Renderpfad**
- ✅ **Neue Dependencies prüfen:** Bundle-Auswirkung & Wartungsrisiko

---

## 📋 Formulare

- ✅ **Accessible & robust**
- ✅ **Client-Validierung für Nutzerführung** (ersetzt nicht Server-Validierung!)
- ✅ **Fehler feldnah & verständlich anzeigen**
- ✅ **Inputs behalten Eingaben bei Validierungsfehlern**
- ✅ **Submit-Buttons:** Doppelte Submits verhindern
- ✅ **Passende Input-Typen & Autocomplete-Attribute**
- ❌ **Keine unkontrollierte Mischformen** wenn dadurch Fehler entstehen

---

## 🧭 Routing

- ✅ **Folge bestehendes Projekt-Routing-System**
- ✅ **Route-Komponenten sollten schlank bleiben**
- ✅ **Lade-/Fehlerzustände auf Route-Ebene** wenn Daten dort geladen
- ✅ **Navigationslogik explizit & testbar**
- ✅ **URL-Parameter validieren/sauber interpretieren**
- ❌ **Keine fachlich relevanten Zustände nur in flüchtigem Komponenten-State** wenn zur Navigation gehörig

---

## 🧪 Tests

- ✅ **Neue/geänderte Logik BRAUCHT Tests**
- ✅ **Teste Verhalten, nicht Implementierungsdetails**
- ✅ **Nutzer-Perspektive:** Rollen, Labels, sichtbarer Text, Interaktionen
- ✅ **Kritische Zustände:** Loading, Error, Empty, Success, Disabled
- ✅ **Utilities, Mapper, Hooks, komplexe Logik:** Unit Tests
- ❌ **Keine fragilen Snapshot-Tests**
- ✅ **Mocks:** Realistisch, klein, nachvollziehbar
- ✅ **Wenn KEINE Tests:** Grund + manuelle Prüf-Anweisung nennen

### Test-Tools (im Projekt vorhanden)
- **Vitest** — Unit Tests
- **React Testing Library** — Komponenten-Verhalten
- **Testing Library User Event** — Nutzer-Interaktionen
- **Playwright/Cypress** — E2E (nur wenn im Projekt etabliert)

---

## ❌ Verbotene Muster

- `any` ohne Begründung
- Type Assertions zur Fehler-Unterdrückung
- Non-null Assertions aus Bequemlichkeit
- Business-Logik in JSX
- Unnötiger globaler State
- Leere `catch`-Blöcke
- Array-Indizes als Keys für dynamic Lists
- Unzugängliche Custom Controls
- Neue Dependencies aus Bequemlichkeit
- Secrets im Frontend/Code
- `useEffect` für Datenableitung
- Große Refactorings ohne Aufgabenbezug
- Änderungen an unrelated files

---

## 🔗 Weiterführende Docs

- [CLAUDE.md](CLAUDE.md) — Überblick
- [CLAUDE-security.md](CLAUDE-security.md) — Frontend-Security
- [CLAUDE-workflow.md](CLAUDE-workflow.md) — Workflow & Prozesse
- [CLAUDE-code-guide.md](CLAUDE-code-guide.md) — Was KI-Assistenten dürfen

---

**Zusammengefasst:** Kleine Komponenten, strikte Types, klare State-Logik, accessible HTML, getestet. Sauber.

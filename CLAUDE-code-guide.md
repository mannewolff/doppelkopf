# CLAUDE-code-guide.md — Regeln für KI-Assistenten

**Für:** Claude Code & andere KI-Assistenten  
**Status:** ✅ Aktiv  
**Länge:** ~150 Zeilen  
**Cross-Referenzen:** → [CLAUDE.md](CLAUDE.md), [CLAUDE-workflow.md](CLAUDE-workflow.md)

---

## 📖 Zusammenfassung für KI-Assistenten

Dieses Projekt hat hohe Engineering-Standards. Als KI-Assistent musst du diese beachten:

---

## ✅ IMMER

- **Vor Codeänderung:** Bestehende Struktur/Konventionen lesen und anerkennen
- **Bei Unsicherheit:** Fragen statt raten. Lieber einmal zu viel als ein Bug.
- **Tests mitliefern** für jede neue Logik
- **Migrations-Pfad nennen** bei Breaking Changes
- **Security-Änderungen markieren** (`// SECURITY:` Kommentar) + im Bericht herausstellen
- **Aktuelle Doku konsultieren** bei externen Libraries (nicht Trainingsdaten vertrauen)
- **Backup/Plan erstellen** vor großen Refactorings
- **Commits lokal machen** (nie automatisch pushen)
- **User fragen vor Aktionen** die schwer zu revertten sind

---

## ❌ NIEMALS

- **Code "erfinden"** der nicht existiert (Funktionen, Methoden, Options halluzinieren)
- **Code ohne Grund löschen**
- **`eval`, `Function()`-Constructor** mit User-Input
- **`child_process.exec`** mit konkateniertem User-Input
- **Dependencies hinzufügen** ohne klare Begründung (Bundle-Size, Wartung)
- **Secrets in Code/Tests/Docs** schreiben (auch nicht "fake")
- **Tests deaktivieren/überspringen** um schnell grün zu werden
- **TODOs ohne Ticket-Referenz** hinterlassen
- **Auf "geht schon" hoffen** — Edge Cases werden explizit adressiert
- **Beschwichtigungen** wie "kleinere Refactorings nebenbei" (nein, nur Task-relevante Änderungen)
- **Automatisch zu Production pushen** (max. main, mit explizitem User-GO)
- **Bypass-Flags nutzen** (--no-verify, --no-gpg-sign) ohne explizite User-Anweisung

---

## 📝 Response-Format bei Code-Generierung

1. **Plan** (kurz, Bullet-Form)
2. **Code** (konkrete Implementierung)
3. **Explizite Nennung:**
   - Welche Dateien geändert/erstellt wurden
   - Welche Dependencies hinzukommen + Begründung
   - Welche Tests fehlen oder angepasst sind
   - Welche offenen Fragen / Annahmen es gibt

**Beispiel Format:**
```
## Plan
- Hook `useGameWebSocket` erstellen
- WebSocket-Connection Management
- Fallback auf Mock-Server

## Implementierung
[Code...]

## Änderungen
- `src/hooks/useGameWebSocket.ts` — Neu, WebSocket-Hook
- `src/hooks/__tests__/useGameWebSocket.test.ts` — Neu, Unit Tests

## Dependencies
- Keine neuen

## Tests
- ✅ Connection etabliert
- ✅ Message Handling
- ✅ Disconnect/Reconnect

## Fragen/Annahmen
- Nutze `ws://localhost:3001` als Default (kann via VITE_WS_URL überschrieben werden)
```

---

## 🚨 Eskalation — STOPP & frag User!

Wenn eine dieser Bedingungen eintritt → STOP & kläre mit User:

- **Änderung würde > 5 Dateien gleichzeitig anfassen**
- **Public API/Interface würde brechen**
- **Auth, Crypto, Payments, PII betroffen**
- **Dependency mit > 100 transitive Dependencies**
- **Konflikt zwischen User-Wunsch und Regel in diesem Dokument**
  - (Die Regel gewinnt im Default, User kann sie überstimmen, aber nur explizit + dokumentiert)
- **Destruktive Operationen** (branch delete, reset --hard, force-push, files rm)
- **Risiko: Breaking Change in Minor Version**

**Was sagen:**
```
Ich müsste hier [AKTION] machen, aber das betrifft [GRUND].
Soll ich weitermachen? Oder andere Vorgehensweise?
```

---

## 🔍 Code Review Checkliste (für Claude selbst)

Vor jedem Commit lokal:

- [ ] Keine Secrets, API-Keys, Tokens in Code
- [ ] Keine `any`-Types (oder begründet)
- [ ] Tests für neue Logik
- [ ] `npm run typecheck` grün
- [ ] `npm run lint` grün (oder Begründung für Exceptions)
- [ ] `npm run test` grün
- [ ] `npm run build` grün
- [ ] Keine ungenutzte Imports
- [ ] Keine Debug-Logs oder `console.log`
- [ ] Error-Messages verständlich
- [ ] Edge Cases behandelt

---

## 📋 Vor Push zu Origin

Immer verifizieren:
```bash
git status                # Nur die Dateien die geändert werden sollen
git log -1                # Commit-Message ist sauber
git diff origin/main      # Änderungen sehen aus wie erwartet
npm run typecheck build   # Final Checks
```

---

## 🔗 Wichtigste Referenzen

- [CLAUDE.md](CLAUDE.md) — Projektstandard
- [CLAUDE-security.md](CLAUDE-security.md) — Security-Regeln (gelten für alle!)
- [CLAUDE-workflow.md](CLAUDE-workflow.md) — Prozess & Git-Workflow
- [CLAUDE-react.md](CLAUDE-react.md) — React-spezifisch
- [CLAUDE-php.md](CLAUDE-php.md) — PHP-spezifisch
- [CLAUDE-nodejs.md](CLAUDE-nodejs.md) — Node.js-spezifisch (zukünftig)

---

**Goldene Regel:** Lies zuerst, frag bei Unsicherheit, implementiere sauber, teste, commit lokal. Auf User-GO warten für Origin-Push.

# GitLab Issue: Railway Deployment Setup

## Titel
`feat: Doppelkopf Full-Stack auf Railway deployen`

---

## Beschreibung

Das Doppelkopf-Projekt (React Frontend + Node.js WebSocket Backend) soll auf Railway produktiv deploybar werden. Aktuell läuft es nur lokal ohne Docker oder Deployment-Infrastruktur.

Diese Task erstellt die komplette Docker + Railway + Umgebungsvariablen-Konfiguration für automatisiertes Deployment Frontend + Backend.

**Warum jetzt?**
- Projekt ist produktionsreif
- Keine Abhängigkeiten zu externen Services (reine Game Logic)
- Railway ist kostenfrei für Hobby-Projekte und bietet optimales Setup für Node + Static

---

## Anforderungen

### Backend
- [ ] Dockerfile für Node.js Production Build (Multi-Stage, Alpine)
- [ ] Graceful Shutdown bei SIGTERM (für Railway Redeploy)
- [ ] Health-Check Integration
- [ ] ENV-Var `PORT` unterstützen (Railway injiziert automatisch)

### Frontend
- [ ] Dockerfile für Nginx + React Static Build
- [ ] Nginx Config für SPA-Routing (alle URLs → index.html)
- [ ] WebSocket Proxy zu Backend (`/ws` & `/api/*` → Backend)
- [ ] ENV-Var `VITE_WS_URL` für Backend-Connection (build-time oder runtime)

### Konfiguration & Docs
- [ ] `railway.json` — Service-Definition für Railway
- [ ] `.env.example` — dokumentierte Env-Variablen
- [ ] `/DEPLOYMENT.md` — User-Anleitung für Railway-Setup
- [ ] CLAUDE.md — Workflow dokumentiert (DONE in parallel)

### Testing
- [ ] Lokal: `docker build` & `docker run` erfolgreich für beide Services
- [ ] Lokal: Frontend verbindet zu Backend via WebSocket (optional docker-compose)
- [ ] Spiel-Funktionalität end-to-end verifiziert

---

## Implementierungsdetails

### Dateien zu erstellen
1. `/backend/Dockerfile` — Node.js 22 Alpine, Multi-Stage
2. `/frontend/Dockerfile` — Nginx Alpine, Build in Node
3. `/frontend/nginx.conf` — SPA + Proxy Config
4. `/railway.json` — Railway Service-Definition
5. `/.env.example` — Env-Variablen Dokumentation
6. `/DEPLOYMENT.md` — Railway Deployment-Anleitung

### Dateien zu ändern
1. `/backend/src/index.ts` — Graceful Shutdown Handler hinzufügen
2. Verify: `/backend/package.json` — `npm run build` & `npm start` OK
3. Verify: `/frontend/package.json` — `npm run build` OK

### Nicht anfassen
- Bestehende dev-Scripts (`npm run dev`)
- Vite / Webpack Config
- App-Logic oder Tests

---

## Akzeptanzkriterien (DoD)

- ✅ Beide Dockerfiles bauen lokal fehlerfrei
- ✅ Backend-Container startet, Health-Check antwortet (HTTP 200)
- ✅ Frontend-Container startet, Nginx lädt index.html (HTTP 200)
- ✅ Frontend verbindet zu Backend via WebSocket (lokal: ws://localhost:3001)
- ✅ Spiel-Funktionalität end-to-end testbar (Spieler beitreten, Karten zeigen, etc.)
- ✅ Graceful Shutdown lädt/speichert Game State sauber
- ✅ Alle Docker Images auf Alpine-Base, Größe < 200MB Backend, < 100MB Frontend
- ✅ Keine Secrets, API-Keys, oder hardcoded URLs in Dockerfiles
- ✅ `.env.example` dokumentiert alle Env-Variablen
- ✅ `/DEPLOYMENT.md` erklärt Railway-Setup für User
- ✅ npm audit zeigt keine high/critical Vulnerabilities

---

## Testing & Verifikation

### Lokal vor Commit
```bash
# Backend Build
docker build -f backend/Dockerfile -t doppelkopf-backend ./backend
docker run -p 3001:3001 doppelkopf-backend
# Ergebnis: "🎮 Doppelkopf Backend ready on ws://localhost:3001"

# Frontend Build
docker build -f frontend/Dockerfile -t doppelkopf-frontend ./frontend
docker run -p 3000:3000 -e VITE_WS_URL=ws://localhost:3001 doppelkopf-frontend
# Ergebnis: Nginx antwortet auf http://localhost:3000

# Browser: http://localhost:3000
# Test: Spieler beitreten → Kartenhand zeigt → OK
```

### Optional: Docker-Compose lokal
```bash
docker-compose up
# Backend: http://localhost:3001 (WebSocket)
# Frontend: http://localhost:3000 (Browser)
```

### Auf Railway (User macht später)
1. GitHub Repo connect
2. Backend Service: Railway detects Dockerfile → auto-deploy
3. Frontend Service: Railway detects Dockerfile → auto-deploy
4. Set `VITE_WS_URL` in Frontend Environment
5. Test: https://doppelkopf.railway.app/

---

## Dokumentation & Übergabe

Nach Implementierung gehört folgendes zu Commit:
- Alle neuen/geänderten Dateien (Dockerfiles, nginx.conf, Configs)
- Commit-Message: `feat(deploy): Railway Dockerfile + Nginx Config + Env-Handling`
- Zusammenfassung im Issue: Dateien, Testing-Ergebnisse, offene Fragen

**Gitlab Issue-Labels:**
- `deployment`
- `infrastructure`
- `docker`
- `priority::high` (freie Domain sichern)

**Milestone:** (User entscheidet)

---

## Architektur-Übersicht

```
┌─────────────────────────────────┐
│      Railway.app (public)       │
├──────────────────┬──────────────┤
│   Frontend       │   Backend    │
│   Nginx/React    │   WebSocket  │
│   Port 3000      │   Port 3001  │
│                  │              │
│   - SPA-Routing  │ - Game Logic │
│   - Proxy Setup  │ - State Mgmt │
│   - Asset Serve  │ - Health-CHK │
└──────────────────┴──────────────┘
```

---

## Offene Punkte (für später, nicht diesen Task)

- Datenbank-Integration (aktuell In-Memory, später PostgreSQL möglich)
- Skalierung > 1 Replica (braucht Redis Adapter)
- Custom Domain (optional, Railway gibt Free-Domain)
- CI/CD Pipeline (optional, Railway auto-deploys on Push)
- Monitoring (optional, Railway hat basic Logging)

---

## Checkliste für Claude (Auto-Mode)

- [ ] Dockerfile Backend: Multi-Stage, Node 22 Alpine, Health-Check
- [ ] Dockerfile Frontend: Nginx Alpine, SPA-Routing, Proxy
- [ ] nginx.conf: try_files SPA, proxy_pass WebSocket
- [ ] railway.json: Service-Definition
- [ ] .env.example: Dokumentiert PORT, NODE_ENV, VITE_WS_URL
- [ ] DEPLOYMENT.md: User-Anleitung klar & actionable
- [ ] index.ts: Graceful Shutdown Code
- [ ] package.json Verify: Scripts OK
- [ ] Docker Build lokal erfolgreich
- [ ] Spiel end-to-end getestet
- [ ] npm audit clean (kein high/critical)
- [ ] Commit + Zusammenfassung für Gitlab

---

**Bereit zum Absenden ins Gitlab.** User copy-pastet obige Sections ins neue Issue.

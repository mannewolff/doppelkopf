# Railway Deployment Setup für Doppelkopf

**Status:** Plan Mode  
**Datum:** 2026-05-16  
**Scope:** Frontend + Backend auf Railway  

---

## Context

Das Doppelkopf-Projekt ist ein WebSocket-basiertes Echtzeit-Spiel mit React-Frontend und Node.js-Backend. Aktuell läuft es nur lokal. Ziel: Vollständige Deployment-Pipeline auf Railway inkl. Docker, Umgebungsvariablen, Health-Checks und Graceful Shutdown.

**Status quo:**
- Kein Dockerfile, keine CI/CD, keine Railway-Konfiguration
- Backend: Node.js + TypeScript + ws-WebSocket, Port 3001
- Frontend: React + Vite + TypeScript, Build → `/frontend/dist/`
- Beide haben package.json Scripts für Build und Start

---

## Anforderungen

1. **Backend auf Railway deploybar**
   - Dockerfile für Node.js Produktion
   - Environment-Variable `PORT` (Railway injiziert automatisch)
   - Health-Checks für Startup-Detektion
   - Graceful Shutdown bei `SIGTERM`
   - `npm ci` + `npm run build` + `npm start` Prozess

2. **Frontend auf Railway deploybar**
   - Dockerfile für statische Assets (nginx)
   - Build-Prozess: Vite Build → dist/
   - Proxy-Konfiguration für API-Calls zum Backend
   - Umgebungsvariable `VITE_WS_URL` (wird von User beim Deploy gesetzt)

3. **Railway-Konfiguration**
   - railway.json oder railway.toml für automatisches Setup
   - Service-Definition für Backend und Frontend
   - Networking zwischen Services
   - Environment-Secrets Management

4. **Security & Standards**
   - Keine Secrets in Dockerfiles
   - .env.example dokumentiert alle Variablen
   - Optimierte Docker Images (Alpine-Base, Multi-Stage)
   - Production Node.js Best Practices

5. **Lokale Entwicklung**
   - docker-compose.yml optional (für lokales Docker Testing)
   - Bestehende `npm run dev` bleibt unberührt

---

## Implementierungsschritte

### 1. Backend Dockerfile
**Datei:** `/backend/Dockerfile`

```dockerfile
# Build Stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

# Runtime Stage
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json .

EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001), (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

CMD ["npm", "start"]
```

**Logik:**
- Multi-Stage: Kleinere Runtime Image
- Alpine: Minimal, schnell
- Health-Check: Railway erkennt Ready-State
- `EXPOSE 3001`: Dokumentation (Railway setzt PORT Var automatisch)

### 2. Frontend Dockerfile
**Datei:** `/frontend/Dockerfile`

```dockerfile
# Build Stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

# Runtime Stage (Nginx)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/index.html || exit 1
```

**Logik:**
- Multi-Stage: Build in Node, serve in Nginx
- Nginx: Optimal für statische Assets
- Health-Check: Verifiziert HTTP 200
- Port 3000: Standard Nginx (Railway mapped automatisch)

### 3. Nginx Konfiguration
**Datei:** `/frontend/nginx.conf`

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    error_page 404 /index.html;
}
```

**Logik:**
- SPA-Fallback: alle URLs → index.html (React Router)
- WebSocket-Support: `/ws` & `Upgrade` Header
- Backend Proxy: `/api/*` zu Backend-Service
- DNS: Railway resolves `backend` service name

### 4. Railway Konfiguration
**Datei:** `/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile",
    "buildpacks": []
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "always",
    "restartPolicyMaxRetries": 0
  }
}
```

**Alternative per CLI später, aber diese Datei dokumentiert die Absicht.**

### 5. Environment Variablen
**Datei:** `/.env.example`

```
# Backend (Railway setzt diese automatisch)
NODE_ENV=production
PORT=3001

# Frontend (User setzt beim Deploy)
VITE_WS_URL=wss://your-backend-domain.railway.app
```

**Erklärung:**
- `NODE_ENV=production`: Backend optimiert sich selbst
- `PORT`: Railway injiziert automatisch (wenn nicht gesetzt: Default 3001)
- `VITE_WS_URL`: **User muss wissen:** Nach Backend-Deploy setzen (z.B. `wss://api.doppelkopf.railway.app`)
- Im Dockerfile: Nicht hardcoded, nur in runtime verwendet

### 6. Backend Index anpassen (minimal)
**Datei:** `/backend/src/index.ts`

Prüfen:
- `const PORT = Number(process.env['PORT'] ?? 3001)` ← OK, schon vorhanden
- Graceful Shutdown hinzufügen:

```typescript
// Am Ende von index.ts, vor oder nach Listener-Setup:
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
```

### 7. Frontend Env-Var Setup
**Datei:** `/frontend/src/hooks/useGameWebSocket.ts`

Prüfen:
- `const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'` ← sollte bereits existieren
- Für Production: `VITE_WS_URL` in Railway UI setzen

### 8. Package.json Scripts validieren
- **Backend:** `npm run build` → kompiliert zu `/dist`, `npm start` → lädt `dist/index.js` ✓
- **Frontend:** `npm run build` → kompiliert zu `/dist` ✓

### 9. Dokumentation
**Datei:** `/DEPLOYMENT.md` (neu)

```markdown
# Railway Deployment

## Quickstart

1. Verbinde GitHub-Repository mit Railway
2. Erstelle zwei Services:
   - Backend: Dockerfile `/backend/Dockerfile`, Port 3001
   - Frontend: Dockerfile `/frontend/Dockerfile`, Port 3000
3. Setze Environment-Variablen (siehe unten)
4. Deploy triggert automatisch bei Push zu main

## Environment-Variablen

### Backend
- `NODE_ENV`: production (Auto-Setup)
- `PORT`: 3001 (Railway injiziert automatisch)

### Frontend
- `VITE_WS_URL`: WebSocket-URL des Backends
  - Beispiel lokal: `ws://localhost:3001`
  - Beispiel Railway: `wss://doppelkopf-backend-prod.railway.app`

## Service-Linking

Im Frontend Dockerfile wird Nginx konfiguriert, um:
- WebSocket zu `/ws` → Backend zu proxyen
- Alle anderen Requests → Frontend zu servieren

Railway Service Name: `backend` (DNS wird automatisch aufgelöst)

## Troubleshooting

### Backend startet nicht
- Logs checken: `npm run build` erfolgreich?
- PORT gesetzt? Railway injiziert automatisch, sollte nicht manuell nötig sein.

### Frontend verbindet nicht zu Backend
- `VITE_WS_URL` in Railway gesetzt?
- URL muss absolut sein (kein `localhost`)
- SSL: `ws://` lokal, `wss://` auf Production

### WebSocket-Timeouts
- Nginx: `proxy_read_timeout 86400;` ← erlaubt lange Connections
```

---

## Kritische Dateien zu ändern/erstellen

| Datei | Typ | Aktion | Grund |
|-------|-----|--------|-------|
| `/backend/Dockerfile` | NEU | Erstellen | Production Build Backend |
| `/frontend/Dockerfile` | NEU | Erstellen | Production Build Frontend |
| `/frontend/nginx.conf` | NEU | Erstellen | Nginx Config für SPA + Proxy |
| `/railway.json` | NEU | Erstellen | Railway Service-Definition |
| `/.env.example` | NEU | Erstellen | Dokumentation Variablen |
| `/DEPLOYMENT.md` | NEU | Erstellen | User-Anleitung |
| `/backend/src/index.ts` | UPDATE | Graceful Shutdown | SIGTERM Handling |
| `/backend/package.json` | PRÜFEN | Verify | build + start Scripts OK? |
| `/frontend/package.json` | PRÜFEN | Verify | build + preview Scripts OK? |

---

## Testing & Verifikation

### Lokales Docker Testing (Optional)
```bash
# Backend
docker build -f backend/Dockerfile -t doppelkopf-backend ./backend
docker run -p 3001:3001 doppelkopf-backend

# Frontend (separate Terminal)
docker build -f frontend/Dockerfile -t doppelkopf-frontend ./frontend
docker run -p 3000:3000 -e VITE_WS_URL=ws://localhost:3001 doppelkopf-frontend
# Browser: http://localhost:3000
```

### Auf Railway
1. Connect GitHub Repo
2. Create Backend Service → Railway detects Dockerfile → Build + Deploy
3. Create Frontend Service → Railway detects Dockerfile → Build + Deploy
4. Set `VITE_WS_URL` in Frontend Environment
5. Redeploy Frontend
6. Test: https://your-domain/

### Akzeptanzkriterien
- ✅ Backend läuft, Health-Check antwortet
- ✅ Frontend läuft, Health-Check antwortet
- ✅ Frontend kann zu Backend verbinden (WebSocket)
- ✅ Spiel funktioniert end-to-end auf Railway
- ✅ Graceful Shutdown ohne Fehler

---

## Architektur-Diagramm

```
User Browser
    ↓ (HTTPS)
┌─────────────────┐
│   Railway.app   │
├─────────────────┤
│  Frontend       │  Port 3000 (Nginx)
│  - React Build  │  - SPA: *.js, *.css
│  - Nginx        │  - /ws → Backend
│  - Proxy        │  - /api → Backend
└────────┬────────┘
         │ (HTTP, Service Network)
┌────────▼────────┐
│  Backend        │  Port 3001 (Node.js)
│  - WebSocket    │  - ws://...
│  - TypeScript   │  - Health-Check
│  - Node.js      │  - Graceful Shutdown
└─────────────────┘
```

---

## Offene Fragen / Annahmen

1. **SSL/TLS:** Railway managed automatisch (Free Tier)
   - HTTP wird zu HTTPS umgeleitet
   - WebSocket: Browser erzwingt `wss://` auf HTTPS-Seiten

2. **Skalierung:** Aktuell `numReplicas: 1`
   - WebSocket-Sticky-Sessions kein Problem auf Railway
   - Falls später > 1 Replica: Redis-Adapter nötig

3. **Secrets/Env-Vars:**
   - Railway UI: Environment Variables Sektion
   - Nicht in Code oder Dockerfile hart-codieren

4. **Domain:**
   - Railway gibt freie Domain (z.B. `doppelkopf.railway.app`)
   - Custom Domain optional über Railway Dashboard

5. **Datenbank:**
   - Aktuell in-memory Game State
   - Falls später Persistenz nötig: Railway PostgreSQL Add-on

---

## Nächste Schritte nach Plan-Genehmigung

1. **Phase 2:** Formalisiere diese Plan als GitLab Issue
2. **Phase 3:** Implementiere alle 6 Dateien lokal + testen
3. **Phase 4:** Schreibe Railway-Deployment-Anleitung
4. **Phase 5:** User testet lokal (optional docker-compose)
5. **Phase 6:** User pusht zu `origin/main`
6. **Phase 7:** User erstellt PR + linkt Issue (optional)
7. **Phase 8:** User deployed auf Railway (via Railway UI oder `railway deploy`)

---

**Plan fertig.** Warte auf dein GO für Implementierung.

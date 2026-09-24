# PART 05 — DEVOPS, CONFIG & SCRIPTS

## Environment Configuration

### Backend `.env` Files

Backend `.env` files are listed in `.gitignore` (`*.env`) and are **NOT committed** to git. The env variables required per service are:

**Auth Service (`auth-service/.env`):**
```
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
PORT=5003
GMAIL_USER=<gmail_address>
GMAIL_APP_PASSWORD=<gmail_app_password>
GOOGLE_CLIENT_ID=<google_oauth_client_id>
ADMIN_EMAILS=admin1@gmail.com,admin2@gmail.com
DEV_MODE=true|false
```

**Events Backend (`events-backend/.env`):**
```
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
JWT_SECRET=<secret>
PORT=5001
FRONTEND_URL=http://localhost:5173
```

**Publications Backend (`publications-backend/.env`):**
```
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
JWT_SECRET=<secret>
PORT=5000
NODE_ENV=development
SCOPUS_API_KEY=<elsevier_api_key>
SERPAPI_KEY=<serpapi_key>
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

### Frontend `.env` Files

**Committed to git** (via `frontend/.env.development` and `frontend/.env.production`):

**`.env.development`** (`frontend/.env.development`):
```
VITE_AUTH_URL=http://localhost:5003
VITE_PUBLICATIONS_URL=http://localhost:5000
VITE_EVENTS_URL=http://localhost:5001
```

**`.env.production`** (`frontend/.env.production`):
```
VITE_AUTH_URL=https://g-learn-auth.onrender.com
VITE_PUBLICATIONS_URL=https://g-learn-publications.onrender.com
VITE_EVENTS_URL=https://g-learn-events.onrender.com
```

**Finding:** Production backends are deployed on **Render.com** (PaaS).

### Vite Proxy Configuration (`frontend/vite.config.ts`)

The Vite dev server acts as a gateway, routing API calls to the correct backend:

```
/api/auth/me               → port 5000 (publications-backend)
/api/auth/profile           → port 5000
/api/auth/profile-urls      → port 5000
/api/auth/faculty           → port 5000
/api/auth/faculty-list      → port 5000
/api/auth/admin             → port 5000
/api/auth                   → port 5003 (auth-service — catch-all)
/api/admin                  → port 5003
/api/profile                → port 5003
/api/events                 → port 5001 (events-backend)
/api/publications           → port 5000
/api/conferences            → port 5000
/api/books                  → port 5000
/api/scopus                 → port 5000
/api/wos                    → port 5000
/api/scholar                → port 5000
/api/flags                  → port 5000
/api/potential-flags         → port 5000
/api/krc                    → port 5000
/api/journal-rankings       → port 5000
/api/admin-stats            → port 5000
/api/achievements           → port 5004 (achievements-backend — NOT FOUND)
/api/users                  → port 5004
/api/export                 → port 5004
/api/placements             → port 5005 (placements-backend — NOT FOUND)
                               (rewrites /api/placements → /api)
```

**Critical note:** The proxy ordering matters — `/api/auth/me` is listed before `/api/auth` to ensure it routes to publications-backend (port 5000), not auth-service (port 5003). This means the publications backend has its own `/api/auth/me` endpoint that returns a richer profile than the auth service.

---

## Git History

### Repository Statistics

| Metric | Value |
|--------|-------|
| Total commits | 2 |
| First commit | 2026-07-15 03:26:07 +0530 |
| Last commit | 2026-07-15 04:52:52 +0530 |
| Contributors | 1 (`ghoshonkar5`) |
| Total files (initial commit) | 468 |
| Total insertions (initial commit) | 58,398 lines |
| Age of repo | ~2 months old (as of 2026-09-21) |

### Commit Log

| # | Date | Author | Message |
|---|------|--------|---------|
| 1 | 2026-07-15 03:26:07 | ghoshonkar5 | Initial commit of University Portal monorepo with exact favicon brand palette (#101A24 and #E5DDC6) |
| 2 | 2026-07-15 04:52:52 | ghoshonkar5 | Update API client origin configurations and add development/production env files |

**Observation:** The entire 58,398-line codebase was committed in a single "Initial commit", followed by one small fix commit (10 insertions, 4 deletions). This suggests the code was developed elsewhere (or locally without version control) before being pushed to git.

### Commit 2 Diff (7 files changed)

| File | Change |
|------|--------|
| `events-backend/src.zip` | Deleted (11,541 bytes binary) |
| `frontend/.env.development` | Added (3 lines) |
| `frontend/.env.production` | Added (3 lines) |
| `frontend/src/api/axios.ts` | Modified (1 line) |
| `frontend/src/api/eventsAxios.ts` | Modified (1 line) |
| `frontend/src/api/publicationsAxios.ts` | Modified (1 line) |
| `frontend/src/modules/events/api/axios.ts` | Modified (1 line) |

The modifications changed axios base URLs from hardcoded to environment-variable-based using `import.meta.env.VITE_*_ORIGIN`.

---

## Scripts

### Root `package.json` Scripts

```json
{
  "name": "g-learn",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "google-auth-library": "^10.9.0",
    "nodemailer": "^9.0.3"
  }
}
```
The root `package.json` has no start/dev/build scripts. It only has a placeholder test script. The root-level dependencies (bcryptjs, google-auth-library, nodemailer) duplicate what's in `auth-service/package.json`.

### Per-Service Scripts

**Auth Service (`auth-service/package.json`):**
```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js"
}
```

**Events Backend (`events-backend/package.json`):**
```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js"
}
```

**Publications Backend (`publications-backend/package.json`):**
```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js"
}
```

**Frontend (`frontend/package.json`):**
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

### Utility Scripts

| Script | File | Purpose |
|--------|------|---------|
| `hash.js` | Root | Hashes a hardcoded password `'Gitam@123'` with bcrypt. One-time utility. |
| `create-admin.js` | `auth-service/` | CLI tool to create admin user. Usage: `node create-admin.js <id> <name> <email> <password>`. Also updates `ADMIN_EMAILS` in `.env`. Contains **hardcoded DB credentials** as fallback. |
| `list-tables.js` | `auth-service/` | Dumps full database schema (tables, columns, FKs, row counts) from live DB. Contains **hardcoded DB credentials**. |
| `test-auth.html` | `auth-service/` | Standalone HTML page for testing auth endpoints in browser. |
| `test-login.html` | `publications-backend/` | Standalone HTML page for testing publications login. |
| `test_delete.js` | `publications-backend/` | Script for testing deletion operations. |
| `backfillAuthorPosition.js` | `publications-backend/src/scripts/` | One-time backfill script to compute `position_of_author` for existing publications. |

---

## Testing

**No automated tests exist.**

- No test files found (no `*.test.ts`, `*.test.js`, `*.spec.ts`, `*.spec.js`)
- No test framework installed (no Jest, Vitest, Mocha, Playwright, Cypress)
- No CI/CD pipeline found (no `.github/workflows/`, no Jenkinsfile, no GitLab CI)
- Root `package.json` test script: `echo "Error: no test specified" && exit 1`
- Only manual test files: `test-auth.html` and `test-login.html` (standalone HTML pages for manual browser testing)

---

## Deployment

### Production Infrastructure (Inferred)

| Component | Platform | Evidence |
|-----------|----------|----------|
| Frontend | UNCERTAIN | No Vercel/Netlify config. Could be Render static site or deployed with backend. |
| Auth Service | Render.com | `VITE_AUTH_URL=https://g-learn-auth.onrender.com` |
| Events Backend | Render.com | `VITE_EVENTS_URL=https://g-learn-events.onrender.com` |
| Publications Backend | Render.com | `VITE_PUBLICATIONS_URL=https://g-learn-publications.onrender.com` |
| Database | Neon.tech | Connection string in `list-tables.js` |

### Missing Deployment Artifacts

- **No Dockerfile** — not containerized
- **No `Procfile`** — Render.com likely auto-detects `npm start`
- **No `render.yaml`** — no infrastructure-as-code for Render
- **No Nginx/reverse proxy config** — Render handles this
- **No CDN config** — no Cloudfront, Fastly, etc.
- **No `engines` field** in any `package.json` — Node.js version not pinned

### Local Development Workflow

To run the full system locally:
```bash
# Terminal 1 — Auth Service
cd auth-service && npm install && npm run dev  # Port 5003

# Terminal 2 — Events Backend
cd events-backend && npm install && npm run dev  # Port 5001

# Terminal 3 — Publications Backend
cd publications-backend && npm install && npm run dev  # Port 5000

# Terminal 4 — Frontend
cd frontend && npm install && npm run dev  # Port 5173 (Vite proxy handles routing)
```

**Missing backends (achievements port 5004, placements port 5005) will cause 502/connection errors for those modules.**

---

## `.gitignore` Analysis

```
node_modules/
/.pnp, .pnp.js
/coverage, /build, /dist, /.next/, /out/, /.vite/
.DS_Store, *.pem
*-debug.log*
.env, .env.local, .env.*.local, *.env
tmp/, temp/, *.log, *.sqlite, *.db
```

**Issues found:**
1. `*.env` pattern blocks `.env` files, but `frontend/.env.development` and `frontend/.env.production` were committed **before** the gitignore was set up (they exist in git history)
2. `uploads/` directories are NOT in `.gitignore` — uploaded files could accidentally be committed
3. `events-backend/src.zip` was committed in the initial commit and deleted in commit 2 — binary files should be gitignored

---

## Monorepo Management

- **No workspace manager** — not a Yarn/npm/pnpm workspace
- **No root-level orchestration** — no `npm run dev:all` or similar script
- **No Turborepo, Nx, or Lerna** — each service is independently managed
- **Root `package.json`** exists but only serves as a dumping ground for 3 dependencies that are also in `auth-service/package.json`
- **Each service has independent `node_modules/`** — no shared dependencies
- **No shared code** between services — auth middleware is copy-pasted into each backend with minor variations

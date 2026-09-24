# PART 06 — ISSUES, RISKS & RECOMMENDATIONS

## 🔴 CRITICAL — Security Vulnerabilities

### SEC-01: Hardcoded Database Credentials in Source Code
**Files:** `auth-service/list-tables.js` (line 4), `auth-service/create-admin.js` (line 8)
**Issue:** Full Neon PostgreSQL connection string with username and password is hardcoded:
```
postgresql://neondb_owner:npg_yniWE2BqLTc8@ep-blue-morning-ao66tb9u-pooler...
```
**Risk:** Anyone with repo access has full database read/write access.
**Fix:** Remove credentials from source code immediately. Use `process.env.DATABASE_URL` exclusively. Rotate the database password.

### SEC-02: Hardcoded Password in Source Code
**File:** `hash.js` (line 3)
**Issue:** Contains `const plainPassword = 'Gitam@123'` — likely an admin or default password.
**Risk:** Credential exposure. If this password is used anywhere in production, the system is compromised.
**Fix:** Delete this file or remove the hardcoded password. Use environment variables for any password utilities.

### SEC-03: OTP Generation Uses `Math.random()` (Not Cryptographically Secure)
**File:** `auth-service/src/utils/otpUtils.js` (line 6)
**Issue:** `Math.floor(100000 + Math.random() * 900000)` — `Math.random()` is a PRNG, not CSPRNG.
**Risk:** OTP values may be predictable if the random seed can be inferred.
**Fix:** Use `crypto.randomInt(100000, 999999)` from Node.js `crypto` module.

### SEC-04: JWT Token Stored in `localStorage` (XSS Vulnerable)
**File:** `frontend/src/context/AuthContext.tsx` (multiple lines), all axios interceptors
**Issue:** JWT tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page.
**Risk:** Any XSS vulnerability (e.g., a malicious script injected via a third-party dependency) can steal the JWT and impersonate the user.
**Fix:** Use `httpOnly` cookies for token storage, or implement a backend-for-frontend (BFF) pattern.

### SEC-05: CORS Configured as `origin: '*'` on All Backends
**Files:** `auth-service/src/server.js`, `events-backend/src/server.js`, `publications-backend/src/server.js`
**Issue:** All three backends use `cors()` with no origin restriction (or `origin: '*'`).
**Risk:** Any website can make API requests to the backend. Combined with SEC-04, this enables cross-site token theft.
**Fix:** Restrict CORS to the specific frontend domain(s).

### SEC-06: Admin User Creation Writes to `.env` File at Runtime
**File:** `auth-service/src/controllers/adminController.js` (lines 70–100)
**Issue:** When creating an admin user, the code reads/writes the `.env` file on disk to append the admin's email to `ADMIN_EMAILS`. This is a filesystem mutation during API handling.
**Risk:** Race conditions, permission errors, file corruption. On serverless/container platforms (like Render), filesystem changes are ephemeral and will be lost on redeploy.
**Fix:** Store admin emails exclusively in the database, not in environment variables.

### SEC-07: No Rate Limiting on Login Endpoint
**File:** `auth-service/src/controllers/authController.js`
**Issue:** The login endpoint checks bcrypt password with no rate limiting. OTP has rate limiting (50/hour, 3 attempts), but the initial password check does not.
**Risk:** Brute-force password attacks. An attacker can try unlimited password combinations.
**Fix:** Add rate limiting middleware (e.g., `express-rate-limit`) to the login endpoint.

### SEC-08: Production URLs Committed to Git
**File:** `frontend/.env.production`
**Issue:** Production backend URLs on Render.com are committed: `g-learn-auth.onrender.com`, `g-learn-publications.onrender.com`, `g-learn-events.onrender.com`
**Risk:** Reveals production infrastructure to anyone with repo access. Enables targeted attacks.
**Fix:** Use CI/CD environment variables for production URLs instead of committing them.

---

## 🟠 HIGH — Architectural Issues

### ARCH-01: No Database Migration System
**Issue:** No migration files, no ORM, no schema versioning. The database schema is managed entirely out-of-band (likely via Neon console).
**Risk:** Schema drift between environments, inability to reproduce the database, no rollback capability, no audit trail of schema changes.
**Fix:** Adopt a migration tool (Knex.js, Prisma, or raw SQL migrations via `db-migrate`).

### ARCH-02: Duplicated Auth Middleware Across Services
**Files:** `auth-service/src/middleware/authMiddleware.js`, `events-backend/src/middleware/authMiddleware.js`, `publications-backend/src/middleware/authMiddleware.js`
**Issue:** JWT verification logic is copy-pasted into three separate services with minor variations. Each service independently queries the shared `users` table.
**Risk:** Inconsistent auth behavior if one copy is updated but not the others. The events middleware exports `verifyToken` while auth-service exports `protect` — naming inconsistency.
**Fix:** Extract shared middleware into a shared npm package, or centralize auth validation behind the auth service with inter-service calls or a gateway.

### ARCH-03: Missing Backend Services (Achievements + Placements)
**Issue:** Frontend modules for Achievements (port 5004) and Placements (port 5005) are fully implemented with API calls, but no backend source code exists in the repository.
**Risk:** These features are non-functional. Frontend will show errors when trying to use these modules.
**Fix:** Either add the missing backend services to the repo, or clearly mark these modules as "coming soon" in the UI.

### ARCH-04: No Frontend Data Caching or React Query
**Issue:** Every page navigation triggers a full API fetch. No data caching layer (no React Query, SWR, or similar).
**Risk:** Poor performance on slow networks, unnecessary server load, bad UX (loading spinners on every page transition).
**Fix:** Adopt React Query (TanStack Query) for server state management with built-in caching, deduplication, and background refresh.

### ARCH-05: Massive Single-File Components
**Issue:** Several page components are extremely large:
  - `publications/pages/admin/AdminDashboardPage.tsx` — 2,403 lines (131 KB)
  - `publications/pages/faculty/PublicationsPage.tsx` — 1,622 lines (91 KB)
  - `publications/pages/faculty/ConferencesPage.tsx` — 1,008 lines
  - `publications/pages/faculty/BooksPage.tsx` — 996 lines
  - `publications/pages/faculty/FlagHistoryPage.tsx` — 961 lines
  - `pages/AdminUsersPage.tsx` — 857 lines
**Risk:** Extremely difficult to maintain, test, or review. Any change to these files risks introducing regressions.
**Fix:** Break into smaller, focused components. Extract form logic, data fetching, and rendering into separate files.

### ARCH-06: No Lazy Loading of Routes
**File:** `frontend/src/App.tsx`
**Issue:** All 44 routes are eagerly imported at the top of `App.tsx`. No `React.lazy()` or dynamic imports.
**Risk:** The entire application JavaScript (33,673 lines across 166 files) is bundled into a single chunk, leading to slow initial page loads.
**Fix:** Implement route-level code splitting with `React.lazy()` and `Suspense`.

### ARCH-07: Inconsistent API Patterns Across Modules
**Issue:**
  - Events module uses **Axios instances** (`modules/events/api/axios.ts`)
  - Publications module uses **raw `fetch()`** (`modules/publications/api/publicationsApi.ts`)
  - Achievements module uses **Axios instances** (`modules/achievements/api/axios.ts`)
  - Placements module uses **raw `fetch()`** wrapper (`modules/placements/lib/api.js`)
  - Platform auth uses **Axios instances** (`api/axios.ts`)
**Risk:** Inconsistent error handling, 401 redirect behavior, and debugging experience.
**Fix:** Standardize on one HTTP client pattern across all modules.

### ARCH-08: Express Version Mismatch
**Issue:**
  - Auth Service: Express 5.2.1
  - Events Backend: Express 5.2.1
  - Publications Backend: Express **4.21.2** (major version behind)
**Risk:** Different middleware behavior, different error handling semantics, different async error support.
**Fix:** Upgrade publications-backend to Express 5 for consistency.

---

## 🟡 MEDIUM — Code Quality & Maintainability

### QA-01: No Automated Tests
**Issue:** Zero test files. No test framework installed. No CI/CD pipeline.
**Risk:** Every change requires manual testing. Regressions are caught in production.
**Fix:** Add Vitest for frontend unit tests, Jest/Supertest for backend API tests.

### QA-02: No TypeScript Strict Mode
**File:** `frontend/tsconfig.app.json`
**Issue:** `strict: true` is not set. `noUnusedLocals: false`, `noUnusedParameters: false`.
**Risk:** TypeScript provides less safety than it could. Implicit `any` types, unused code, and nullable errors are not caught.
**Fix:** Enable `strict: true` and fix resulting type errors.

### QA-03: Placements Module in JSX (Not TypeScript)
**File:** `frontend/src/modules/placements/`
**Issue:** The entire placements module (7 pages, 3 lib files, 2 component dirs) is written in `.jsx` instead of `.tsx`.
**Risk:** No type safety for the placements module while the rest of the app is TypeScript.
**Fix:** Convert all `.jsx` files to `.tsx` with proper type annotations.

### QA-04: Duplicated shadcn/ui Components
**Issue:** The `ui/` component directory is duplicated between `modules/events/components/ui/` (10 components) and `modules/publications/components/ui/` (26 components).
**Risk:** Maintenance burden — if a button component is updated in publications, it must be manually synced to events.
**Fix:** Hoist shared UI primitives to `src/components/ui/` and import from there.

### QA-05: Email Templates Contain Hardcoded `localhost:5173` URLs
**File:** `auth-service/src/utils/emailService.js` (lines 72, 106)
**Issue:** Welcome email and account-created email templates contain `http://localhost:5173/onboarding` and `http://localhost:5173/first-login`.
**Risk:** Production emails will contain localhost links that don't work for users.
**Fix:** Use an environment variable for the frontend URL in email templates.

### QA-06: Frontend Does Not Validate Token on Hydration
**File:** `frontend/src/context/AuthContext.tsx`
**Issue:** On page load, `AuthContext` reads the token from `localStorage` and trusts it without validation. It does NOT call `/api/auth/me` to verify the token is still valid.
**Risk:** A user with an expired or revoked token will see authenticated UI until their first API call fails with 401, leading to a jarring experience.
**Fix:** Call `/api/auth/me` on hydration to validate the token. Show a loading state until validation completes.

### QA-07: No Prettier / Code Formatting Standard
**Issue:** No Prettier config found. Inconsistent formatting across files (some files use `\r\n`, some use `\n`; indentation varies between 2 and 4 spaces).
**Fix:** Add Prettier with a consistent config and format the entire codebase.

### QA-08: `publications/api/axios.ts` is an Empty File (0 bytes)
**File:** `frontend/src/modules/publications/api/axios.ts`
**Issue:** This file exists but contains 0 bytes. The publications module uses `publicationsApi.ts` with raw `fetch()` instead.
**Risk:** Confusing for developers who expect an Axios instance.
**Fix:** Delete the empty file.

---

## 🔵 LOW — Enhancement Opportunities

### ENH-01: Add Dark Mode Support
**Issue:** `next-themes` package is installed but no theme switching UI or dark mode CSS variables are defined.
**Fix:** Either implement dark mode or remove the `next-themes` dependency.

### ENH-02: Add Error Boundaries
**Issue:** No React error boundaries found. Unhandled component errors will crash the entire app.
**Fix:** Add error boundaries at the route level.

### ENH-03: Add Accessibility (a11y) Attributes
**Issue:** Many interactive elements lack `aria-label`, `aria-describedby`, or proper focus management.
**Fix:** Audit with axe-core and add appropriate ARIA attributes.

### ENH-04: Implement Server-Side Pagination
**Issue:** API calls like `getMine()`, `getAll()` fetch all records at once. The frontend shows all events/publications with client-side filtering.
**Risk:** Performance will degrade as data grows.
**Fix:** Implement cursor-based or offset pagination on the backend.

### ENH-05: Add SEO / Meta Tags
**File:** `frontend/index.html`
**Issue:** Title is generic "University Portal", no meta description, no OpenGraph tags.
**Fix:** Add proper meta tags, especially if the app has public-facing pages.

### ENH-06: Pin Node.js Version
**Issue:** No `.nvmrc`, no `engines` field in any `package.json`.
**Fix:** Add `.nvmrc` with the required Node.js version and `"engines"` to each `package.json`.

### ENH-07: Add Health Check Endpoints to All Services
**Issue:** Only auth-service has a `GET /api/health` endpoint. Events and publications backends do not.
**Fix:** Add health check endpoints to all services for monitoring.

### ENH-08: Remove Unused Dependencies
**Issue:** Root `package.json` duplicates dependencies from `auth-service`. `Chart.js` and `Recharts` are both installed in frontend — UNCERTAIN if both are used.
**Fix:** Audit dependencies and remove unused ones.

---

## Summary Risk Matrix

| ID | Severity | Category | Summary |
|----|----------|----------|---------|
| SEC-01 | 🔴 Critical | Security | Hardcoded DB credentials in source code |
| SEC-02 | 🔴 Critical | Security | Hardcoded password in `hash.js` |
| SEC-03 | 🔴 Critical | Security | Non-cryptographic OTP generation |
| SEC-04 | 🔴 Critical | Security | JWT in localStorage (XSS risk) |
| SEC-05 | 🔴 Critical | Security | CORS `origin: '*'` on all backends |
| SEC-06 | 🔴 Critical | Security | Runtime `.env` file writes for admin emails |
| SEC-07 | 🔴 Critical | Security | No rate limiting on login endpoint |
| SEC-08 | 🟠 High | Security | Production URLs committed to git |
| ARCH-01 | 🟠 High | Architecture | No database migrations |
| ARCH-02 | 🟠 High | Architecture | Duplicated auth middleware across services |
| ARCH-03 | 🟠 High | Architecture | Missing backend services (2 of 5) |
| ARCH-04 | 🟠 High | Architecture | No data caching layer |
| ARCH-05 | 🟠 High | Architecture | Massive single-file components (up to 2,403 lines) |
| ARCH-06 | 🟠 High | Architecture | No route-level code splitting |
| ARCH-07 | 🟠 High | Architecture | Inconsistent API client patterns |
| ARCH-08 | 🟠 High | Architecture | Express version mismatch (v4 vs v5) |
| QA-01 | 🟡 Medium | Quality | Zero automated tests |
| QA-02 | 🟡 Medium | Quality | TypeScript strict mode disabled |
| QA-03 | 🟡 Medium | Quality | Placements module not in TypeScript |
| QA-04 | 🟡 Medium | Quality | Duplicated UI component libraries |
| QA-05 | 🟡 Medium | Quality | Hardcoded localhost in email templates |
| QA-06 | 🟡 Medium | Quality | No token validation on hydration |
| QA-07 | 🟡 Medium | Quality | No code formatter |
| QA-08 | 🟡 Medium | Quality | Empty axios.ts file |
| ENH-01 | 🔵 Low | Enhancement | Unused dark mode package |
| ENH-02 | 🔵 Low | Enhancement | No error boundaries |
| ENH-03 | 🔵 Low | Enhancement | Missing accessibility attributes |
| ENH-04 | 🔵 Low | Enhancement | No server-side pagination |
| ENH-05 | 🔵 Low | Enhancement | Missing SEO meta tags |
| ENH-06 | 🔵 Low | Enhancement | Node.js version not pinned |
| ENH-07 | 🔵 Low | Enhancement | Missing health check endpoints |
| ENH-08 | 🔵 Low | Enhancement | Unused/duplicate dependencies |

---

## Recommended Priority Order

1. **Immediate (Day 1):** SEC-01, SEC-02 — Remove hardcoded credentials, rotate passwords
2. **This week:** SEC-03, SEC-05, SEC-07 — Fix OTP generation, CORS, add rate limiting
3. **This sprint:** ARCH-01, ARCH-03, QA-05 — Add migrations, add missing backends, fix email URLs
4. **Next sprint:** ARCH-05, ARCH-06, ARCH-07, QA-01 — Refactor large files, add code splitting, standardize APIs, add basic tests
5. **Ongoing:** QA-02, QA-04, SEC-04, ARCH-04 — Enable strict TS, deduplicate UI, improve auth, add caching

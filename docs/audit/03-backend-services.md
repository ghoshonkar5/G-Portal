# PART 03 — BACKEND SERVICES (EVERY ROUTE, CONTROLLER, MODEL)

## Auth Service (port 5003)

### Entry Point (`auth-service/src/server.js`)
- Express 5.2.1
- `cors()` with `origin: '*'` (permissive)
- `express.json()` + `express.urlencoded({ extended: true })`
- Static file serving: `/uploads` directory
- Route mounts:
  - `/api/auth` → `authRoutes.js`
  - `/api/admin` → `adminRoutes.js`
  - `/api/profile` → `profileRoutes.js`
- Health check endpoint: `GET /api/health`
- Default port: `process.env.PORT || 5003`

### Middleware

**`authMiddleware.js` → `protect`:**
1. Extract Bearer token from `Authorization` header
2. `jwt.verify(token, JWT_SECRET)` → get `decoded` payload
3. Query `SELECT token_version, is_active FROM users WHERE id = $1`
4. Check `is_active === true`
5. Check `token_version === decoded.tokenVersion` (session invalidation)
6. Attach `req.user = decoded`

**`authMiddleware.js` → `adminOnly` / `requireAdmin`:**
- Checks `req.user.role === 'admin'` (must run after `protect`)

### Routes & Controllers

#### Auth Routes (`routes/authRoutes.js`)

| Method | Path | Middleware | Controller | Description |
|--------|------|-----------|------------|-------------|
| POST | `/api/auth/register` | protect, requireAdmin | `authController.register` | Register new user (admin only) |
| POST | `/api/auth/login` | — | `authController.login` | Credential login |
| POST | `/api/auth/first-login/check-id` | — | `authController.checkFirstLoginId` | First login: validate ID |
| POST | `/api/auth/first-login/set-password` | — | `authController.setFirstLoginPassword` | First login: set new password |
| POST | `/api/auth/verify-otp` | — | `otpController.verifyOtp` | Verify OTP (returns JWT/setupToken/resetToken) |
| POST | `/api/auth/resend-otp` | — | `otpController.resendOtp` | Resend OTP (rate-limited) |
| POST | `/api/auth/google` | — | `googleController.handleGoogle` | Google OAuth login |
| POST | `/api/auth/forgot-password` | — | `passwordController.forgotPassword` | Forgot password: send OTP |
| POST | `/api/auth/reset-password` | — | `passwordController.resetPassword` | Reset password with reset token |
| GET | `/api/auth/me` | protect | `authController.getMe` | Get current user profile |
| POST | `/api/auth/logout-all` | protect | `authController.logoutAll` | Invalidate all sessions |
| POST | `/api/auth/google/link` | protect | `googleController.linkGoogle` | Link Google account |
| POST | `/api/auth/google/unlink` | protect | `googleController.unlinkGoogle` | Unlink Google account |

#### Admin Routes (`routes/adminRoutes.js`)

All routes prefixed with `protect` + `requireAdmin`:

| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/admin/users` | `adminController.createUser` | Create single user |
| POST | `/api/admin/users/bulk` | `adminController.bulkCreateUsers` | Bulk CSV import |
| GET | `/api/admin/users` | `adminController.listUsers` | List all users with search/filter |
| PATCH | `/api/admin/users/:id/status` | `adminController.toggleUserStatus` | Toggle active/inactive |
| DELETE | `/api/admin/users/:id` | `adminController.deleteUser` | Delete user |

#### Profile Routes (`routes/profileRoutes.js`)

| Method | Path | Middleware | Controller | Description |
|--------|------|-----------|------------|-------------|
| PUT | `/api/profile/onboarding` | protect | `profileController.onboarding` | Submit onboarding form |
| PUT | `/api/profile/urls` | protect | `profileController.updateProfileUrls` | Update academic URLs |

### Controller Details

#### `authController.js` — Core Auth Logic

**`login(req, res):`**
1. Extract `facultyId` + `password` from body
2. Query user by `faculty_id` (LEFT JOIN `faculty_profile`)
3. Check `is_active`
4. `bcrypt.compare(password, user.password)`
5. If `first_login === true`: send OTP (purpose: `first_login`), return `{ firstLogin: true, userId, requiresOtp: true }`
6. If not first_login: send OTP (purpose: `login`), return `{ requiresOtp: true, userId }`

**Key insight:** Login always requires OTP verification before issuing a JWT. The JWT is issued in `otpController.verifyOtp` — not in `login`.

**`checkFirstLoginId(req, res):`**
1. Validate `faculty_id` exists in DB
2. Check `first_login === true`
3. Send OTP (purpose: `first_login`)
4. Return `{ userId, requiresOtp: true }`

**`setFirstLoginPassword(req, res):`**
1. Verify `setupToken` (JWT with `purpose: 'setup'`, 15m TTL)
2. Validate password (≥8 chars, must match confirm)
3. Hash with bcrypt(10)
4. Update `password`, set `first_login = false`, increment `token_version`
5. Send welcome email
6. Return `{ success: true }` — user must log in again

**`getMe(req, res):`**
- Fetches full user + faculty_profile join
- Returns via `formatUser()`

**`logoutAll(req, res):`**
- Increments `token_version` in DB → invalidates all existing JWTs

#### `googleController.js` — Google OAuth

**`handleGoogle(req, res):`**
- Verifies Google `credential` (idToken) via `google-auth-library`
- Purpose-based branching:
  - `admin_login`: Check against `ADMIN_EMAILS` env or admin role in DB → return `{ googleVerified: true }`
  - `user_login` / `faculty_login` / `student_login`: Find user by email → auto-link Google ID if not linked → send OTP → return `{ requiresOtp: true }`
  - Admin gate: if user is admin, return `{ adminGate: true }` instead of OTP

**`linkGoogle(req, res):`**
- Verify Google token → check email matches user's portal email → update `google_id` + `google_linked_at`

**`unlinkGoogle(req, res):`**
- Set `google_id = NULL`, `google_linked_at = NULL`

#### `otpController.js` — OTP Verification

**`verifyOtp(req, res):`**
- Calls `verifyOTP(userId, otp, pool)` from `otpUtils.js`
- Purpose-based response:
  - `first_login` → return short-lived `setupToken` (15m)
  - `reset` → return short-lived `resetToken` (15m)
  - `login` / `admin_login` / `google_login` / `student_login` → return full JWT + formatted user
  - Also writes to `pl_user_sessions` table (fire-and-forget)

#### `passwordController.js` — Password Reset

**`forgotPassword(req, res):`**
- Validate ID + email match
- Daily rate limit: 3 resets per day (tracked in `password_reset_count` / `password_reset_reset_at`)
- Send OTP (purpose: `reset`)

**`resetPassword(req, res):`**
- Verify `resetToken` JWT (purpose: `reset`)
- Hash new password, update DB
- Increment `token_version` to invalidate all sessions
- Send confirmation email (non-blocking)

#### `adminController.js` — User Management

**`createUser(req, res):`**
1. Validate fields (role, facultyId, name, email)
2. Check uniqueness (faculty_id, email)
3. Hash password = `bcrypt(facultyId, 10)` (initial password = faculty ID)
4. INSERT into `users` with `first_login = true, profile_completed = false, is_active = true`
5. If faculty: INSERT into `faculty_profile`
6. If admin: append email to `ADMIN_EMAILS` in `.env` file (filesystem write)
7. Send account-created email

**`bulkCreateUsers(req, res):`**
- Parse CSV with `fast-csv`
- For each row: validate, hash, insert user + faculty_profile
- Collect errors per row, send emails for successful creations
- Return `{ created, errors }` summary

**`listUsers(req, res):`**
- LEFT JOIN `faculty_profile`
- Search: `name ILIKE $1 OR email ILIKE $1 OR faculty_id ILIKE $1`
- Filter: role, department, is_active
- Sort: name, email, created_at (ASC/DESC)

**`toggleUserStatus(req, res):`**
- Toggle `is_active` boolean
- If deactivating: increment `token_version` (immediate session invalidation)

**`deleteUser(req, res):`**
- DELETE from `faculty_profile` WHERE `user_id = $1`
- DELETE from `users` WHERE `id = $1`
- If admin: remove email from `ADMIN_EMAILS` in `.env` file

#### `profileController.js` — Onboarding

**`onboarding(req, res):`**
- Validates: department (12 values), designation (7 values), mobile (Indian 10-digit), years_of_experience (0–50), research_area, courses_taught, roles (all via `parseTagField`)
- Profile photo required
- Transaction: UPDATE `users` (department, designation, mobile, profile_completed=true) + UPDATE `faculty_profile` (research_area, courses_taught, roles, office_room, years_of_experience, profile_photo, all URL fields, profile_setup_complete=true)
- Issues new JWT with `profileCompleted: true`

### Utils

#### `emailService.js`
- Gmail SMTP via Nodemailer
- From: `"G-PORTAL" <GMAIL_USER>`
- 4 HTML email templates: OTP, Welcome, Password Reset Confirmation, Account Created
- Templates use hardcoded `localhost:5173` URLs — **not production-ready**

#### `otpUtils.js`
- 6-digit OTP (`Math.floor(100000 + Math.random() * 900000)`)
- **NOT cryptographically secure** — uses `Math.random()`
- 10-minute expiry
- 3 wrong attempts → 15-minute lockout
- Hourly rate limit: 50 OTP requests per hour
- `DEV_MODE === 'true'` → logs OTP to console instead of sending email

#### `jwtUtils.js`
- `generateToken(user)` — JWT payload: `{ id, facultyProfileId, facultyId, role, email, tokenVersion, profileCompleted, firstLogin }`
- Default expiry: `JWT_EXPIRES_IN || '7d'`
- `formatUser(row)` — normalizes DB row to API response (camelCase + snake_case aliases)

---

## Events Backend (port 5001)

### Entry Point (`events-backend/src/server.js`)
- Express 5.2.1
- `cors()` with `origin: process.env.FRONTEND_URL || '*'`
- Static file serving: `/uploads` directory
- Route mounts:
  - `/api/events/events` → `eventRoutes.js`
  - `/api/events/faculty` → `facultyRoutes.js`
  - `/api/events/auth` → `authRoutes.js`
  - `/api/events/export` → `exportRoutes.js`
- Default port: `process.env.PORT || 5000`

### Middleware

**`authMiddleware.js` → `verifyToken`:**
- Same pattern as auth-service: Bearer token → `jwt.verify` → check `token_version` + `is_active` against shared `users` table → attach `req.user`

**`roleMiddleware.js` → `verifyRole(...allowedRoles)`:**
- Variadic role check: `allowedRoles.includes(req.user.role)`

**`uploadMiddleware.js` → multer:**
- Disk storage to `uploads/` directory
- Filename: `${Date.now()}-${fieldname}${ext}`
- File filter: JPEG, PNG, WebP, PDF, CSV
- Max file size: 10MB

### Routes

#### Event Routes (`routes/eventRoutes.js`)

| Method | Path | Role | Controller | Uploads | Description |
|--------|------|------|-----------|---------|-------------|
| GET | `/events/mine` | faculty | `getMine` | — | Faculty's own events |
| GET | `/events/mine/export` | faculty | `mineExport` | — | Export own events |
| POST | `/events` | faculty | `createEvent` | certificates(5), photos(10) | Create event |
| PUT | `/events/:id/deadline` | faculty | `setSingleDeadline` | — | Set doc deadline |
| PUT | `/events/:id` | faculty | `updateEvent` | certificates(5), photos(10) | Update event |
| DELETE | `/events/:id` | faculty | `deleteEvent` | — | Delete event |
| POST | `/events/bulk-import` | faculty | `bulkImport` | file(1) | CSV bulk import |
| PUT | `/events/batch/:batchId/deadline` | faculty | `setBatchDeadline` | — | Batch doc deadline |
| GET | `/events/all` | admin | `getAll` | — | All faculty events |
| GET | `/events/export` | admin | `adminExport` | — | Export all events |

#### Faculty Routes (`routes/facultyRoutes.js`)

| Method | Path | Role | Controller | Description |
|--------|------|------|-----------|-------------|
| GET | `/faculty` | admin | `listFaculty` | List all faculty |
| POST | `/faculty` | admin | `createFaculty` | Create faculty user |
| GET | `/faculty/me` | any auth | `getMe` | Current faculty profile |
| PUT | `/faculty/me` | faculty | `updateProfile` | Update profile |
| PUT | `/faculty/me/password` | faculty | `changePassword` | Change password |

---

## Publications Backend (port 5000)

### Entry Point (`publications-backend/src/server.js`)
- Express 4.21.2 (older version than auth/events)
- `cors()` with `origin: '*'`
- 11 route mounts:
  - `/api/auth` → `authRoutes.js`
  - `/api/publications` → `publicationRoutes.js`
  - `/api/conferences` → `conferenceRoutes.js`
  - `/api/books` → `bookRoutes.js`
  - `/api/scopus` → `scopusRoutes.js`
  - `/api/wos` → `wosRoutes.js`
  - `/api/scholar` → `scholarRoutes.js`
  - `/api/flags` → `flagRoutes.js`
  - `/api/potential-flags` → `potentialFlagRoutes.js`
  - `/api/krc` → `krcRoutes.js`
  - `/api/journal-rankings` → `journalRankingsRoutes.js`
  - `/api/admin-stats` → `adminStatsRoutes.js`
- **Cron jobs (node-cron):**
  - Scopus sync: `0 2 * * *` (2:00 AM IST daily) → `syncAll()` from `scopusController.js`
  - WoS sync: `30 3 * * *` (3:30 AM IST daily) → `syncAll()` from `wosController.js`
- Default port: `process.env.PORT || 5000`

### Middleware

**`authMiddleware.js`:**
- `protect` — identical pattern to auth-service (JWT verify + token_version check on shared DB)
- `adminOnly` — checks `req.user.role === 'admin'`

### Routes — Full Table

#### Auth Routes (Publications)

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/auth/me` | protect | Get current user (publications profile) |
| PUT | `/api/auth/profile` | protect | Update profile |
| PUT | `/api/auth/profile-urls` | protect | Update academic URLs |
| GET | `/api/auth/faculty` | protect | List all faculty |
| PUT | `/api/auth/admin/faculty/:id` | protect | Admin update faculty |
| PATCH | `/api/auth/admin/faculty/:id/deactivate` | protect | Deactivate faculty |
| GET | `/api/auth/faculty-list` | protect | Simple faculty name/id list |

#### Publication Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/publications` | protect | List all (filters: academicYear, quartile) |
| GET | `/api/publications/export/csv` | protect | Export CSV |
| GET | `/api/publications/faculty/:facultyId` | protect | By faculty |
| GET | `/api/publications/stats/:facultyId` | protect | Publication stats |
| GET | `/api/publications/:id` | protect | Single publication |
| POST | `/api/publications` | protect | Create |
| PUT | `/api/publications/:id` | protect | Update |
| DELETE | `/api/publications/:id` | protect | Delete |

#### Scopus Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/scopus/preview/:facultyId` | protect | Preview from Scopus API |
| POST | `/api/scopus/import/:facultyId` | protect | Import selected |
| POST | `/api/scopus/sync/:facultyId` | protect | Quick sync all |
| POST | `/api/scopus/sync-all` | protect | Admin: nightly sync all faculty |
| POST | `/api/scopus/backfill-conference-citations` | protect | Backfill conference citations |
| GET | `/api/scopus/metrics/:facultyId` | protect | Author-level metrics |
| GET | `/api/scopus/last-synced/:facultyId` | protect | Last sync timestamp |
| GET | `/api/scopus/yearly-stats/:facultyId` | protect | Yearly stats chart |

#### WoS Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/wos/preview/:facultyId` | protect | Preview from WoS API |
| POST | `/api/wos/import/:facultyId` | protect | Import selected |
| POST | `/api/wos/sync/:facultyId` | protect | Quick sync all |
| POST | `/api/wos/sync-all` | protect | Admin: nightly sync all faculty |
| GET | `/api/wos/metrics/:facultyId` | protect | Author-level metrics |
| GET | `/api/wos/last-synced/:facultyId` | protect | Last sync timestamp |
| GET | `/api/wos/yearly-stats/:facultyId` | protect | Yearly stats chart |

#### Scholar Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/scholar/preview/:facultyId` | protect | Preview Scholar profile |
| GET | `/api/scholar/metrics/:facultyId` | protect | Scholar metrics (6 metrics + yearly citations) |
| POST | `/api/scholar/import/:facultyId` | protect | Import selected |
| POST | `/api/scholar/import-csv/:facultyId` | protect | Import from CSV |

#### Flag Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| POST | `/api/flags` | protect | Create flags (batch) |
| GET | `/api/flags` | protect | List all flags |
| GET | `/api/flags/faculty/:facultyId` | protect | Flags for a faculty (active) |
| GET | `/api/flags/faculty/:facultyId/history` | protect | All flags for a faculty (incl. resolved) |
| GET | `/api/flags/item/:itemType/:itemId` | protect | Flags for a specific item |
| PUT | `/api/flags/:flagId/resolve` | protect | Mark flag as resolved |
| PUT | `/api/flags/:flagId/approve` | protect | Approve resolution |
| PUT | `/api/flags/:flagId/reflag` | protect | Re-flag (reopen) |
| DELETE | `/api/flags/:flagId` | protect | Delete flag |
| GET | `/api/flags/:flagId/history` | protect | Flag history (inline handler) |

#### Potential Flag Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/potential-flags/faculty/:facultyId` | protect | By faculty (active) |
| GET | `/api/potential-flags/faculty/:facultyId/history` | protect | All (incl. resolved) |
| GET | `/api/potential-flags/all` | protect, adminOnly | All potential flags |
| PUT | `/api/potential-flags/:id/resolve` | protect | Resolve |
| POST | `/api/potential-flags/:id/escalate` | protect, adminOnly | Escalate to flag |

#### KRC Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| POST | `/api/krc/import-csv` | protect, adminOnly | Import CSV (multer, 50MB) |
| DELETE | `/api/krc/clear` | protect, adminOnly | Clear all KRC data |
| GET | `/api/krc/stats` | protect | KRC statistics |
| GET | `/api/krc/faculty/:id` | protect | KRC for specific faculty |

#### Journal Rankings Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| POST | `/api/journal-rankings/import-csv` | protect, adminOnly | Import Scimago CSV (50MB) |
| GET | `/api/journal-rankings/stats` | protect | Stats |
| POST | `/api/journal-rankings/backfill-quartiles` | protect, adminOnly | Backfill quartiles |
| DELETE | `/api/journal-rankings/year/:year` | protect, adminOnly | Delete by year |
| DELETE | `/api/journal-rankings/all` | protect, adminOnly | Delete all |

#### Book Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/books/export/csv` | protect | Export CSV |
| GET | `/api/books` | protect | List all |
| GET | `/api/books/faculty/:facultyId` | protect | By faculty |
| POST | `/api/books` | protect | Create |
| PUT | `/api/books/:id` | protect | Update |
| DELETE | `/api/books/:id` | protect | Delete |

#### Conference Routes

Same pattern as books: list all, by faculty, create, update, delete, export CSV.

#### Admin Stats Routes

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/admin-stats/timeseries` | protect | Publications over time |
| GET | `/api/admin-stats/quartile-distribution` | protect | Q1/Q2/Q3/Q4 pie data |
| GET | `/api/admin-stats/by-department` | protect | Department breakdown |
| GET | `/api/admin-stats/top-contributors` | protect | Top publishing faculty |
| GET | `/api/admin-stats/overview-counts` | protect | Total counts |

### Cron Jobs (publications-backend)

**Scopus Nightly Sync (`0 2 * * *`):**
- `scopusController.syncAll()` → iterates all faculty with `scopus_author_id` → queries Scopus API → upserts new publications into `publications` table

**WoS Nightly Sync (`30 3 * * *`):**
- `wosController.syncAll()` → iterates all faculty with WoS researcher ID → queries Clarivate API → upserts new publications

### External API Integration Patterns

**Scopus Controller (1,119 lines):**
- Uses Elsevier Scopus API (`api.elsevier.com`)
- Extracts Scopus Author ID from faculty profile URLs
- `previewScopus` → fetches publications, maps to internal format
- `importScopus` → saves selected publications to DB
- `syncScopus` → auto-import all for a faculty
- `getMetrics` → author-level metrics (h-index, citation count, document count)
- Citation count stored as `scopus_citation_count` on faculty record (author-level, not per-paper sum)

**WoS Controller (1,001 lines):**
- Uses Clarivate Web of Science Expanded API
- Same preview → import → sync pattern
- Stores `wos_citation_count`, `wos_h_index`, `wos_document_count` on faculty

**Scholar Controller (594 lines):**
- Uses SerpAPI to scrape Google Scholar profiles
- `previewScholar` → parses publications from Scholar HTML via SerpAPI
- `getScholarMetrics` → returns citations, h-index, i10-index (all + recent5yr)

---

## Missing Backends

### Achievements Backend (port 5004)
**NOT FOUND** in the repository. The frontend module (`modules/achievements/`) has full API calls defined in `achievementsApi.ts` targeting endpoints like:
- `/api/achievements/mine`, `/api/achievements`, `/api/achievements/students`, `/api/achievements/all`
- `/api/users/me`
- `/api/export/my-achievements`, `/api/export/my-students`, `/api/export/all`

The Vite proxy routes these to port 5004, but no backend source code exists.

### Placements Backend (port 5005)
**NOT FOUND** in the repository. The frontend module (`modules/placements/`) has API calls in `lib/api.js` targeting:
- `/api/placements/auth/me`, `/api/placements/companies`, `/api/placements/submissions`
- `/api/placements/comments`
- `/api/placements/analytics/*` (6 endpoints)

The Vite proxy routes these to port 5005 (with path rewrite: `/api/placements` → `/api`), but no backend source code exists.

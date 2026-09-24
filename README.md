<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
</p>

# G-Portal

**A unified academic management platform for GITAM University — tracking faculty publications, events, research metrics, achievements, and placements across a distributed microservice architecture.**

---

## 📋 Overview

G-Portal (G-Learn) is a full-stack academic management system purpose-built for GITAM University. It consolidates faculty publications, institutional events, research impact metrics, student achievements, and placement records into a single, data-driven platform.

**Who uses it:**
- **Faculty** — manage publications, track citation metrics across Scopus/WoS/Google Scholar, submit events and achievements, and respond to administrative flags on their records.
- **Admins** — bulk-import users, trigger nightly data syncs, flag questionable publications, monitor institution-wide analytics dashboards, and manage journal rankings.
- **Students** — access placement resources and institutional event information through a clean, role-gated interface.

**Why it was built:** GITAM's academic data was fragmented across spreadsheets, disconnected portals, and manual processes. G-Portal unifies everything under one roof with automated nightly syncs to Scopus and Web of Science, DOI-based deduplication across three indexing sources, and an AI-powered research trend analyzer — eliminating hours of manual data reconciliation.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENTS (Browser)                            │
│                    React 19 + TypeScript + Vite 8                     │
│              Deployed on Vercel  ·  Tailwind CSS 4                   │
└─────────────┬───────────────┬───────────────┬────────────────────────┘
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│   Auth Service  │ │  Events Backend │ │   Publications Backend      │
│   (Port 5003)   │ │   (Port 5001)   │ │       (Port 5000)           │
│                 │ │                 │ │                             │
│  Express 5.x    │ │  Express 5.x    │ │  Express 4.x               │
│  JWT + OTP      │ │  CSV Import     │ │  Scopus · WoS · Scholar    │
│  Google OAuth   │ │  File Uploads   │ │  Cron Sync · Flags · AI    │
│  Rate Limiting  │ │  Excel Export   │ │  Journal Rankings · KRC    │
└────────┬────────┘ └────────┬────────┘ └────────────┬────────────────┘
         │                   │                        │
         └───────────────────┼────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   Neon PostgreSQL (Shared)    │
              │   Serverless · Connection     │
              │   Pooling via -pooler         │
              │   sslmode=require             │
              └──────────────────────────────┘
```

| Service               | Render Deployment URL                             |
|-----------------------|---------------------------------------------------|
| Auth Service          | `https://g-learn-auth.onrender.com`               |
| Events Backend        | `https://g-learn-events.onrender.com`             |
| Publications Backend  | `https://g-learnpublications.onrender.com`        |

---

## 🛠️ Tech Stack

| Service                  | Technology                                                                                              |
|--------------------------|---------------------------------------------------------------------------------------------------------|
| **Auth Service**         | Node.js, Express 5.x, bcryptjs, jsonwebtoken, Nodemailer, Google OAuth (`google-auth-library`), `express-rate-limit`, `express-validator`, Helmet |
| **Events Backend**       | Node.js, Express 5.x, fast-csv, ExcelJS, Multer, Helmet                                                |
| **Publications Backend** | Node.js, Express 4.x, node-cron, Cloudinary, Multer, xlsx, Helmet, SerpAPI, Scopus API, Clarivate WoS API, Gemini API |
| **Frontend**             | React 19, TypeScript 6.0, Vite 8, Tailwind CSS 4, Axios, Framer Motion, Recharts, Chart.js, Radix UI, Lucide Icons, React Hook Form, Sonner |
| **Database**             | Neon PostgreSQL (serverless, connection pooling)                                                        |
| **Infrastructure**       | Render (backends), Vercel (frontend), Neon (database)                                                   |

---

## ✨ Key Features

### JWT Token Versioning for Session Invalidation
Rather than maintaining a Redis blacklist or relying on pure stateless JWTs, G-Portal implements a DB-backed **Token Versioning** system. Every user row has a `token_version` integer column. Every authenticated API request executes a lightweight `SELECT token_version FROM users WHERE id = $1` to verify the token's embedded version matches the database. Any password change, account deactivation, or "logout all sessions" action increments the version — immediately invalidating every outstanding JWT across all three microservices without requiring inter-service communication or a shared cache.

### OTP Lifecycle with Strict Rate Limiting
OTP generation uses Node.js's cryptographically secure `crypto.randomInt(100000, 999999)` (migrated from the predictable `Math.random()`). The OTP lifecycle enforces a strict **50-attempt-per-hour** rate limit per user. After **3 consecutive failed verifications**, a **15-minute lockout** is imposed before new OTPs can be requested or verified. All OTP events — generation, verification, failure, and lockout — are captured by the structured security logger with timestamps and IP addresses.

### Two-Step Admin Google Gate
Admin access requires a two-phase verification gate. First, the admin must authenticate via their **Google Workspace** account (verified against an `ADMIN_EMAILS` environment variable whitelist using `google-auth-library`). Only after successful Google verification are they permitted to proceed to the standard ID/Password + OTP login flow. This dual-gate design ensures that even if admin credentials leak, access is impossible without the corresponding Google Workspace identity.

### Nightly Scopus and WoS Cron Sync
Two independent `node-cron` jobs automatically synchronize publication data every night. **Scopus sync runs at 2:00 AM IST** and **WoS sync at 3:30 AM IST** (offset by 90 minutes to avoid API rate limit overlap). Each sync iterates over all faculty with configured Scopus Author IDs or ORCID IDs, fetches their latest publications from the respective APIs, deduplicates against existing records, enriches metadata (citations, journal quartiles, author positions), and logs sync timestamps to `scopus_sync_log` / `wos_sync_log` tables.

### DOI-Based Deduplication Across Three Sources
When importing publications from Scopus, Web of Science, or Google Scholar, the system resolves duplicates using a cascading strategy: **DOI match first** (exact), then **normalized title match** (case-insensitive, punctuation-stripped). When a match is found, the existing record is enriched rather than duplicated — updating citation counts, adding the new indexing source, and preserving the original faculty association. This ensures a single publication appearing in all three databases is represented as one record with three source attributions.

### 5-Level Cascading Scimago Quartile Lookup
Journal quartile assignment uses a **5-level cascading match** against the Scimago journal rankings database (imported via CSV). The lookup attempts to match by: (1) exact ISSN, (2) exact eISSN, (3) normalized journal title, (4) partial title match, and (5) publisher-based fallback. When a publication is imported, its journal is automatically classified as Q1–Q4 based on the most recent Scimago data, with the specific match level recorded for audit transparency.

### Polymorphic Flags with Status Machine
The `flags` table implements a **polymorphic association** pattern (`item_type` + `item_id`) that can reference `publications`, `conferences`, or `books_chapters`. Each flag follows a strict status machine: **`flagged` → `pending_review` → `resolved`**, with a `reflag` action that reopens resolved flags. The complete history of status transitions is preserved in the `flag_history` table. Auto-detection flags are generated during import for publications missing critical metadata (title, journal, date), while admins can create manual flags with custom comments.

### PostgreSQL Savepoints for Bulk User Import
Bulk user creation via CSV (up to **500 rows per batch**) uses PostgreSQL `SAVEPOINT`s to achieve **per-row rollback isolation**. Each row in the CSV is wrapped in its own savepoint within a single transaction. If a row fails validation (duplicate faculty ID, malformed email), only that savepoint is rolled back — the remaining 499 rows commit successfully. The response includes a detailed breakdown of successful inserts, skipped duplicates, and failed rows with error messages.

### Two-Phase CSV Preview + Commit for Events
Event bulk import follows a **Preview → Commit** workflow. In the preview phase, the uploaded CSV is parsed with `fast-csv`, validated row-by-row, and returned to the admin with a complete preview showing which rows will be imported and which have validation errors — without writing anything to the database. Only after admin review and explicit confirmation does the commit phase persist the validated rows, again using per-row savepoints for fault isolation.

### AI-Powered Research Trend Analyzer
An admin-only endpoint (`POST /api/admin/ai/trends`) feeds aggregated publication and citation data to the **Google Gemini API** to generate institutional research trend analysis. The AI identifies emerging research areas, top-performing departments, citation velocity trends, and strategic recommendations — providing data-driven insights that would be impossible to extract from raw spreadsheet data.

---

## 📦 Module Breakdown

| Module                     | Ownership                                                                                                                                 |
|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| **Auth Service**           | User registration, login (ID/Password + OTP), first-login setup flow, password reset, Google OAuth link/unlink, logout-all session kill, admin user CRUD, bulk user CSV import, profile onboarding, profile photo upload |
| **Events Backend**         | Event CRUD (with certificate/photo uploads), faculty-scoped and admin-scoped event listings, CSV bulk import (preview + commit), batch and single deadline management, Excel/CSV export, faculty profile sync |
| **Publications Backend**   | Publication/Conference/Book CRUD, Scopus preview/import/sync, WoS preview/import/sync, Google Scholar scraping + import, nightly cron syncs, DOI deduplication, polymorphic flags + potential flags, flag history + status machine, Scimago journal ranking import + quartile backfill, KRC score import + stats, admin analytics dashboard (timeseries, quartile distribution, department breakdown, top contributors), AI trend analysis (Gemini), CSV export for all entity types |
| **Frontend — Events**      | Event submission form, event list/grid views, bulk CSV upload wizard, deadline calendar, certificate viewer                                |
| **Frontend — Publications**| Publication/conference/book dashboards, Scopus/WoS/Scholar sync UIs, citation charts (Recharts), flag resolution workflow, journal quartile badges |
| **Frontend — Achievements**| Achievement submission, certificate upload, admin approval workflow *(Port 5004 — in development)*                                         |
| **Frontend — Placements**  | Placement records, session tracking, company-wise analytics *(Port 5005 — in development)*                                                |

---

## 🔌 API Endpoints Summary

### Auth Service (`:5003`)

| Method   | Path                             | Auth     | Description                                    |
|----------|----------------------------------|----------|------------------------------------------------|
| `POST`   | `/api/auth/register`             | Admin    | Create a new user                              |
| `POST`   | `/api/auth/login`                | Public   | Login with ID/Password (rate-limited: 10/15min)|
| `POST`   | `/api/auth/first-login/check-id` | Public   | Check if faculty ID exists for first login     |
| `POST`   | `/api/auth/first-login/set-password` | Public | Set password on first login                   |
| `POST`   | `/api/auth/verify-otp`           | Public   | Verify 6-digit OTP                             |
| `POST`   | `/api/auth/resend-otp`           | Public   | Resend OTP to email                            |
| `POST`   | `/api/auth/google`               | Public   | Google OAuth login/verification                |
| `POST`   | `/api/auth/forgot-password`      | Public   | Send password reset email                      |
| `POST`   | `/api/auth/reset-password`       | Public   | Reset password with token                      |
| `GET`    | `/api/auth/me`                   | JWT      | Get current user profile                       |
| `POST`   | `/api/auth/logout-all`           | JWT      | Invalidate all sessions (token version bump)   |
| `POST`   | `/api/auth/google/link`          | JWT      | Link Google account to profile                 |
| `POST`   | `/api/auth/google/unlink`        | JWT      | Unlink Google account                          |
| `PUT`    | `/api/profile/onboarding`        | JWT      | Complete profile onboarding                    |
| `PUT`    | `/api/profile/urls`              | JWT      | Update Scholar/Scopus profile URLs             |
| `POST`   | `/api/admin/users`               | Admin    | Create single user                             |
| `POST`   | `/api/admin/users/bulk`          | Admin    | Bulk create users via CSV (max 500)            |
| `GET`    | `/api/admin/users`               | Admin    | List all users                                 |
| `PATCH`  | `/api/admin/users/:id/status`    | Admin    | Toggle user active/inactive status             |
| `DELETE` | `/api/admin/users/:id`           | Admin    | Delete a user                                  |

### Events Backend (`:5001`)

| Method   | Path                                    | Auth      | Description                               |
|----------|-----------------------------------------|-----------|-------------------------------------------|
| `GET`    | `/api/events/mine`                      | Faculty   | Get own events                            |
| `GET`    | `/api/events/mine/export`               | Faculty   | Export own events as CSV/Excel            |
| `POST`   | `/api/events`                           | Faculty   | Create event (with file uploads)          |
| `PUT`    | `/api/events/:id`                       | Faculty   | Update event                              |
| `DELETE` | `/api/events/:id`                       | Faculty   | Delete event                              |
| `PUT`    | `/api/events/:id/deadline`              | Faculty   | Set deadline for single event             |
| `PUT`    | `/api/events/batch/:batchId/deadline`   | Faculty   | Set deadline for event batch              |
| `POST`   | `/api/events/bulk-import`               | Faculty   | Bulk import events via CSV                |
| `GET`    | `/api/events/all`                       | Admin     | Get all events (admin view)               |
| `GET`    | `/api/events/export`                    | Admin     | Export all events                         |
| `GET`    | `/api/faculty`                          | Admin     | List all faculty                          |
| `POST`   | `/api/faculty`                          | Admin     | Create faculty record                     |
| `GET`    | `/api/faculty/me`                       | JWT       | Get own faculty profile                   |
| `PUT`    | `/api/faculty/me`                       | Faculty   | Update own profile                        |
| `PUT`    | `/api/faculty/me/password`              | Faculty   | Change password                           |
| `GET`    | `/api/health`                           | Public    | Health check                              |

### Publications Backend (`:5000`)

| Method   | Path                                          | Auth     | Description                                         |
|----------|-----------------------------------------------|----------|-----------------------------------------------------|
| `GET`    | `/api/publications`                           | JWT      | Get all publications                                |
| `GET`    | `/api/publications/export/csv`                | JWT      | Export publications as CSV                          |
| `GET`    | `/api/publications/faculty/:facultyId`        | JWT      | Get publications by faculty                         |
| `GET`    | `/api/publications/stats/:facultyId`          | JWT      | Get publication stats for faculty                   |
| `GET`    | `/api/publications/:id`                       | JWT      | Get single publication                              |
| `POST`   | `/api/publications`                           | JWT      | Create publication                                  |
| `PUT`    | `/api/publications/:id`                       | JWT      | Update publication                                  |
| `DELETE` | `/api/publications/:id`                       | JWT      | Delete publication                                  |
| `GET`    | `/api/scopus/preview/:facultyId`              | JWT      | Preview Scopus publications (no save)               |
| `POST`   | `/api/scopus/import/:facultyId`               | JWT      | Import selected Scopus publications                 |
| `POST`   | `/api/scopus/sync/:facultyId`                 | JWT      | Quick sync all Scopus for a faculty                 |
| `POST`   | `/api/scopus/sync-all`                        | JWT      | Trigger nightly Scopus sync for all faculty         |
| `POST`   | `/api/scopus/backfill-conference-citations`    | JWT      | Backfill conference citations from Scopus           |
| `GET`    | `/api/scopus/metrics/:facultyId`              | JWT      | Scopus author metrics (h-index, citations)          |
| `GET`    | `/api/scopus/last-synced/:facultyId`          | JWT      | Last Scopus sync timestamp                          |
| `GET`    | `/api/scopus/yearly-stats/:facultyId`         | JWT      | Yearly Scopus stats for charts                      |
| `GET`    | `/api/wos/preview/:facultyId`                 | JWT      | Preview WoS publications                            |
| `POST`   | `/api/wos/import/:facultyId`                  | JWT      | Import selected WoS publications                    |
| `POST`   | `/api/wos/sync/:facultyId`                    | JWT      | Quick sync all WoS for a faculty                    |
| `POST`   | `/api/wos/sync-all`                           | JWT      | Trigger nightly WoS sync for all faculty            |
| `GET`    | `/api/wos/metrics/:facultyId`                 | JWT      | WoS author metrics                                  |
| `GET`    | `/api/wos/last-synced/:facultyId`             | JWT      | Last WoS sync timestamp                             |
| `GET`    | `/api/wos/yearly-stats/:facultyId`            | JWT      | Yearly WoS stats for charts                         |
| `GET`    | `/api/scholar/preview/:facultyId`             | JWT      | Preview Google Scholar publications                 |
| `GET`    | `/api/scholar/metrics/:facultyId`             | JWT      | Scholar metrics (h-index, i10-index, citations)     |
| `POST`   | `/api/scholar/import/:facultyId`              | JWT      | Import selected Scholar publications                |
| `POST`   | `/api/scholar/import-csv/:facultyId`          | JWT      | Import from uploaded Scholar/Scopus CSV             |
| `GET`    | `/api/conferences/export/csv`                 | JWT      | Export conferences as CSV                           |
| `GET`    | `/api/conferences`                            | JWT      | Get all conferences                                 |
| `GET`    | `/api/conferences/faculty/:facultyId`         | JWT      | Get conferences by faculty                          |
| `POST`   | `/api/conferences`                            | JWT      | Create conference                                   |
| `PUT`    | `/api/conferences/:id`                        | JWT      | Update conference                                   |
| `DELETE` | `/api/conferences/:id`                        | JWT      | Delete conference                                   |
| `GET`    | `/api/books/export/csv`                       | JWT      | Export books as CSV                                 |
| `GET`    | `/api/books`                                  | JWT      | Get all books/chapters                              |
| `GET`    | `/api/books/faculty/:facultyId`               | JWT      | Get books by faculty                                |
| `POST`   | `/api/books`                                  | JWT      | Create book/chapter                                 |
| `PUT`    | `/api/books/:id`                              | JWT      | Update book/chapter                                 |
| `DELETE` | `/api/books/:id`                              | JWT      | Delete book/chapter                                 |
| `POST`   | `/api/flags`                                  | JWT      | Create flags on publications/conferences/books      |
| `GET`    | `/api/flags`                                  | JWT      | Get all flags                                       |
| `GET`    | `/api/flags/faculty/:facultyId`               | JWT      | Get active flags for faculty                        |
| `GET`    | `/api/flags/faculty/:facultyId/history`       | JWT      | Get full flag history for faculty                   |
| `GET`    | `/api/flags/item/:itemType/:itemId`           | JWT      | Get flags for a specific item                       |
| `PUT`    | `/api/flags/:flagId/resolve`                  | JWT      | Mark flag as resolved                               |
| `PUT`    | `/api/flags/:flagId/approve`                  | JWT      | Approve flag resolution                             |
| `PUT`    | `/api/flags/:flagId/reflag`                   | JWT      | Reflag a resolved flag                              |
| `DELETE` | `/api/flags/:flagId`                          | JWT      | Delete a flag                                       |
| `GET`    | `/api/flags/:flagId/history`                  | JWT      | Get status history of a flag                        |
| `GET`    | `/api/potential-flags/faculty/:facultyId`     | JWT      | Get potential flags for faculty                     |
| `GET`    | `/api/potential-flags/faculty/:facultyId/history` | JWT  | Full potential flag history                         |
| `GET`    | `/api/potential-flags/all`                    | Admin    | Get all potential flags                             |
| `PUT`    | `/api/potential-flags/:id/resolve`            | JWT      | Resolve a potential flag                            |
| `POST`   | `/api/potential-flags/:id/escalate`           | Admin    | Escalate potential flag to formal flag              |
| `POST`   | `/api/journal-rankings/import-csv`            | Admin    | Import Scimago rankings CSV (up to 50MB)            |
| `GET`    | `/api/journal-rankings/stats`                 | JWT      | Get journal ranking statistics                      |
| `POST`   | `/api/journal-rankings/backfill-quartiles`    | Admin    | Backfill quartiles for all publications             |
| `DELETE` | `/api/journal-rankings/year/:year`            | Admin    | Delete rankings for a year                          |
| `DELETE` | `/api/journal-rankings/all`                   | Admin    | Delete all rankings                                 |
| `POST`   | `/api/krc/import-csv`                         | Admin    | Import KRC scores CSV                               |
| `DELETE` | `/api/krc/clear`                              | Admin    | Clear all KRC data                                  |
| `GET`    | `/api/krc/stats`                              | JWT      | Get KRC statistics                                  |
| `GET`    | `/api/krc/faculty/:id`                        | JWT      | Get KRC scores for a faculty                        |
| `GET`    | `/api/admin/stats/timeseries`                 | JWT      | Publication timeseries data                         |
| `GET`    | `/api/admin/stats/quartile-distribution`      | JWT      | Quartile distribution breakdown                     |
| `GET`    | `/api/admin/stats/by-department`              | JWT      | Department-wise distribution                        |
| `GET`    | `/api/admin/stats/top-contributors`           | JWT      | Top contributing faculty                            |
| `GET`    | `/api/admin/stats/overview-counts`            | JWT      | Overview count statistics                           |
| `POST`   | `/api/admin/ai/trends`                        | Admin    | AI-powered research trend analysis (Gemini)         |
| `GET`    | `/api/auth/me`                                | JWT      | Get current user (publications context)             |
| `PUT`    | `/api/auth/profile`                           | JWT      | Update faculty profile                              |
| `PUT`    | `/api/auth/profile-urls`                      | JWT      | Update Scholar/Scopus URLs                          |
| `GET`    | `/api/auth/faculty`                           | JWT      | Get all faculty                                     |
| `GET`    | `/api/auth/faculty-list`                      | JWT      | Get faculty ID + name list                          |
| `PUT`    | `/api/auth/admin/faculty/:id`                 | JWT      | Admin update faculty record                         |
| `PATCH`  | `/api/auth/admin/faculty/:id/deactivate`      | JWT      | Deactivate faculty account                          |
| `GET`    | `/api/health`                                 | Public   | Health check                                        |

---

## 🗄️ Database Schema Summary

G-Portal uses a single shared **Neon PostgreSQL** database with **14 tables**:

| Table                | Description                                                                                     |
|----------------------|-------------------------------------------------------------------------------------------------|
| `users`              | Core user credentials, roles (student/faculty/admin), OTP state, token version, lockout timers  |
| `faculty_profile`    | Public academic identity — Scholar URL, Scopus Author ID, ORCID, department, designation        |
| `publications`       | Journal articles with DOI, citations, quartile, indexing sources (Scopus/WoS/Scholar flags)     |
| `conferences`        | Conference papers with proceedings info, citations, and Scopus EID                              |
| `books_chapters`     | Book and book chapter records with ISBN, publisher, and citation data                           |
| `events`             | Faculty-submitted events with certificates, photos, deadlines, and batch IDs                    |
| `flags`              | Polymorphic admin flags on publications/conferences/books (`item_type` + `item_id`)             |
| `flag_history`       | Audit trail of flag status transitions (flagged → pending_review → resolved → reflagged)        |
| `potential_flags`    | Auto-detected issues on imported publications (missing metadata), pre-escalation                 |
| `journal_rankings`   | Scimago journal ranking data (ISSN, quartile, SJR score) imported via CSV                       |
| `krc_scores`         | KRC (Key Result Contribution) scores per faculty, imported via CSV/Excel                        |
| `pl_user_sessions`   | Placement module user session tracking                                                          |
| `scopus_sync_log`    | Timestamp and result log for nightly Scopus sync per faculty                                    |
| `wos_sync_log`       | Timestamp and result log for nightly WoS sync per faculty                                       |

---

## 🔐 Environment Variables

### Auth Service (`:5003`)

| Variable              | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| `DATABASE_URL`        | Neon PostgreSQL connection string (with `-pooler` and `sslmode=require`) |
| `JWT_SECRET`          | Secret key for signing JWTs                                  |
| `JWT_EXPIRES_IN`      | Token expiry duration (e.g., `7d`)                           |
| `ADMIN_EMAILS`        | Comma-separated Google Workspace emails authorized for admin |
| `GMAIL_USER`          | Gmail address for sending OTP emails via Nodemailer          |
| `GMAIL_APP_PASSWORD`  | Gmail App Password (not account password)                    |
| `GOOGLE_CLIENT_ID`    | Google OAuth 2.0 Client ID for workspace verification        |
| `DEV_MODE`            | Enables OTP bypass for development (`true` / `false`)        |
| `FRONTEND_URL`        | Frontend origin for CORS and email template links            |

### Publications Backend (`:5000`)

| Variable              | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| `DATABASE_URL`        | Neon PostgreSQL connection string                            |
| `JWT_SECRET`          | Secret key for verifying JWTs (must match Auth Service)      |
| `SCOPUS_API_KEY`      | Elsevier Scopus API key for publication fetching             |
| `WOS_API_KEY`         | Clarivate Web of Science Expanded API key                    |
| `SERPAPI_KEY`         | SerpAPI key for Google Scholar scraping fallback             |
| `GEMINI_API_KEY`      | Google Gemini API key for AI trend analysis                  |
| `FRONTEND_URL`        | Frontend origin for CORS                                     |

### Events Backend (`:5001`)

| Variable              | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| `DATABASE_URL`        | Neon PostgreSQL connection string                            |
| `JWT_SECRET`          | Secret key for verifying JWTs (must match Auth Service)      |
| `FRONTEND_URL`        | Frontend origin for CORS                                     |

### Frontend

| Variable                   | Purpose                                              |
|----------------------------|------------------------------------------------------|
| `VITE_AUTH_ORIGIN`         | Auth Service base URL (e.g., `https://g-learn-auth.onrender.com`) |
| `VITE_EVENTS_ORIGIN`      | Events Backend base URL                              |
| `VITE_PUBLICATIONS_ORIGIN`| Publications Backend base URL                        |

---

## 🚀 Local Setup

### Prerequisites
- **Node.js** 20+
- **npm** 10+
- A **Neon PostgreSQL** database (or any PostgreSQL 15+ instance)

### 1. Clone the Repository

```bash
git clone https://github.com/ghoshonkar5/G-Portal.git
cd G-Portal
```

### 2. Install Dependencies

```bash
# Auth Service
cd auth-service && npm install && cd ..

# Events Backend
cd events-backend && npm install && cd ..

# Publications Backend
cd publications-backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Create `.env` Files

Create a `.env` file in each backend directory and the frontend directory using the environment variable tables above as reference.

```bash
# auth-service/.env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
ADMIN_EMAILS=admin@gitam.edu
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
GOOGLE_CLIENT_ID=your-google-client-id
DEV_MODE=true
FRONTEND_URL=http://localhost:5173

# events-backend/.env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173

# publications-backend/.env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your-secret-key
SCOPUS_API_KEY=your-scopus-key
WOS_API_KEY=your-wos-key
SERPAPI_KEY=your-serpapi-key
GEMINI_API_KEY=your-gemini-key
FRONTEND_URL=http://localhost:5173

# frontend/.env
VITE_AUTH_ORIGIN=http://localhost:5003
VITE_EVENTS_ORIGIN=http://localhost:5001
VITE_PUBLICATIONS_ORIGIN=http://localhost:5000
```

### 4. Run All Services

Open **4 terminals** and run simultaneously:

```bash
# Terminal 1 — Auth Service
cd auth-service && npm run dev          # → http://localhost:5003

# Terminal 2 — Events Backend
cd events-backend && npm run dev        # → http://localhost:5001

# Terminal 3 — Publications Backend
cd publications-backend && npm run dev  # → http://localhost:5000

# Terminal 4 — Frontend
cd frontend && npm run dev              # → http://localhost:5173
```

> **Note:** In development, the Vite dev server proxy (`vite.config.ts`) handles all cross-origin routing automatically. The frontend makes requests to its own origin (`localhost:5173`), and Vite transparently proxies them to the correct backend based on the URL path — no CORS configuration needed in dev mode.

---

## ☁️ Deployment

| Component              | Platform   | Notes                                                                 |
|------------------------|------------|-----------------------------------------------------------------------|
| **Auth Service**       | Render     | Free tier Web Service. Cold starts expected (~30s on first request after idle). Start command: `node src/server.js` |
| **Events Backend**     | Render     | Free tier Web Service. Same cold start behavior.                       |
| **Publications Backend** | Render   | Free tier Web Service. Nightly crons run inside this process.          |
| **Frontend**           | Vercel     | Static deployment. `vercel.json` handles SPA rewrites + API proxying to Render backends. |
| **Database**           | Neon       | Serverless PostgreSQL. Connection pooling via the `-pooler` endpoint. Always use `sslmode=require` in the connection string. |

> **Important:** Render free tier spins down after 15 minutes of inactivity. The first request after idle may take 30+ seconds. This is expected behavior and not a bug.

---

## 🛡️ Security

G-Portal implements security controls mapped to the **OWASP Top 10 (2021)** framework. This includes Helmet.js header hardening, strict CORS origin whitelisting, parameterized raw SQL queries (structurally preventing SQL injection), cryptographically secure OTP generation, login rate limiting (10 attempts per 15-minute window per IP), structured security event logging with timestamps and IP tracking, and SSRF guard with domain-allowlisting for all outbound API fetches (Scopus, WoS, Scholar, Scimago). For full implementation details, code references, and architectural tradeoff analysis, see **[SECURITY.md](SECURITY.md)**.

---

## ⚠️ Known Limitations

- **No Automated Tests** — The repository currently has zero unit, integration, or regression tests across all services.
- **Ephemeral File Storage** — Uploaded files (certificates, photos) are stored on Render's ephemeral disk and are **lost on every redeploy**. Cloudinary is configured in `publications-backend` but is not actively used for file persistence.
- **`Math.random` OTP — Fixed** — The previously insecure OTP generation using `Math.random()` has been migrated to `crypto.randomInt()`.
- **Nightly Sync Has No Retry on HTTP 429** — If Scopus or WoS returns a rate limit (`429 Too Many Requests`) during nightly sync, the affected faculty is skipped with no automatic retry mechanism.
- **Admin Emails Written to `.env` at Runtime** — Bulk admin imports append emails to the running `.env` file, meaning **admin access additions are lost on the next Render redeploy**.
- **No Refresh Token Mechanism** — JWTs are issued with a fixed expiry and there is no silent refresh flow. Users must re-authenticate when their token expires.
- **Duplicated Auth Middleware** — JWT verification logic is copy-pasted across all three backends rather than extracted into a shared npm package.
- **Express Version Mismatch** — Auth Service and Events Backend run Express 5.x while Publications Backend remains on Express 4.x.

---

## 👨‍💻 Author

**Onkar Ghosh**
GITAM University · B.Tech Computer Science & Engineering · 2023–2027

---

<p align="center">
  Built with ☕ and <code>node-cron</code> running at 2 AM
</p>

# PART 02 — FRONTEND FEATURES (MODULE BY MODULE)

## Events Module (`modules/events/`)

### Faculty Dashboard (`pages/faculty/DashboardPage.tsx`)
**File size:** 22,010 B (443 lines)

**Data fetching:** Calls `eventApi.getMine()` on mount → receives `{ events, auto_deleted }`.

**Stat Cards (top):**
4 computed stats from submitted events:
1. Total Events — `submitted.length`
2. Events This Year — filtered by `start_date.getFullYear() === currentYear`
3. International — `level === 'International'`
4. As Speaker / Chair — `role_at_event in ['Speaker', 'Resource Person', 'Chair']`

**Memory Card system:**
- `memorySelector.ts` → `selectMemory(events)` builds a pool of `Memory` objects with 4 types:
  - `on_this_day` — events matching today's date from a previous year
  - `monthly_recap` — events from the previous month (only first 7 days of current month)
  - `quarterly_recap` — events from the previous quarter (academic-year-aware: Q1=Jul-Sep, Q2=Oct-Dec, etc.)
  - `random` — any past event with photos
- Fisher-Yates shuffle picks a random memory per session
- `DashboardPage` generates 20 candidates, deduplicates by headline, passes to `MemoryCard`
- `MemoryCard` (`components/MemoryCard.tsx`, 205 lines):
  - Photo collage (1/2/3+ layout) with auto-fadeout after 3s → slideshow mode
  - Auto-rotate every 3 minutes
  - Slideshow dots for manual photo navigation
  - Memory counter dots for multiple memories
  - Photo preloading (next memory's photos)

**Academic Calendar Heatmap (`components/AcademicCalendar.tsx`, 245 lines):**
- GitHub-style heatmap showing event activity per day across an academic year (Jul–Jun)
- `buildDayMap()` → maps ISO date strings to arrays of events (only `submitted` + `docs_status === 'complete'`)
- Intensity scale: 0 (slate-100) → 1 (teal-200) → 2 (teal-400) → 3 (brand-teal) → 4+ (dark teal)
- Hover tooltip: fixed-position tooltip with event list, auto-clamped to viewport
- Click: single event → navigate to edit; multiple → modal picker
- Academic year selector (dynamic from event data)
- Footer stats: total events, active months, event days

**Auto-deleted events banner:**
- Shows events that were auto-deleted because document deadline passed without uploading
- Persisted in `localStorage` as `auto_deleted_events`
- Dismissible (removes from localStorage)

**Incomplete events alert:**
- Modal popup (once per login session via `sessionStorage`) listing:
  - Drafts with countdown timers (auto-deleted after 7 days)
  - Submitted events missing documents with countdown timers
- Per-event "Complete →" / "Upload →" buttons

**Draft/pending nudge banners:**
- Inline pill-style buttons showing counts of drafts and pending-document events
- Navigate to filtered event lists

---

### Event CRUD (`pages/faculty/EventsPage.tsx`, `NewEventPage.tsx`, `EditEventPage.tsx`)

**Event form fields (from `types/index.ts`):**
- `event_title` — text
- `event_type` — enum: Conference, Workshop, Seminar, FDP, Webinar, Guest Lecture, Training, Hackathon, Other
- `role_at_event` — enum: Attendee, Speaker, Organizer, Resource Person, Chair, Panelist, Mentor, Judge
- `level` — enum: International, National, State, Local, Institutional
- `organizer` — text
- `venue` — text (optional)
- `mode` — enum: Online, Offline, Hybrid
- `start_date`, `end_date` — date
- `description` — textarea (optional)
- `certificates` — file upload (max 5 files)
- `photos` — file upload (max 10 files)
- `status` — draft | submitted

**Status lifecycle:**
1. `draft` — created but not submitted; auto-deleted after 7 days
2. `submitted` → `docs_status: pending_both | pending_cert | pending_photo | complete`
3. Document deadline can be set per-event or per-batch; events auto-deleted if deadline passes without docs

**CSV Bulk Import (`components/CSVImportModal.tsx`):**
- Upload CSV file with event data
- Backend parses CSV → returns preview of events
- Faculty confirms → bulk insert with a `batch_id`
- Option to set batch-wide document deadline

---

### Events List & Filtering (`pages/faculty/EventsPage.tsx`)

- Shows all faculty events in card grid
- Filters: event type, level, status (draft/submitted), search by title
- Export to CSV/Excel via `eventApi.mineExport()`
- Document deadline timers shown per-event

---

### Events Admin (`pages/admin/`)

**AdminDashboardPage:** Admin-only statistics dashboard (all faculty events)

**AdminExplorerPage:** Browse all events across all faculty with filters

**AdminFacultyPage:** List faculty with event counts

---

### Events Profile (`pages/faculty/ProfilePage.tsx`)
Faculty profile view specific to the events module with personal details and event statistics.

---

## Publications Module (`modules/publications/`)

### Faculty Dashboard (`pages/faculty/DashboardPage.tsx`, 579 lines)

**Data aggregation (`publicationsApi.ts → getFacultyData()`):**
- Fetches 5 data sources in parallel:
  1. `publicationsAPI.getByFaculty(facultyId)` — journal publications
  2. `conferencesAPI.getByFaculty(facultyId)` — conference papers
  3. `booksAPI.getByFaculty(facultyId)` — books and chapters
  4. Scholar metrics (`/api/scholar/metrics/:facultyId`) — Google Scholar profile data
  5. Scopus metrics (`/api/scopus/metrics/:facultyId`) — Scopus author-level metrics

**Citation stats:**
- **Google citations:** Scholar API → `citations.all`, fallback to per-paper sum
- **Scopus citations:** Author-level `citationCount` from Scopus API (NOT per-paper sum)
- **WoS citations:** Per-paper sum (no author-level WoS endpoint)
- **h-Index:** Prefers Google Scholar, falls back to Scopus, with `hIndexSource` tracking
- **i10-Index:** Google Scholar only (Scopus doesn't provide i10)

**Widgets:**
- `ScholarMetricsWidget` — Citation chart with time series data from Scholar
- `ScopusMetricsWidget` — Scopus-specific metrics visualization

---

### Publications CRUD (`pages/faculty/PublicationsPage.tsx`, 1,622 lines — 91 KB!)

**Massive single-file page** handling:
- List view with filtering (academic year, quartile)
- Add/Edit publication forms (`AddPublicationForm.tsx`, 710 lines)
- Inline editing
- Scopus sync modal (`ScopusSyncModal.tsx`, 471 lines) — preview → select → import
- WoS sync modal (`WosSyncModal.tsx`, 477 lines) — preview → select → import
- Scholar sync modal (`ScholarSyncModal.tsx`, 573 lines) — preview → select → import
- Flag notification banners and flag detail popups
- CSV import for bulk publication data
- Export to CSV

**Publication fields (from `types/index.ts`):**
34 fields including: title, journal, quartile, impactFactor, sjrScore, citeScore, wosCitations, scopusCitations, googleCitations, authors[], indexing, source, areaOfPaper, positionOfAuthor, volume, issue, startPage, lastPage, monthYear, academicYear, doi, link, apaFormat, fileData/fileUrl/fileName/fileType, lastEditedBy, lastEditedAt

---

### Conferences CRUD (`pages/faculty/ConferencesPage.tsx`, 1,008 lines)
Similar pattern to Publications with conference-specific fields:
- conferenceName, type (International/National), venue, country, month, year, academicYear, authors[], doi, link, apaFormat

---

### Books/Chapters CRUD (`pages/faculty/BooksPage.tsx`, 996 lines)
- type (Book | Book Chapter), publisher, isbn, year, academicYear, authors[], doi, link, apaFormat

---

### KRC Page (`pages/faculty/KRCPage.tsx`, 555 lines)
- Key Result Contribution tracking
- View faculty-specific KRC data (imported via CSV by admin)
- `krcAPI.getFacultyKRC(facultyId)` — GET request for individual faculty KRC data

---

### Flag History Page (`pages/faculty/FlagHistoryPage.tsx`, 961 lines)
- View publication flags raised by admin
- Flag statuses: `flagged` → `pending_review` → `resolved`
- Faculty can `markResolved` → admin can `approveResolution` or `reflag`
- Potential flags (auto-detected missing fields) also displayed
- History tracking via `flag_history` table

---

### Edit Profile Page (`pages/faculty/EditProfilePage.tsx`, 768 lines)
- Update research profile URLs (Google Scholar, Scopus ×3, WoS ×3)
- Update extended profile fields
- Calls `updateProfileUrls()` on auth context

---

### Publications Admin (`pages/admin/`)

**AdminDashboardPage (`pages/admin/AdminDashboardPage.tsx`, 2,403 lines — 131 KB!)**
The largest file in the entire codebase. Contains:
- Timeseries charts (publications over time)
- Quartile distribution pie chart
- Department-wise distribution bar chart
- Top contributors leaderboard
- Overview counts (total pubs, conferences, books)
- All powered by `adminStatsApi.ts` (5 API calls)

**AdminLayout (`pages/admin/AdminLayout.tsx`, 189 lines):**
Sidebar navigation + content area that switches between admin screens via a `screen` prop.

**AdminOverviewPage (411 lines), AdminPublicationsPage (344 lines), AdminConferencesPage (292 lines), AdminBooksPage (288 lines):**
Browse/filter all data across all faculty.

**AdminFacultyPage (469 lines):**
Faculty directory with publication counts, flag management.

**AdminUploadDataPage (431 lines):**
- Import KRC CSV data (uploads to `krcAPI.importCSV()`)
- Import Scimago SJR CSV data (journal rankings)
- Backfill quartiles (auto-map publications to journal quartiles)
- Delete by year / delete all

---

## Achievements Module (`modules/achievements/`)

### Achievement Types (`types/index.ts`)

```typescript
interface Achievement {
  id: string
  user_id: number
  submitted_by: number
  title: string | null
  event_name: string | null
  event_type: string | null
  level: string | null
  place_held: string | null
  result: string | null
  position: string | null
  start_date: string | null
  end_date: string | null
  duration_days: number | null
  certificate_url: string | null
  merit_url: string | null
  photo_urls: string[] | string | null
  description: string | null
  organiser_name: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
}
```

### Pages

| Page | File | Description |
|------|------|------------|
| Student Dashboard | `pages/student/StudentDashboard.tsx` | Student achievement overview |
| Faculty Dashboard | `pages/faculty/FacultyDashboard.tsx` | Faculty achievement overview, role-based redirect |
| Student Achievements | `pages/faculty/StudentAchievementsPage.tsx` | View mentored students' achievements |
| My Achievements | `pages/shared/MyAchievementsPage.tsx` | Both students and faculty view own achievements |
| Submit Achievement | `pages/shared/SubmitAchievementPage.tsx` | Achievement submission form |
| Admin Dashboard | `pages/admin/AdminAchievementsDashboard.tsx` | All achievements across students/faculty |

### API Calls (`api/achievementsApi.ts`)

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getMyProfile` | GET | `/api/users/me` | Student-specific profile |
| `getMyAchievements` | GET | `/api/achievements/mine` | Own achievements |
| `submitAchievement` | POST | `/api/achievements` | Submit new (FormData) |
| `updateAchievement` | PUT | `/api/achievements/:id` | Update (FormData) |
| `deleteAchievement` | DELETE | `/api/achievements/:id` | Delete |
| `getStudentAchievements` | GET | `/api/achievements/students` | Faculty: mentored students |
| `getAllAchievements` | GET | `/api/achievements/all` | Admin: all |
| `exportMyAchievements` | GET | `/api/export/my-achievements` | CSV blob download |
| `exportStudentAchievements` | GET | `/api/export/my-students` | CSV blob download |
| `exportAllAchievements` | GET | `/api/export/all` | CSV blob download |

### Backend
**NOT FOUND** — Port 5004 is referenced in Vite proxy but no `achievements-backend/` directory exists in the repo. Only the frontend module is present.

---

## Placements Module (`modules/placements/`)

> **Note:** This entire module is written in **JSX** (not TSX) — it's the only module not in TypeScript.

### Pages

| Page | File | Description |
|------|------|------------|
| Home | `pages/Home.jsx` (252 lines) | Landing page with submission feed, search, filters |
| Companies | `pages/Companies.jsx` (109 lines) | Company directory |
| Company Detail | `pages/CompanyDetail.jsx` (144 lines) | Individual company with submissions |
| Submit Experience | `pages/SubmitExperience.jsx` (294 lines) | Experience submission form |
| Submission Detail | `pages/SubmissionDetail.jsx` (227 lines) | Single submission view with upvotes, bookmarks, comments |
| My Experiences | `pages/MyExperiences.jsx` (224 lines) | Own submissions |
| Analytics | `pages/Analytics.jsx` (216 lines) | Analytics dashboard |

### Layout
`PlacementsLayout.jsx` (94 lines) — nested Outlet-based layout with sidebar navigation for the placements module.

### API Calls (`lib/api.js`)

21 endpoints defined, calling to port 5005:
- Auth: `getMe`
- Companies: `getCompanies`, `getCompany(id)`
- Submissions: CRUD + `searchSubmissions`, `toggleUpvote`, `toggleBookmark`, `getMySubmissions`
- Comments: `createComment(submissionId, text)`
- Analytics (Public): `getTopicHeatmap`, `getTopicFrequency`, `getTopicTrends`, `getCompanyTimeline`, `getDifficultyDistribution`, `getTopQuestions`
- Analytics (Admin): `getSearchGaps`, `getSubmissionPipeline`, `getContributorLeaderboard`, `getWeeklyActiveUsers`

### Backend
**NOT FOUND** — Port 5005 is referenced in Vite proxy but no `placements-backend/` directory exists in the repo. Only the frontend module is present.

---

## Platform Pages (Root `pages/`)

### LoginPage (`pages/LoginPage.tsx`, 404 lines)
- Tab-based login: Faculty, Student, Admin
- Each tab has ID + Password form
- Google OAuth button (calls `googleAuthApi` with purpose: `faculty_login`, `student_login`, or `admin_login`)
- Admin login requires Google verification first, then reveals ID/password fields
- First-login detection: if API returns `firstLogin: true`, redirects to `/first-login`
- OTP flow: if API returns `requiresOtp: true`, redirects to `/verify-otp`

### FirstLoginPage (`pages/FirstLoginPage.tsx`, 372 lines)
3-step wizard:
1. Enter faculty/student ID → `checkFirstLoginIdApi(id)` → sends OTP
2. Enter OTP → `verifyOtpApi(userId, otp, 'first_login')` → receives setupToken
3. Set new password → `setFirstLoginPasswordApi(setupToken, newPassword, confirmPassword)`

### VerifyOTPPage (`pages/VerifyOTPPage.tsx`, 242 lines)
- 6-digit OTP input
- Countdown timer (90 seconds)
- Resend OTP with rate limit messaging
- Purpose-aware: login, admin_login, first_login, reset

### ForgotPasswordPage (`pages/ForgotPasswordPage.tsx`, 122 lines)
- Enter ID + email → `forgotPasswordApi(id, email)` → sends OTP
- Redirects to `/verify-otp` with purpose `reset`

### ResetPasswordPage (`pages/ResetPasswordPage.tsx`, 125 lines)
- New password + confirm → `resetPasswordApi(resetToken, newPassword, confirmPassword)`
- Uses short-lived `resetToken` from OTP verification step

### OnBoardingPage (`pages/OnBoardingPage.tsx`, 536 lines)
Multi-section form for faculty profile completion:
- **Section 1 — Core:** Department (dropdown, 12 options), Designation (dropdown, 7 options), Mobile (Indian 10-digit validation), Office Room
- **Section 2 — Academic:** Years of Experience (0–50), Research Areas (TagInput — comma-separated), Courses Taught (TagInput), Roles & Responsibilities (TagInput)
- **Section 3 — Profile Photo:** Crop and upload (client-side compression to ~150KB before sending)
- **Section 4 — Academic URLs:** Google Scholar URL, Scopus URLs (×3), WoS URLs (×3)
- Submits to auth-service `PUT /api/profile/onboarding`
- On success: issues new token with `profileCompleted: true`

### HomePage (`pages/HomePage.tsx`, 356 lines)
Module hub with navigation cards:
- Events Portal card → `/events/dashboard`
- Publications Portal card → `/publications/dashboard`
- Achievements Portal card → `/achievements`
- Placements Portal card → `/placements`
- Admin Users card (admin only) → `/admin/users`

### AdminUsersPage (`pages/AdminUsersPage.tsx`, 857 lines)
Comprehensive user management:
- **Create single user:** role, facultyId, name, email, department, designation, mobile
- **Bulk create:** CSV upload with headers: role, faculty_id, name, email, department, designation, mobile
- **List users:** Search by name/email/faculty_id, filter by role/department/status, sort
- **Toggle status:** Activate/deactivate user accounts
- **Delete user:** With confirmation modal
- **User detail view:** Expandable rows with full profile information

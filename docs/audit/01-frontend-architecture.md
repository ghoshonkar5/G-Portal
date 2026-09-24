# PART 01 — FRONTEND ARCHITECTURE

## Folder Structure (`frontend/src/`)

```
src/
├── main.tsx                          # Entry — GoogleOAuthProvider → App
├── App.tsx                           # BrowserRouter + AuthProvider + Routes (44 routes) + Toaster
├── App.css                           # Additional global styles (2,891 B)
├── index.css                         # Tailwind v4 @theme tokens + custom scrollbars (4,165 B)
│
├── api/                              # Shared API layer
│   ├── axios.ts                      # authAxios — base /api/auth, 401 interceptor
│   ├── eventsAxios.ts                # eventsAxios — base /api/events, 401 interceptor
│   ├── publicationsAxios.ts          # publicationsAxios — base /api/publications, 401 interceptor
│   ├── authApi.ts                    # Auth service calls (login, OTP, Google, first-login, forgot/reset)
│   └── adminApi.ts                   # Admin user CRUD (create, bulk, list, toggle, delete)
│
├── assets/                           # Static assets (images, logos)
│
├── components/                       # Platform-level shared components
│   ├── Navbar.tsx                    # Main navigation bar (5,174 B)
│   └── ProtectedRoute.tsx            # Route guard — checks auth, firstLogin, profileCompleted, admin role
│
├── context/
│   └── AuthContext.tsx               # Single React context — user, token, login, logout, updateProfileUrls, saveExtendedProfile
│
├── lib/
│   └── utils.ts                      # cn() utility (clsx + tailwind-merge)
│
├── types/
│   └── index.ts                      # User, TokenPayload, AuthContextType, AuthResponse, ApiError interfaces
│
├── pages/                            # Platform pages (auth flow, home, admin)
│   ├── LoginPage.tsx                 # Faculty/admin/student login with Google OAuth
│   ├── FirstLoginPage.tsx            # First-time account setup (check ID → OTP → set password)
│   ├── VerifyOTPPage.tsx             # OTP verification with countdown + rate limit messaging
│   ├── ForgotPasswordPage.tsx        # Forgot password flow (ID + email → OTP)
│   ├── ResetPasswordPage.tsx         # New password after OTP verification
│   ├── OnBoardingPage.tsx            # Profile completion wizard (department, research, photo, URLs)
│   ├── HomePage.tsx                  # Module hub with navigation cards
│   └── AdminUsersPage.tsx            # User management (39 KB — largest platform page)
│
└── modules/
    ├── events/                       # Events module
    │   ├── api/                      # axios.ts, eventApi.ts, facultyApi.ts
    │   ├── assets/                   # Module-specific assets
    │   ├── components/               # AcademicCalendar, CSVImportModal, EventPreviewModal, MemoryCard, Navbar
    │   │   └── ui/                   # 10 shadcn-style primitives (badge, button, card, dialog, input, label, select, separator, sonner, tabs)
    │   ├── lib/                      # utils.ts (cn helper)
    │   ├── pages/
    │   │   ├── admin/                # AdminDashboardPage, AdminExplorerPage, AdminFacultyPage
    │   │   └── faculty/              # DashboardPage, EventsPage, EvenFormPage, NewEventPage, EditEventPage, ProfilePage
    │   ├── types/                    # Event, Memory, DayMap types + enum constants
    │   └── utils/                    # calendarHelpers.ts, memorySelector.ts
    │
    ├── publications/                 # Publications module
    │   ├── api/                      # axios.ts (empty file), publicationsApi.ts (467 lines — all API calls via fetch)
    │   ├── components/               # 18 components + ui/ (26 shadcn primitives)
    │   ├── pages/
    │   │   ├── admin/                # AdminDashboardPage (131 KB!), AdminLayout, AdminOverviewPage, + 5 more + api/ + components/ + theme.css
    │   │   └── faculty/              # DashboardPage, PublicationsPage (91 KB!), ConferencesPage, BooksPage, KRCPage, FlagHistoryPage, EditProfilePage
    │   ├── types/                    # Publication, Conference, BookChapter, Flag, PotentialFlag
    │   └── utils/                    # academicYears.ts, mockData.ts
    │
    ├── achievements/                 # Achievements module
    │   ├── api/                      # achievementsApi.ts, axios.ts
    │   ├── components/               # AchievementCard, AchievementForm, AchievementViewModal, Lightbox
    │   ├── pages/
    │   │   ├── admin/                # AdminAchievementsDashboard
    │   │   ├── faculty/              # FacultyDashboard, StudentAchievementsPage
    │   │   ├── shared/               # MyAchievementsPage, SubmitAchievementPage
    │   │   └── student/              # StudentDashboard
    │   ├── types/                    # Achievement, AchievementUserProfile
    │   └── utils/                    # Utility functions
    │
    └── placements/                   # Placements module (JSX, not TSX)
        ├── components/
        │   ├── analytics/            # Analytics sub-components
        │   └── ui/                   # UI primitives
        ├── layouts/                  # PlacementsLayout.jsx (nested route outlet)
        ├── lib/                      # api.js, mockData.js, utils.js
        └── pages/                    # Home, Companies, CompanyDetail, SubmitExperience, SubmissionDetail, MyExperiences, Analytics (all .jsx)
```

---

## Build and Tooling

### Vite Configuration (`vite.config.ts`)
- **Plugins:** `react()` + `tailwindcss()` (Tailwind v4 Vite plugin)
- **Dev server port:** 5173
- **Proxy rules:** 18 proxy entries routing API paths to 5 backend ports (5000, 5001, 5003, 5004, 5005)
- **Path rewriting:** `/api/placements` → rewritten to `/api` on port 5005; most others pass through as-is
- **Proxy ordering:** Publications-backend auth sub-paths (`/api/auth/me`, `/api/auth/profile-urls`, etc.) are listed **before** the generic `/api/auth` catch-all to ensure correct routing
- **Path aliases:** `@/*` → `./src/*` (defined in `tsconfig.app.json`)
- **No production build config** (no `vite.config.ts` `build` section customization)

### TypeScript Configuration (`tsconfig.app.json`)
- **Target:** `es2023`
- **Module:** `esnext`, moduleResolution: `bundler`
- **verbatimModuleSyntax:** `true` — requires explicit `type` imports
- **erasableSyntaxOnly:** `true`
- **Strict mode:** NOT enabled (no `strict: true`), `noUnusedLocals: false`, `noUnusedParameters: false`
- **JSX:** `react-jsx`
- **allowJs:** `true` (supports placements .jsx files)
- **skipLibCheck:** `true`

### Tailwind CSS
- **Version:** 4.3.2 (Tailwind v4)
- **Config:** Via `@theme inline` block in `index.css` — no `tailwind.config.js` file
- **Design tokens:** oklch color system for shadcn-compatible CSS variables (background, foreground, primary, secondary, muted, accent, destructive, border, input, ring)
- **Custom tokens:** `--color-brand-teal: #101A24`, `--color-brand-cream: #E5DDC6`, `--font-inter`, `--font-outfit`
- **Custom utilities:** `.no-scrollbar`, `.scroll-thin`, `.subtle-scrollbar`, `.navbar-scrollbar`

### ESLint (`eslint.config.js`)
- **Parser:** typescript-eslint
- **Rules:** recommended JS + recommended TS + react-hooks + react-refresh/vite
- **Ignores:** `dist/`
- **Prettier:** NOT FOUND — no Prettier config in the repo

### Environment Variables (Frontend)
- `.env`: Contains `VITE_AUTH_ORIGIN`, `VITE_EVENTS_ORIGIN`, `VITE_PUBLICATIONS_ORIGIN` (empty for proxy mode)
- `.env.development`: `VITE_AUTH_URL`, `VITE_PUBLICATIONS_URL`, `VITE_EVENTS_URL` with localhost ports
- `.env.production`: Same variables with production URLs
- `VITE_GOOGLE_CLIENT_ID`: Referenced in `main.tsx`, falls back to `'dummy-client-id-for-dev'`

---

## Routing

### Complete Route Table

| Path | Page Component | Guard | Role Required | Lazy? | Layout |
|------|---------------|-------|--------------|-------|--------|
| `/` | `Navigate → /login` | None | — | No | — |
| `*` | `Navigate → /login` | None | — | No | — |
| `/login` | `LoginPage` | None | — | No | — |
| `/first-login` | `FirstLoginPage` | None | — | No | — |
| `/verify-otp` | `VerifyOTPPage` | None | — | No | — |
| `/forgot-password` | `ForgotPasswordPage` | None | — | No | — |
| `/reset-password` | `ResetPasswordPage` | None | — | No | — |
| `/onboarding` | `OnboardingPage` | `ProtectedRoute` | any auth | No | — |
| `/home` | `HomePage` | `ProtectedRoute` | any auth | No | — |
| `/admin/users` | `AdminUsersPage` | `ProtectedRoute requireAdmin` | admin | No | — |
| `/events/dashboard` | `DashboardPage` | `ProtectedRoute` | any auth | No | — |
| `/events/my-events` | `EventsPage` | `ProtectedRoute` | any auth | No | — |
| `/events/new` | `NewEventPage` | `ProtectedRoute` | any auth | No | — |
| `/events/:id/edit` | `EditEventPage` | `ProtectedRoute` | any auth | No | — |
| `/events/profile` | `EventsProfilePage` | `ProtectedRoute` | any auth | No | — |
| `/events/admin/dashboard` | `AdminDashboardPage` | `ProtectedRoute requireAdmin` | admin | No | — |
| `/events/admin/explorer` | `AdminExplorerPage` | `ProtectedRoute requireAdmin` | admin | No | — |
| `/events/admin/faculty` | `AdminFacultyPage` | `ProtectedRoute requireAdmin` | admin | No | — |
| `/publications/dashboard` | `PubDashboardPage` | `ProtectedRoute` | any auth | No | — |
| `/publications/publications` | `PublicationsPage` | `ProtectedRoute` | any auth | No | — |
| `/publications/conferences` | `ConferencesPage` | `ProtectedRoute` | any auth | No | — |
| `/publications/books` | `BooksPage` | `ProtectedRoute` | any auth | No | — |
| `/publications/krc` | `KRCPage` | `ProtectedRoute` | any auth | No | — |
| `/publications/flags` | `FlagHistoryPage` | `ProtectedRoute` | any auth | No | — |
| `/publications/edit-profile` | `EditProfilePage` | `ProtectedRoute` | any auth | No | — |
| `/publications/admin/dashboard` | `AdminLayoutWrapper(overview)` | `ProtectedRoute requireAdmin` | admin | No | `AdminLayout` |
| `/publications/admin/faculty` | `AdminLayoutWrapper(faculty)` | `ProtectedRoute requireAdmin` | admin | No | `AdminLayout` |
| `/publications/admin/publications` | `AdminLayoutWrapper(publications)` | `ProtectedRoute requireAdmin` | admin | No | `AdminLayout` |
| `/publications/admin/conferences` | `AdminLayoutWrapper(conferences)` | `ProtectedRoute requireAdmin` | admin | No | `AdminLayout` |
| `/publications/admin/books` | `AdminLayoutWrapper(books)` | `ProtectedRoute requireAdmin` | admin | No | `AdminLayout` |
| `/publications/admin/upload-data` | `AdminLayoutWrapper(upload-data)` | `ProtectedRoute requireAdmin` | admin | No | `AdminLayout` |
| `/achievements` | `AchievementsIndex` | `ProtectedRoute` | any auth | No | — |
| `/achievements/submit` | `SubmitAchievementPage` | `ProtectedRoute` | any auth | No | — |
| `/achievements/mine` | `MyAchievementsPage` | `ProtectedRoute` | any auth | No | — |
| `/achievements/students` | `StudentAchievementsPage` | `ProtectedRoute` | any auth | No | — |
| `/achievements/admin` | `AdminAchievementsDashboard` | `ProtectedRoute requireAdmin` | admin | No | — |
| `/placements` | `PlacementsHome` | `ProtectedRoute` | any auth | No | `PlacementsLayout` |
| `/placements/companies` | `PlacementsCompanies` | `ProtectedRoute` | any auth | No | `PlacementsLayout` |
| `/placements/companies/:id` | `CompanyDetail` | `ProtectedRoute` | any auth | No | `PlacementsLayout` |
| `/placements/submit` | `SubmitExperience` | `ProtectedRoute` | any auth | No | `PlacementsLayout` |
| `/placements/submissions/:id` | `SubmissionDetail` | `ProtectedRoute` | any auth | No | `PlacementsLayout` |
| `/placements/my-experiences` | `MyExperiences` | `ProtectedRoute` | any auth | No | `PlacementsLayout` |
| `/placements/analytics` | `PlacementsAnalytics` | `ProtectedRoute` | any auth | No | `PlacementsLayout` |

**Total routes:** 44 (including `/` redirect and `*` catch-all)

**Lazy loading:** NONE — all routes are eagerly imported at the top of `App.tsx`

**Nested routing:** Placements module uses nested `<Route>` children under `/placements` with `<Outlet>` in `PlacementsLayout`. Publications admin uses `AdminLayoutWrapper` component that switches content based on a `screen` prop.

**404 handling:** `*` catch-all redirects to `/login` — no dedicated 404 page.

---

## Auth on the Client

### AuthContext (`context/AuthContext.tsx`)

**State:**
- `user: User | null` — full user object with aliased fields
- `token: string | null` — JWT string
- `loading: boolean` — true until initial hydration completes

**Hydration on mount:**
1. Reads `localStorage.getItem('token')` and `localStorage.getItem('user')`
2. If both exist, parses user JSON and passes through `withAlias()` normalizer
3. Sets `loading = false`
4. Does **NOT** call `/api/auth/me` to validate the token on mount — trusts localStorage

**`withAlias()` function:**
Normalizes field naming between snake_case and camelCase for cross-module compatibility:
- `faculty_id` ↔ `facultyId`
- `universityId` ↔ `UniversityId` (also falls back to facultyId)
- `branch` ↔ `department`
- `firstLogin` ↔ `first_login`
- `profileCompleted` ↔ `profile_completed`

**`login(token, user)` method:**
1. Calls `fetchFullProfile(token)` → `GET /api/auth/me`
2. Merges the full profile with the login response (login response fields take precedence if non-null)
3. Passes through `withAlias()`
4. Stores in `localStorage` and React state

**`logout()` method:**
Removes `token` and `user` from localStorage, sets both to null in state.

**`updateProfileUrls()` and `saveExtendedProfile()` methods:**
PUT requests that merge the returned data back into the user state, preserving URL fields separately.

**Token storage:** `localStorage` — accessible by any JS on the domain (XSS risk).

**401 handling:** Each Axios instance (`authAxios`, `eventsAxios`, `publicationsAxios`) has a response interceptor that on 401 clears localStorage and redirects to `/login` via `window.location.href`.

**Token versioning:** Embedded in JWT payload as `tokenVersion`. Backend middleware checks it against DB `token_version` column. `logoutAll` increments the DB version, invalidating all existing tokens.

**Google OAuth:** Handled by `@react-oauth/google` provider in `main.tsx`. Google credential is sent to `/api/auth/google` with a `purpose` field.

---

## Route Protection and Role-Based Rendering

### `ProtectedRoute` Component (`components/ProtectedRoute.tsx`)

Props: `children`, `requireAdmin?: boolean`

Logic chain:
1. If `loading` → render nothing (null)
2. If no `token` or `user` → redirect to `/login`
3. If `firstLogin` is true and current path ≠ `/first-login` → redirect to `/first-login`
4. If role is `faculty` and `profileCompleted` is false and path ≠ `/onboarding` → redirect to `/onboarding`
5. If `requireAdmin` and role ≠ `admin` → redirect to `/home`
6. Otherwise → render children

**Role-based conditional UI:** Several pages check `user.role` to show/hide sections. The publications admin uses `AdminLayoutWrapper` which is only reachable via `requireAdmin` routes. Achievements module has separate page components per role.

---

## State Management

- **Global state:** Single `AuthContext` with `useAuth()` hook
- **No Redux, Zustand, or other state library**
- **Per-page state:** All managed via `useState`/`useEffect` inside page components
- **Data fetching:** Direct `fetch()` or Axios calls in `useEffect` on mount; no data fetching library (no React Query, SWR, etc.)
- **Caching:** None — every page re-fetches on mount
- **Optimistic updates:** NOT FOUND
- **Loading states:** Boolean `loading` state per page, rendering "Loading..." text or skeleton components
- **Error states:** `toast.error()` via Sonner library; some pages show inline error messages
- **Empty states:** Some pages render custom empty state messages when data arrays are empty

---

## API Layer

### Axios Instances

| Instance | File | Base URL | 401 Handling |
|----------|------|----------|-------------|
| `authAxios` | `api/axios.ts` | `VITE_AUTH_ORIGIN + '/api/auth'` | Clear LS, redirect `/login` |
| `eventsAxios` | `api/eventsAxios.ts` | `VITE_EVENTS_ORIGIN + '/api/events'` | Clear LS, redirect `/login` |
| `publicationsAxios` | `api/publicationsAxios.ts` | `VITE_PUBLICATIONS_ORIGIN + '/api/publications'` | Clear LS, redirect `/login` |
| Events module `api` | `modules/events/api/axios.ts` | `VITE_EVENTS_ORIGIN + '/api/events'` | Clear LS, redirect `/login` |

All instances attach `Bearer` token from `localStorage.getItem('token')` via request interceptor.

### Publications Module API
The publications module (`modules/publications/api/publicationsApi.ts`, 467 lines) uses raw `fetch()` instead of Axios — a different pattern from the other modules. It defines `authAPI`, `publicationsAPI`, `conferencesAPI`, `booksAPI`, `krcAPI`, `getFacultyData`, and `syncData`.

### Service Files Summary

| File | Endpoints Defined |
|------|------------------|
| `api/authApi.ts` | 11 functions: loginApi, verifyOtpApi, resendOtpApi, googleAuthApi, unlinkGoogleApi, forgotPasswordApi, resetPasswordApi, getMeApi, logoutAllApi, checkFirstLoginIdApi, setFirstLoginPasswordApi |
| `api/adminApi.ts` | 5 functions: createUserApi, bulkCreateUsersApi, listUsersApi, toggleUserStatusApi, deleteUserApi |
| `modules/events/api/eventApi.ts` | 8 methods: getMine, create, update, delete, bulkImport, setBatchDeadline, setSingleDeadline, mineExport, getAll, adminExport |
| `modules/events/api/facultyApi.ts` | 5 methods: getMe, list, create, updateProfile, changePassword |
| `modules/publications/api/publicationsApi.ts` | ~30 methods across authAPI, publicationsAPI, conferencesAPI, booksAPI, krcAPI objects |
| `modules/achievements/api/achievementsApi.ts` | 9 functions: getMyProfile, getMyAchievements, submitAchievement, updateAchievement, deleteAchievement, getStudentAchievements, getAllAchievements, exportMyAchievements, exportStudentAchievements, exportAllAchievements |
| `modules/placements/lib/api.js` | ~20 methods: getMe, getCompanies, getCompany, getSubmissions, searchSubmissions, getSubmission, createSubmission, toggleUpvote, toggleBookmark, getMySubmissions, deleteSubmission, createComment, getTopicHeatmap, getTopicFrequency, getTopicTrends, getCompanyTimeline, getDifficultyDistribution, getTopQuestions, getSearchGaps, getSubmissionPipeline, getContributorLeaderboard, getWeeklyActiveUsers |

---

## Types

### Main TypeScript Interfaces

| Type | File | Fields |
|------|------|--------|
| `User` | `types/index.ts` | id, facultyProfileId, facultyId, faculty_id, name, email, role, department, designation, mobile, isActive, firstLogin, profileCompleted, google_id, UniversityId, universityId, branch, googleScholarUrl, scopusUrl (×3), wosUrl (×3), researchArea, officeRoom, officeHours, coursesTaught, roles, linkedinUrl, websiteUrl, profilePhoto, yearsOfExperience |
| `TokenPayload` | `types/index.ts` | id, facultyProfileId, facultyId, role, email, tokenVersion, profileCompleted, firstLogin, iat, exp |
| `AuthContextType` | `types/index.ts` | user, token, loading, isAuthenticated, login, logout, updateProfileUrls, saveExtendedProfile |
| `AuthResponse` | `types/index.ts` | success, token, user, message? |
| `Event` | `modules/events/types/index.ts` | id, faculty_id, event_title, event_type, role_at_event, level, organizer, venue?, mode, start_date, end_date, description?, certificate_urls[], photo_urls[], status, created_at, updated_at, docs_status?, document_deadline?, import_batch_id?, faculty_name?, faculty_code?, department?, designation? |
| `Memory` | `modules/events/types/index.ts` | type, events[], photos[], headline, subtext |
| `Publication` | `modules/publications/types/index.ts` | 34 fields including title, journal, quartile, impactFactor, citations per source, authors[], indexing, source, doi, etc. |
| `Conference` | `modules/publications/types/index.ts` | title, conferenceName, type, venue, country, month, year, academicYear, authors[], doi |
| `BookChapter` | `modules/publications/types/index.ts` | title, type ('Book'|'Book Chapter'), publisher, isbn, year, academicYear, authors[], doi |
| `Flag` | `modules/publications/types/index.ts` | id, item_type, item_id, reason, status, flagged_by_name?, created_at, message? |
| `PotentialFlag` | `modules/publications/types/index.ts` | id, publication_id, missing_fields[], status |
| `Achievement` | `modules/achievements/types/index.ts` | id, user_id, submitted_by, title, event_name, event_type, level, place_held, result, position, start_date, end_date, duration_days, certificate_url, merit_url, photo_urls, description, organiser_name, status |
| `AchievementUserProfile` | `modules/achievements/types/index.ts` | id, name, email, role, department, faculty_code, roll_number, year_of_study, batch, mentor_id |

---

## Shared / Reusable Components

### Platform-Level
| Component | File | Purpose |
|-----------|------|---------|
| `Navbar` | `components/Navbar.tsx` | Top nav bar with navigation and user menu |
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Auth guard wrapper |

### shadcn/ui Primitives (Publications module `components/ui/`)
26 components: alert, badge, breadcrumb, button, card, collapsible, dialog, dropdown-menu, form, input, label, pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, sonner, table, tabs, textarea, use-mobile (hook), utils

### shadcn/ui Primitives (Events module `components/ui/`)
10 components: badge, button, card, dialog, input, label, select, separator, sonner, tabs

### Module-Specific Components
- Events: AcademicCalendar, CSVImportModal, EventPreviewModal, MemoryCard, Navbar (events-specific)
- Publications: 18 components including AddPublicationForm, AddConferenceForm, AddBookForm, ScholarSyncModal, ScopusSyncModal, WosSyncModal, FlagDetailPopup, FlagReviewModal, FlagModal, FlagNotificationBanner, ScholarMetricsWidget, ScopusMetricsWidget, FilterDropdown, ImportCSVModal, FacultyDirectory, DebugPanel, GitamLogo, UniversityLogo
- Achievements: AchievementCard, AchievementForm, AchievementViewModal, Lightbox

---

## Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | `context/AuthContext.tsx` | Access AuthContext (user, token, login, logout, etc.) |
| `useMobile` | `modules/publications/components/ui/use-mobile.ts` | Media query hook for mobile breakpoint detection |

---

## Styling System

- **Framework:** Tailwind CSS v4 with `@theme inline` tokens
- **Design tokens (CSS variables):** oklch color space for background, foreground, primary, secondary, muted, accent, destructive, border, input, ring
- **Brand colors:** `#101A24` (dark teal/navy — "brand-teal"), `#E5DDC6` (cream — "brand-cream")
- **Radius:** `--radius: 0.5rem` with computed sm/md/lg variants
- **Fonts:** Plus Jakarta Sans (wght 400–800) + JetBrains Mono (400–500) loaded from Google Fonts in `index.html`; Inter and Outfit declared as CSS vars but loaded from Google Fonts
- **Icons:** Lucide React throughout the app
- **Animation:** Framer Motion available (package installed) but primarily CSS transitions/Tailwind `animate-*` used
- **Dark mode:** `next-themes` package installed but NO dark mode toggle or theme switching found in code — UNCERTAIN if implemented
- **Component library:** shadcn/ui pattern — Radix UI primitives wrapped with Tailwind + CVA, duplicated in events and publications module `ui/` folders
- **Custom scrollbar CSS:** 4 scrollbar variants in `index.css` (no-scrollbar, scroll-thin, subtle-scrollbar, navbar-scrollbar)
- **Module-specific CSS:** `publications/pages/admin/theme.css` (6,996 B) for admin dashboard theming

---

## Counts (Computed)

| Metric | Count |
|--------|-------|
| Total source files under `src/` | 166 |
| TSX files | 109 |
| JSX files | 25 |
| TS files | 26 |
| CSS files | 6 (index.css, App.css, theme.css, + shadcn ui utils) |
| Total lines under `src/` | 33,673 |
| Pages (route-mapped components) | 44 (routes), ~38 unique page components |
| Components (reusable) | ~58 (36 ui primitives + 22 module components) |
| Custom hooks | 2 (useAuth, useMobile) |
| Contexts | 1 (AuthContext) |
| Service/API files | 8 |
| Type definition files | 5 |

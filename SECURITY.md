# G-Portal Security Policy & Implementation Details

This document outlines the security controls implemented across the G-Portal platform, mapped directly to the **OWASP Top 10 (2021)** vulnerability categories. Each section includes the specific code-level implementation, the files involved, and the reasoning behind the architectural decisions.

G-Portal consists of three independently deployable Express.js backends (**Auth Service**, **Events Backend**, **Publications Backend**) sharing a single Neon PostgreSQL database, with a React TypeScript frontend. Security controls are applied at every layer of this stack.

---

## 1. A01:2021 — Broken Access Control

### Role-Based Access Control

Every protected route enforces role-based access through JWT middleware. The token payload includes the user's `role` field (`student`, `faculty`, or `admin`), verified on every request by `authMiddleware.js`:

```javascript
// auth-service/src/middleware/authMiddleware.js

const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
        'SELECT token_version, is_active FROM users WHERE id = $1',
        [decoded.userId]
    );

    if (rows[0].token_version !== decoded.tokenVersion) {
        throw new Error('Session is invalid or expired.');
    }

    req.user = decoded;
    next();
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
};
```

Admin-only routes (user CRUD, bulk import, AI analysis) are guarded by chaining `protect` → `requireAdmin`:

```javascript
// auth-service/src/routes/adminRoutes.js

router.use(protect);
router.use(requireAdmin);

router.post('/users', adminController.createUser);
router.post('/users/bulk', adminController.bulkCreateUsers);
router.get('/users', adminController.listUsers);
```

### JWT Token Versioning (Stateful Session Invalidation)

Rather than maintaining a Redis blacklist or relying on pure stateless JWTs, G-Portal implements **DB-backed token versioning**. Every user row contains a `token_version` integer. Every authenticated API request executes a lightweight query to verify the token's embedded version matches the database:

```javascript
const { rows } = await pool.query(
    'SELECT token_version, is_active FROM users WHERE id = $1',
    [decoded.userId]
);

if (rows[0].token_version !== decoded.tokenVersion) {
    throw new Error('Session is invalid or expired.');
}
```

Any password change, account deactivation, or global logout immediately invalidates **all** outstanding JWTs by incrementing the version:

```javascript
await pool.query(
    'UPDATE users SET token_version = token_version + 1 WHERE id = $1',
    [userId]
);
```

This is replicated across all three backends — a single version bump in the shared database instantly invalidates sessions across Auth Service, Events Backend, and Publications Backend without inter-service communication.

### Login Rate Limiting

Brute-force protection is enforced at the route level via `express-rate-limit`:

```javascript
// auth-service/src/routes/authRoutes.js

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15-minute window
    max: 10,                     // 10 attempts per IP
    message: {
        success: false,
        message: 'Too many login attempts. Try again in 15 minutes.'
    },
    standardHeaders: true,       // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,        // Disable X-RateLimit-* headers
});

router.post('/login', loginLimiter, validateLogin, login);
```

---

## 2. A02:2021 — Cryptographic Failures

### Password Hashing

All passwords are hashed using **bcryptjs** with 10 salt rounds before storage. Plaintext passwords never touch the database:

```javascript
const bcrypt = require('bcryptjs');

// Registration / password set
const hashedPassword = await bcrypt.hash(plainPassword, 10);
await pool.query(
    'UPDATE users SET password = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2',
    [hashedPassword, userId]
);

// Login verification
const isMatch = await bcrypt.compare(submittedPassword, user.password);
```

### Cryptographically Secure OTP Generation

OTP generation was migrated from the predictable `Math.random()` to Node.js's native `crypto` module, which sources entropy from the operating system's CSPRNG:

```javascript
// auth-service/src/utils/otpUtils.js

const { randomInt } = require('crypto');

function generateOTP() {
    return randomInt(100000, 999999).toString();
}
```

This produces a uniform distribution across all 900,000 possible 6-digit values with no statistical bias or predictability.

### Transport & Storage Encryption

- **Database connections** enforce `sslmode=require` in the Neon PostgreSQL connection string — all data in transit between backends and the database is TLS-encrypted.
- **JWT signing** uses a secret sourced exclusively from the `JWT_SECRET` environment variable — never hardcoded in source.
- **All secrets** (`DATABASE_URL`, `JWT_SECRET`, `SCOPUS_API_KEY`, `WOS_API_KEY`, `SERPAPI_KEY`, `GEMINI_API_KEY`, `GMAIL_APP_PASSWORD`) are loaded from `.env` files via `dotenv` and excluded from version control via `.gitignore`.

---

## 3. A03:2021 — Injection

### Parameterized Raw SQL Queries

G-Portal bypasses ORM abstraction and writes raw SQL exclusively through the `pg` driver's **strict parameterized query** interface. No user input is ever string-concatenated into a query. All values are bound via positional `$N` parameters:

```javascript
// Example: Password update — auth-service/src/controllers/passwordController.js

await pool.query(
    'UPDATE users SET password = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2',
    [hashedPassword, userId]
);
```

```javascript
// Example: Publication lookup — publications-backend/src/controllers/publicationController.js

const result = await pool.query(
    'SELECT * FROM publications WHERE faculty_id = $1 AND doi = $2',
    [facultyId, doi]
);
```

The `pg` driver handles all escaping and type coercion internally. Because the query structure and the data are sent to PostgreSQL as separate protocol messages, **SQL injection is structurally impossible** — not just mitigated, but eliminated at the protocol level.

### Input Validation Middleware

Strict payload validation is executed **before** requests reach any controller, using `express-validator`:

```javascript
// auth-service/src/middleware/validateInput.js

const { body, validationResult } = require('express-validator');

const validateLogin = [
    body('facultyId').trim().notEmpty().withMessage('Faculty ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

const validateOTP = [
    body('otp').isLength({ min: 6, max: 6 }).isNumeric()
        .withMessage('OTP must be a 6-digit number'),
    // ... validation result check
];

const validatePasswordReset = [
    body('newPassword').isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    // ... validation result check
];
```

These middleware functions (`validateLogin`, `validateOTP`, `validatePasswordReset`) are applied directly on routes before the controller executes:

```javascript
router.post('/login', loginLimiter, validateLogin, login);
router.post('/verify-otp', validateOTP, verifyOtp);
router.post('/first-login/set-password', validatePasswordReset, setFirstLoginPassword);
```

---

## 4. A04:2021 — Insecure Design

### First-Login Setup Token (Purpose-Restricted JWT)

The first-login flow issues a restricted **setupToken** — a 15-minute JWT with `purpose: 'setup'` embedded in its payload. This token is **only valid for the set-password endpoint**, not for any data access routes:

```javascript
const setupToken = jwt.sign(
    { userId: user.id, purpose: 'setup' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
);
```

The `set-password` endpoint explicitly verifies the token's purpose before allowing password creation:

```javascript
if (decoded.purpose !== 'setup') {
    return res.status(403).json({ success: false, message: 'Invalid token purpose.' });
}
```

This prevents users from bypassing the mandatory password setup phase or reusing setup tokens for data access.

### Two-Step Admin Google Verification Gate

Admin access requires a **two-phase verification gate** that structurally prevents brute-force attacks on admin accounts:

1. **Phase 1 — Google Workspace Verification:** The admin must first authenticate via their Google Workspace account. The backend verifies the Google ID token using `google-auth-library` and checks the email against the `ADMIN_EMAILS` whitelist in the environment.
2. **Phase 2 — Credentials + OTP:** Only after successful Google verification is the admin permitted to enter their ID/Password + OTP combination.

The password login form is never exposed to unauthenticated users — an attacker cannot even attempt credential brute-force without first compromising a whitelisted Google Workspace account.

### Schema Separation (Academic Identity vs. Auth Credentials)

The database schema intentionally separates **public academic identity** from **private authentication credentials**:

| Table              | Contains                                                        | Exposure |
|--------------------|-----------------------------------------------------------------|----------|
| `faculty_profile`  | Scholar URL, Scopus Author ID, ORCID, department, designation   | Public   |
| `users`            | Password hash, OTP codes, token version, lockout timers, email  | Private  |

Read-only metric endpoints (e.g., `scholarMetricsController.js`) only interact with `faculty_profile`. This strict schema separation **guarantees** that unauthenticated public profile queries physically cannot access sensitive fields from the `users` table — password hashes, OTP codes, auth states, and token versions are in a completely separate table that these queries never touch.

---

## 5. A05:2021 — Security Misconfiguration

### HTTP Header Hardening

**Helmet.js** is applied globally on all three Express backends to set secure HTTP headers — preventing clickjacking, MIME-sniffing, and XSS:

```javascript
// Applied in: auth-service/src/server.js
//             events-backend/src/server.js
//             publications-backend/src/server.js

const helmet = require('helmet');
app.use(helmet());
app.disable('x-powered-by');
```

Helmet automatically sets:
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking via iframe embedding
- `Strict-Transport-Security` — enforces HTTPS
- `X-XSS-Protection` — enables browser XSS filters
- `X-Powered-By` — explicitly disabled to avoid leaking the Express.js stack

### CORS Restrictions

Cross-Origin Resource Sharing is strictly limited to the `FRONTEND_URL` environment variable. Requests from unlisted origins are rejected:

```javascript
// publications-backend/src/server.js

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',').map(s => s.trim());

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
    },
    credentials: true
}));
```

```javascript
// events-backend/src/server.js
app.use(cors({ origin: process.env.FRONTEND_URL }));
```

> **Note:** CORS was previously set to wildcard (`*`) on the publications backend. This has been fixed to use the allowlist pattern above.

### Development Mode Gate

A `DEV_MODE` environment variable gates all development conveniences (such as OTP bypass for testing). In production, this flag is set to `false`, ensuring these bypasses are completely inaccessible:

```javascript
if (process.env.DEV_MODE === 'true') {
    // OTP bypass logic — only executes in development
}
```

---

## 6. A06:2021 — Vulnerable and Outdated Components

### Dependency Security Audits

`npm audit` is consistently run across all three backend microservices to identify and remediate known vulnerabilities in the dependency tree:

```bash
cd auth-service && npm audit
cd events-backend && npm audit
cd publications-backend && npm audit
```

### Deterministic Builds

All `package-lock.json` files are **strictly committed** to the repository, ensuring deterministic builds across environments. This prevents unexpected vulnerable transitive dependencies from being silently injected during `npm install` on deployment servers.

No `--force` or `--legacy-peer-deps` flags are used during installation, ensuring the dependency resolver catches incompatible or vulnerable package combinations.

---

## 7. A07:2021 — Identification and Authentication Failures

### Strict OTP Lifecycle Constraints

OTP verification is rigorously throttled to prevent enumeration and brute-force attacks. The lifecycle is enforced in `auth-service/src/utils/otpUtils.js` via `checkOTPRateLimit(userId, pool)`:

| Constraint               | Value                | Database Column          | Behavior                                        |
|--------------------------|----------------------|--------------------------|-------------------------------------------------|
| **Rate Limit**           | 50 OTPs per hour     | `otp_requests_reset_at`  | Counter resets after the 1-hour window expires  |
| **Failed Attempt Lockout** | 3 wrong attempts   | `otp_locked_until`       | Account locked for 15 minutes                   |
| **OTP Expiry**           | 10 minutes           | `otp_expires_at`         | OTP becomes invalid after 10 minutes            |
| **Cleanup on Success**   | Immediate            | `otp_code`, `otp_*`      | All OTP fields cleared on successful verification |

```javascript
// Lockout check
if (user.otp_locked_until && new Date() < new Date(user.otp_locked_until)) {
    logSecurityEvent('OTP_LOCKED', { userId, ip: req.ip });
    return res.status(429).json({
        success: false,
        message: 'Account temporarily locked. Try again in 15 minutes.'
    });
}

// Rate limit check
if (user.otp_request_count >= 50 && new Date() < new Date(user.otp_requests_reset_at)) {
    return res.status(429).json({
        success: false,
        message: 'OTP rate limit exceeded. Try again later.'
    });
}
```

### Two-Step Admin Verification

Admin login enforces a mandatory two-step process:

1. **Google OAuth gate** — verifies the admin's Google Workspace identity against the `ADMIN_EMAILS` environment whitelist.
2. **Credential + OTP gate** — standard ID/Password authentication followed by email OTP verification.

An attacker must compromise **both** the Google Workspace account and the admin credentials to gain access.

### Instant Session Revocation

The token versioning system (detailed in A01) allows **instant, global session invalidation** across all three microservices with a single database update. This is triggered on:
- Password changes
- Account deactivation
- Explicit "logout all sessions" action
- Admin-initiated user status toggle

---

## 8. A08:2021 — Software and Data Integrity Failures

### Input Integrity via Validation Middleware

All authentication payloads are validated by `express-validator` middleware **before** reaching controller logic. Three dedicated validators are defined in `auth-service/src/middleware/validateInput.js`:

- **`validateLogin`** — enforces non-empty `facultyId` and `password` fields
- **`validateOTP`** — enforces exactly 6 numeric digits
- **`validatePasswordReset`** — enforces minimum 8-character password length

Requests failing validation receive a `400` response with structured error messages and never reach the database layer.

### Bulk Import Size Limits

CSV bulk user import operations are **hard-limited to 500 rows per batch** to prevent memory exhaustion and denial-of-service:

```javascript
if (records.length > 500) {
    return res.status(400).json({
        success: false,
        message: 'CSV exceeds maximum of 500 rows per batch.'
    });
}
```

### PostgreSQL Savepoints for Per-Row Failure Isolation

Bulk user creation wraps each row in its own PostgreSQL `SAVEPOINT` within a single transaction. A failing row (duplicate ID, malformed data) is rolled back in isolation — the remaining rows commit successfully:

```javascript
await client.query('BEGIN');

for (let i = 0; i < records.length; i++) {
    try {
        await client.query(`SAVEPOINT row_${i}`);

        // Insert user logic...

        await client.query(`RELEASE SAVEPOINT row_${i}`);
        successCount++;
    } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT row_${i}`);
        failures.push({ row: i + 1, error: err.message });
    }
}

await client.query('COMMIT');
```

This guarantees that a single bad row in a 500-row CSV does not roll back the entire batch. The response includes a detailed breakdown of successful inserts, skipped duplicates, and failed rows with specific error messages.

---

## 9. A09:2021 — Security Logging and Monitoring Failures

### Structured Security Event Logging

A centralized `logSecurityEvent` function captures all critical authentication and security events with timestamps and contextual metadata. This function is defined in `utils/securityLogger.js` and copied across all three backends:

```javascript
// auth-service/src/utils/securityLogger.js
// events-backend/src/utils/securityLogger.js
// publications-backend/src/utils/securityLogger.js

const logSecurityEvent = (event, details = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        ...details
    };
    console.log('[SECURITY]', JSON.stringify(logEntry));
};

module.exports = { logSecurityEvent };
```

### Captured Security Events

| Event                  | Context Fields           | Trigger                                           |
|------------------------|--------------------------|---------------------------------------------------|
| `LOGIN_FAILED`         | `ip`, `facultyId`        | Invalid credentials submitted                     |
| `LOGIN_SUCCESS`        | `ip`, `role`, `userId`   | Successful authentication                         |
| `OTP_LOCKED`           | `ip`, `userId`           | 3 failed OTP attempts — account locked 15 minutes |
| `LOGOUT_ALL`           | `userId`                 | Token version incremented, all sessions killed     |
| `ADMIN_USER_CREATED`   | `adminId`, `newUserId`   | Admin creates a new user account                  |
| `SSRF_BLOCKED`         | `blockedUrl`             | Outbound request to unlisted host intercepted      |

### Log Format

Output is **structured JSON** — each log entry is a single-line JSON object prefixed with `[SECURITY]`. This format pipes directly into external log aggregators (Datadog, CloudWatch, Papertrail, ELK) without any transformation or parsing:

```
[SECURITY] {"timestamp":"2025-09-24T18:30:00.000Z","event":"LOGIN_FAILED","ip":"203.0.113.42","facultyId":"FAC001"}
[SECURITY] {"timestamp":"2025-09-24T18:30:05.000Z","event":"OTP_LOCKED","userId":42,"ip":"203.0.113.42"}
[SECURITY] {"timestamp":"2025-09-24T18:31:00.000Z","event":"SSRF_BLOCKED","blockedUrl":"http://169.254.169.254/latest/meta-data/"}
```

---

## 10. A10:2021 — Server-Side Request Forgery (SSRF)

### Outbound Fetch Guarding

The Publications Backend makes outbound HTTP requests to third-party APIs (Scopus, Web of Science, Google Scholar, SerpAPI, Scimago) for data synchronization. These requests do **not** blindly trust URL strings. All external fetches flow through a `guardedFetch` wrapper that validates the target hostname against an explicit allowlist:

```javascript
// publications-backend/src/utils/ssrfGuard.js

const { logSecurityEvent } = require('./securityLogger');

const ALLOWED_HOSTS = [
    'api.elsevier.com',       // Scopus API
    'api.clarivate.com',      // Web of Science API
    'scholar.google.com',     // Google Scholar scraping
    'serpapi.com',            // SerpAPI
    'api.serpapi.com',        // SerpAPI (alternate)
    'www.scimagojr.com',      // Scimago journal rankings
];

async function guardedFetch(url, options = {}) {
    const parsedUrl = new URL(url);

    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
        logSecurityEvent('SSRF_BLOCKED', { blockedUrl: url });
        throw new Error(`SSRF blocked: ${parsedUrl.hostname} is not in the allowed hosts list.`);
    }

    return fetch(url, options);
}

module.exports = { guardedFetch };
```

### Protection Scope

- **Blocked:** Any URL with a hostname not in `ALLOWED_HOSTS` — including `localhost`, `127.0.0.1`, `169.254.169.254` (AWS metadata), internal IPs, and arbitrary external domains.
- **Logged:** Every blocked request triggers `logSecurityEvent('SSRF_BLOCKED')` with the attempted URL for audit.
- **No bypass:** The `guardedFetch` function is the **only** outbound HTTP mechanism used in the Publications Backend. Direct `fetch` or `axios` calls to external URLs are not used elsewhere.

---

## Security Architecture Decisions & Tradeoffs

### 1. Token Versioning over Redis Blacklist

**Decision:** Store a `token_version` integer column in the PostgreSQL `users` table instead of maintaining an ephemeral Redis blacklist for revoked JWTs.

**Why:** This eliminates Redis as an infrastructure dependency entirely — no Redis server to provision, no connection pooling to manage, no cache eviction policies to configure, no data sync between Redis and PostgreSQL. The entire auth state lives in a single source of truth (the database).

**Tradeoff:** Every authenticated API request executes a lightweight `SELECT token_version, is_active FROM users WHERE id = $1` query against PostgreSQL. This adds ~1-3ms of latency per request compared to a Redis lookup (~0.1ms). At G-Portal's current scale (university-internal, hundreds of concurrent users), this overhead is negligible.

**When Redis would make sense:** If G-Portal scaled to thousands of concurrent requests per second, the per-request DB query would become a bottleneck. At that point, migrating token version checks to a Redis cache (synced from PostgreSQL on writes) would be appropriate — but would introduce cache invalidation complexity and a new infrastructure dependency.

### 2. Raw SQL over ORM for Injection Prevention

**Decision:** Write raw SQL exclusively through the `pg` driver's parameterized query interface. No ORM (Prisma, TypeORM, Sequelize) is used anywhere in the codebase.

**Why:** ORMs introduce abstraction layers that can have their own injection vectors — query builder bugs, unsafe `.raw()` methods, dynamic field mapping edge cases. With raw parameterized `pg` queries, SQL injection prevention operates at the **PostgreSQL wire protocol level**: the query string and parameter values are sent as separate protocol messages. The database server itself handles escaping — there is no application-layer string manipulation that could be bypassed.

**Tradeoff:** This increases codebase verbosity significantly. Every query must be hand-written, and relational mapping (joins, nested includes, eager loading) is manual. There are no automated migrations — schema changes are applied via raw SQL scripts. Type safety at the query boundary is the developer's responsibility, not the framework's.

### 3. Faculty Profile FK Separation

**Decision:** Separate `faculty_profile` (public academic identity: Scholar URL, Scopus ID, ORCID, department) from `users` (private credentials: password hash, OTP codes, token version, lockout timers). Use `faculty_profile.id` as the foreign key across all academic entities (publications, conferences, books).

**Why:** Read-only endpoints that serve public academic data (publication listings, citation metrics, Scholar profiles) query `faculty_profile` and related tables via `JOIN faculty_profile fp ON p.faculty_id = fp.id`. These queries **structurally cannot** access the `users` table — even a SQL injection (if one somehow bypassed parameterization) in a publications query could not extract password hashes or OTP codes, because those columns exist in a different table that the query never references.

**Tradeoff:** Cross-domain operations (e.g., displaying a faculty member's name alongside their publications) require explicit `JOIN` operations across both tables. This adds query complexity but enforces a clear security boundary between authentication data and academic data.

### 4. JWT in localStorage (Not HttpOnly Cookies)

**Decision:** JWT tokens are returned in the API response body and stored by the React frontend in `localStorage`, rather than being set via `Set-Cookie: HttpOnly` headers.

**Why:** G-Portal's frontend communicates with **three independent backend origins** (Auth on `:5003`, Events on `:5001`, Publications on `:5000`). `HttpOnly` cookies are bound to a single origin — making cross-origin cookie sharing across three backends extremely complex. It would require a shared parent domain, `SameSite=None` configuration, and careful `withCredentials` handling — all of which introduce their own security surface area (CSRF, cookie tossing).

**Implication:** Tokens in `localStorage` are accessible to any JavaScript executing in the page context. An XSS vulnerability could exfiltrate the JWT.

**Compensating controls:**
- **Helmet.js** sets `X-XSS-Protection`, `Content-Type-Options: nosniff`, and strict CSP headers to reduce XSS attack surface.
- **React's default escaping** — React automatically escapes all rendered content, preventing most reflected and stored XSS vectors.
- **Token versioning** — even if a token is exfiltrated, the victim can immediately invalidate it via "logout all sessions," and the attacker's stolen token becomes useless within one request.
- **Short-lived tokens** — JWTs expire after 7 days, limiting the window of exploitation.

---

## Known Limitations

| Limitation | Impact | Status |
|---|---|---|
| **JWT stored in `localStorage`** | Tokens are accessible to JavaScript — vulnerable to XSS exfiltration | Compensated by Helmet, React escaping, and token versioning |
| **No automated tests** | Zero unit, integration, or regression test files across all 3 backends | Acknowledged — manual testing only |
| **Ephemeral file storage** | Uploaded files (certificates, photos) stored on Render's disk are lost on every redeploy | Cloudinary SDK is configured in `publications-backend` but not actively connected for file persistence |
| **No retry on 429 during nightly sync** | If Scopus or WoS returns a rate limit error during the nightly cron, the affected faculty is skipped with no automatic retry | Sync resumes for the next faculty; failed faculty must wait for the next nightly run |
| **Admin emails written to `.env` at runtime** | Bulk admin imports append email addresses to the running `.env` file | Admin access additions are lost on the next Render redeploy |
| **No refresh token mechanism** | JWTs are issued with a fixed 7-day expiry and there is no silent refresh flow | Users must re-authenticate when their token expires |

---

## Responsible Disclosure

If you discover a security vulnerability in G-Portal, we ask that you **disclose it responsibly**:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. **Email** the maintainer directly with a detailed description of the vulnerability, steps to reproduce, and potential impact.
3. Allow a reasonable window (90 days) for the issue to be investigated and patched before any public disclosure.
4. We will acknowledge receipt within 48 hours and provide a timeline for remediation.

We appreciate the security research community's efforts in helping keep G-Portal and its users safe. All valid reports will be credited (with your permission) in the project's changelog.

---

*Last updated: September 2025*

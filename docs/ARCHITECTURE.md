# Architecture

## Goals (from BRD)

- Citizens (auth or anonymous) submit complaints against Hospitals, Doctors, or Health Insurance Funds.
- Submitted complaint is forwarded by email to the target institution **and** to the Ombudsman.
- Authorized submissions forward immediately; anonymous submissions wait for admin moderation.
- Admins moderate, manage institutions, see statistics.
- Authorized users can view (read-only) the history of their own complaints.

## Tech choices

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React 18 + Vite + TypeScript | BRD lists React/Angular/Vue; React has largest ecosystem and fastest iteration. |
| UI | TailwindCSS + shadcn/ui | Composable, accessible, no heavy runtime. |
| State / data | Zustand (client state) + TanStack Query (server state) | Minimal, no Redux boilerplate. |
| Routing | React Router v6 | Standard. |
| i18n | react-i18next | EN first; BG namespace scaffolded. |
| Backend | Node.js 20 + Express + TypeScript | BRD-compatible; broad familiarity. |
| ORM | Prisma | Type-safe, migrations are first-class. |
| Validation | Zod | Shared validation shapes between request schemas and types. |
| Auth | Passport.js (Local + Google + Facebook), JWT (access + refresh), Argon2 | OWASP-aligned. |
| Files | Multer + local volume (`/var/app/uploads`) behind a `StorageService` interface | Local for MVP; S3 driver later. |
| Email | Nodemailer + DB-backed outbox + worker | Persistent retry across restarts. |
| CAPTCHA | hCaptcha (server-side verify) | Free tier, no Google dependency required. |
| Database | PostgreSQL 16 | BRD-listed, mature, JSONB for audit metadata. |
| Logging | Pino + pino-http | Structured JSON logs; redacts auth headers. |
| Tests | Backend: Jest + Supertest. Frontend: Vitest + React Testing Library + Playwright (E2E). | Standard. |
| Containers | Docker + Docker Compose | Local-only deployment for MVP. |

## High-level topology

```
                    +-----------------+
 Browser ---HTTPS-->|  Frontend (Vite |   static build behind nginx in prod;
                    |   build, nginx) |   vite dev server in dev compose.
                    +--------+--------+
                             |
                             v
                    +-----------------+    +-----------------+
                    |  Backend API    |--->|  PostgreSQL     |
                    |  (Express + TS) |    +-----------------+
                    |  - REST         |
                    |  - JWT          |    +-----------------+
                    |  - Outbox       |--->|  MailHog (dev)  |
                    |     worker      |    |  / SMTP relay   |
                    +-----------------+    +-----------------+
                             |
                             v
                       Local uploads volume
```

In compose, services are: `frontend`, `backend`, `postgres`, `mailhog`. A named volume backs Postgres data and another holds uploaded attachments.

## Backend module layout

```
backend/src/
  app.ts                  Express wiring (helmet, cors, rate-limit, body parsers, routes, error handler)
  server.ts               Boot + graceful shutdown
  config/                 env loading & runtime config object
  middleware/             auth, rbac, error, validate (Zod), captcha, rateLimit
  modules/
    auth/                 register, login, refresh, verify-email, oauth (google, facebook), forgot/reset password
    users/                profile (read-only own profile), admin user list, role updates, deactivate
    consents/             record of consent acceptance (version, ts, user)
    complaints/           submit (auth + anon), list (own / admin), get by id, status transitions
    attachments/          upload, fetch (RBAC-gated), delete
    categories/           seed-fixed list (Hospitals, Doctors, Insurance Funds)
    institutions/         CRUD (admin)
    statistics/           aggregates, export (csv, pdf)
    admin/                moderation queue endpoints (approve / reject anonymous)
    email/                templates (handlebars), outbox repository, worker, retry strategy
    ombudsman/            SMTP gateway adapter (interface-first for future API impl)
    auditLog/             append-only log of auth + complaint state changes
  lib/                    jwt, password, captcha, logger, ids (nanoid public IDs), pdf, csv
  prisma/                 schema.prisma, migrations/, seed.ts
```

## Frontend module layout

```
frontend/src/
  main.tsx
  App.tsx
  router.tsx
  api/                  axios instance + typed endpoint wrappers
  hooks/                useAuth, useMe, useComplaints, etc.
  stores/               auth store (Zustand)
  pages/
    public/             Home (stats summary + CTA), About, Privacy, Terms
    auth/               Login, Register, VerifyEmail, ForgotPassword, ResetPassword, OAuthCallback
    complaints/         Submit, MyComplaints, ComplaintDetail
    admin/              Dashboard, ComplaintsQueue, Users, Institutions, Statistics
  components/
    forms/              ComplaintForm, RegisterForm, etc.
    ui/                 Button, Card, Modal, Toast (shadcn-derived)
    layout/             Header, Footer, Sidebar
    feedback/           StatusBadge, EmptyState, ErrorBoundary
  i18n/
    config.ts
    locales/en/*.json
    locales/bg/*.json   keys scaffolded, copy in EN fallback
  utils/                formatters, fileSize, classNames
  types/                Shared DTO types (kept in sync with backend; see API_CONTRACT.md)
```

## Status workflow

```
Submitted ──> PendingReview (anon only) ──> Approved ──> Forwarded ──> Closed
                                       └─> Rejected
   (auth user) ────────────────────────────────────────> Forwarded ──> Closed
```

- `Submitted` is the immediate state after persist.
- Anonymous: transitions to `PendingReview`; admin moves to `Approved` (which triggers forwarding) or `Rejected`.
- Authorized: transitions directly to `Forwarded` after the outbox dispatches the institution email.
- `Closed` is admin-only and is the terminal state.

## Email delivery (BRD §2.9 — 5 retries)

`EmailOutbox` table persists every outgoing email. The worker (runs in the same Node process via `setInterval`, but is leader-elected via a Postgres advisory lock so multiple replicas are safe) polls every 15s for `status IN ('pending','failed')` with `attempts < 5` and `next_attempt_at <= now()`. Exponential backoff: 1m, 5m, 15m, 1h, 6h. After 5 failures the row is marked `dead`; an admin alert is logged.

Three message types in MVP:
- `complaint.to_institution` — body of the complaint with the predefined institution header.
- `complaint.to_ombudsman` — predefined Ombudsman header + complaint reference.
- `complaint.to_user_copy` — sent when `email` provided, predefined user header.
- (auth) `auth.verify_email`, `auth.password_reset` — separate retry/dead-letter same outbox.

## Security

- HTTPS in production (terminated at reverse proxy; local dev uses HTTP).
- Argon2id for passwords; password policy ≥8 chars with upper/lower/digit/special.
- JWT: HS256 with rotating refresh tokens, 15-minute access, 7-day refresh, refresh stored hashed in DB and revocable.
- CSRF: stateless API — refresh token lives in HttpOnly + SameSite=Lax cookie; access token in memory only.
- CORS: whitelist frontend origin from env.
- Helmet (CSP allows `self` + necessary OAuth providers).
- Rate limiting: per-IP global (300/min), per-route on auth and complaint submit (10/min).
- CAPTCHA required for register, anonymous complaint submit, password reset request.
- Multer: per-file size cap, per-request cap (3 files / 5MB total), MIME and magic-byte validation, randomized filenames, stored outside webroot.
- RBAC: Express middleware checks `req.user.role` against route policy; admin-only endpoints under `/api/admin/*`.
- Audit log for: register, login (success/fail), password change, role change, complaint create/state change, attachment upload, admin action.
- Secrets: `.env`, never committed; `.env.example` checked in.

## GDPR notes

- Consent capture: store version + timestamp at registration.
- Right to be forgotten: admin endpoint pseudonymizes the user (replaces email/name with `deleted-<uuid>`) but retains complaint records (legal interest). Audit entry retains who actioned the deletion.
- Data export: admin endpoint returns a JSON dump of one user's data.
- Personal data minimization: phone is optional and unused (email-only verification in MVP).

## Localization

- Default locale: `en`. `bg` namespace exists but unfilled — all keys fall back to `en`.
- Backend error messages return stable codes (`AUTH_INVALID_CREDENTIALS`); frontend maps codes to translated strings.

## No-AI-attribution requirement

- No code comments, headers, or commit messages may reference AI, Claude, Anthropic, or "generated".
- README, package.json author fields, and license blocks must look like a normal human-authored project.
- Agents must not add `// Generated by ...`, "AI-assisted", or similar markers anywhere.

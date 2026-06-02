# Vallentin Claims

Web-based complaint management platform for healthcare institutions. Citizens submit complaints against hospitals, doctors, and health insurance funds; the system routes them to the relevant institution with a copy to the Ombudsman.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript, TailwindCSS, react-i18next, TanStack Query, Zustand, React Router
- **Backend:** Node.js 20 + Express + TypeScript, Prisma ORM, Zod validation, Passport (Google + Facebook OAuth)
- **Database:** PostgreSQL 16
- **Email:** Nodemailer + MailHog (dev), DB-backed outbox with 5-attempt retry
- **Auth:** JWT (access + refresh) with rotation and reuse detection, Argon2id password hashing, hCaptcha, per-account login lockout
- **Deployment:** Docker Compose (frontend, backend, postgres, mailhog)

## Repository Layout

```
backend/      Express API, Prisma schema and migrations, business logic
frontend/     React SPA
docs/         ARCHITECTURE.md, API_CONTRACT.md, DATA_MODEL.md
```

## Prerequisites

- Docker Desktop (running)
- Node.js 20 or later (only required for the local-dev mode)
- Git

## Configuration

Copy the env template once:

```bash
cp .env.example .env
```

Two notes about the defaults:

- `DATABASE_URL` uses the hostname `postgres`, which is the Docker service name. That works only when the backend is running inside Docker. For host-side development, override it to `localhost:5433`.
- `UPLOAD_DIR=/var/app/uploads` is the path inside the backend container. For host-side development on Windows, override to a local path such as `./uploads` to avoid translating to `C:\Program Files\Git\var\...` under Git Bash.
- The Postgres container is published on host port **5433** (not 5432) to avoid conflicting with any other local Postgres installation.

The seeded admin credentials come from `.env`:

- Email: `admin@vallentin.local`
- Password: `ChangeMe!Now1`

Change these (and the JWT and hCaptcha secrets) before deploying to anything that isn't a local laptop.

## Mode A — Run everything in Docker

The fastest path. Brings up `postgres`, `mailhog`, `backend` (tsx watch), and `frontend` (Vite dev server) in containers:

```bash
docker compose up --build
```

The backend container's entrypoint runs `prisma migrate deploy` on start, so the schema lands automatically. Seed the database once, from a second terminal:

```bash
docker compose exec backend npm run seed
```

Then open:

- App: <http://localhost:5174>
- API health: <http://localhost:3000/api/health>
- Captured emails (MailHog): <http://localhost:8025>
- Postgres: `localhost:5433` (user `vallentin`, password `vallentin`, db `vallentin`)

To stop: `docker compose down`. Add `-v` to also drop the Postgres data volume.

## Mode B — Postgres + MailHog in Docker, app code on host (recommended for development)

Live reloads, native debugger, lower Docker friction. Override the three env values that change when the backend runs on the host instead of in a container:

```ini
DATABASE_URL=postgresql://vallentin:vallentin@localhost:5433/vallentin?schema=public
SMTP_HOST=localhost
UPLOAD_DIR=./uploads
```

Then:

```bash
# 1. Start just the infrastructure
docker compose up -d postgres mailhog

# 2. Install dependencies (npm workspaces — covers backend + frontend)
npm install

# 3. Run migrations and seed the database
cd backend
npx prisma migrate deploy
npm run seed
cd ..

# 4. Backend dev server (terminal 1) — watches and reloads on save
cd backend && npm run dev

# 5. Frontend dev server (terminal 2) — Vite HMR on http://localhost:5174
cd frontend && npm run dev
```

URLs are the same as Mode A.

## Verifying

A quick smoke from a third terminal:

```bash
curl http://localhost:3000/api/health
# {"status":"ok"}

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vallentin.local","password":"ChangeMe!Now1"}'
# returns {"accessToken":"...","user":{...}}
```

In the browser:

1. Open <http://localhost:5174>, log in with the seeded admin credentials.
2. Submit a complaint via the **Submit complaint** form.
3. Within ~15 seconds the outbox worker dispatches the institution and Ombudsman emails. Confirm at <http://localhost:8025>.

## Common dev tasks

| Task | Command |
|------|---------|
| Type-check backend | `cd backend && npm run typecheck` |
| Type-check frontend | `cd frontend && npx tsc --noEmit` |
| Lint | `npm run lint` (in each workspace) |
| Backend unit tests | `cd backend && npm test` |
| Frontend unit tests | `cd frontend && npm test -- --run` |
| Playwright E2E | `cd frontend && npx playwright install && npm run test:e2e` (live-backend specs gated by `E2E_LIVE_BACKEND=1`) |
| New Prisma migration | edit `backend/prisma/schema.prisma`, then `cd backend && npx prisma migrate dev --name <slug>` |
| Reseed | `cd backend && npm run seed` |
| Reset the database | `docker compose down -v && docker compose up -d postgres mailhog && cd backend && npx prisma migrate deploy && npm run seed` |

## Troubleshooting

- **Port 5432 already in use** — that is why the compose file maps Postgres to `5433`. If `5433` is also taken, edit `docker-compose.yml` `postgres.ports`.
- **Port 3000 or 5174 in use** — kill the conflicting process. On Windows: `Get-NetTCPConnection -LocalPort 3000` to find the owning PID, then `Stop-Process -Id <pid> -Force`.
- **`Cannot find module @prisma/client`** — run `npx prisma generate` in `backend/` (or `npm install` again to trigger the postinstall hook).
- **`EPERM mkdir 'C:\Program Files\Git\var\app\uploads'`** — set `UPLOAD_DIR=./uploads` in `.env` for Mode B; Git Bash translates the absolute Linux path under its own install directory.
- **Login returns `AUTH_INVALID_CREDENTIALS`** — the seed has not run. From `backend/`, with `.env` loaded, run `npm run seed`.
- **Backend startup error `Invalid environment configuration`** — make sure the env vars from `.env` are actually exported into the shell. On Bash: `set -a && source .env && set +a`. On PowerShell, the cleanest path is Mode A or using a tool such as `dotenv-cli`.

## Roles

- **Admin** — full management, moderates anonymous complaints, manages institutions and users.
- **Authorized user** — submits complaints, tracks their own submissions.
- **Anonymous user** — submits complaints, subject to admin moderation before forwarding.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API_CONTRACT.md)
- [Data Model](docs/DATA_MODEL.md)

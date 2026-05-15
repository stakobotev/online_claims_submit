# Vallentin Claims

Web-based complaint management platform for healthcare institutions. Citizens submit complaints against hospitals, doctors, and health insurance funds; the system routes them to the relevant institution with a copy to the Ombudsman.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript, TailwindCSS, react-i18next, TanStack Query, Zustand, React Router
- **Backend:** Node.js 20 + Express + TypeScript, Prisma ORM, Zod validation, Passport (Google + Facebook OAuth)
- **Database:** PostgreSQL 16
- **Email:** Nodemailer + MailHog (dev), DB-backed outbox with 5-attempt retry
- **Auth:** JWT (access + refresh), Argon2 password hashing, OAuth2
- **Deployment:** Docker Compose (frontend, backend, postgres, mailhog)

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- MailHog UI (captured emails): http://localhost:8025

## Repository Layout

```
backend/      Express API, Prisma schema, business logic
frontend/     React SPA
docs/         ARCHITECTURE.md, API_CONTRACT.md, DATA_MODEL.md
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API_CONTRACT.md)
- [Data Model](docs/DATA_MODEL.md)

## Roles

- **Admin** — full management, moderates anonymous complaints, manages institutions/users.
- **Authorized user** — submits complaints, tracks own submissions.
- **Anonymous user** — submits complaints (subject to admin moderation before forwarding).

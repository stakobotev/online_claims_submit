# Thirstforlife Claims — PHP Edition

A complete rewrite of the Thirstforlife Claims healthcare complaint-management
platform in **plain PHP (no framework)** with **PDO / MySQL (MariaDB)**, intended
for restricted shared hosting where only PHP is permitted.

It is a faithful, feature-for-feature port of the original React + Node/Express
application (which lives in `../frontend` and `../backend`). Nothing in those
folders was modified — this is a self-contained parallel implementation.

---

## What it does (unchanged from the original)

- **Public complaint submission** — anonymous or authenticated, with file
  attachments (PDF/BMP/JPEG/PNG/TIFF, max 3 files / 5 MB), minimum body length,
  and hCaptcha for anonymous submissions.
- **Complaint lifecycle** — anonymous complaints go to `pending_review` and
  require admin approval before forwarding; authenticated complaints are
  forwarded immediately to the selected institution, with a copy to the
  Ombudsman and an optional confirmation copy to the submitter.
- **Public tracking** by complaint ID (`TFL-YYYY-NNNNNN`).
- **Accounts** — register (with terms/privacy/marketing consent capture), email
  verification, login with lockout after repeated failures, password reset, and
  **Google OAuth** sign-in.
- **Admin panel** — dashboard, complaints queue (search / filter / paginate),
  complaint detail with approve / reject / close and an event timeline, user
  management (role & status, GDPR anonymize, JSON data export), institution CRUD,
  and statistics with CSV / PDF export.
- **Bilingual UI** — English & Bulgarian, switchable in the header (same
  translation strings as the original, loaded from `locales/*.json`).
- **Security** — Argon2id password hashing, session auth, CSRF protection on all
  forms, RBAC on the admin area, attachment access control, and an append-only
  audit log.

## Deliberate adaptations for PHP hosting

| Original (SPA + API)                | PHP edition                                   |
|-------------------------------------|-----------------------------------------------|
| JWT access + refresh tokens         | **PHP sessions** (server-rendered app)        |
| Node email outbox worker (polls)    | **Synchronous SMTP send** per request; every message is still recorded in the `EmailOutbox` table |
| Prisma ORM                          | Raw SQL via **PDO** prepared statements       |
| Vite/React build                    | Server-rendered PHP views + one CSS file      |
| PDFKit / Papaparse                  | Built-in `fputcsv` + a tiny bundled PDF writer |
| Passport strategies                 | Plain-curl **Google OAuth** (Facebook omitted) |

The MySQL schema keeps the original table/column names (`User`, `Complaint`,
`emailVerified`, …). The app connects with `ANSI_QUOTES` enabled so its
double-quoted SQL runs unchanged; enum-typed columns use native MySQL `ENUM`,
booleans are `TINYINT(1)`, and full-text search uses a `FULLTEXT` index.

---

## Requirements

- PHP **8.1+** with extensions: `pdo_mysql`, `curl`, `fileinfo`, `mbstring`,
  `openssl`. (Argon2id support is built into PHP 8.)
- MySQL 8.0+ or MariaDB 10.4+.
- An SMTP server for outgoing mail (MailHog in dev).
- No Composer packages are required.

## Setup

1. **Configure**

   ```bash
   cp config/config.example.php config/config.php
   ```

   Edit `config/config.php`: database credentials, `PUBLIC_BASE_URL`, SMTP,
   `OMBUDSMAN_EMAIL`, admin seed credentials, Google OAuth keys, and hCaptcha
   keys. (Any value can also be supplied via an OS environment variable of the
   same name where your host allows it.)

2. **Create the schema and seed data**

   ```bash
   php sql/setup.php
   ```

   This applies `sql/schema.sql` (idempotent), seeds the three categories, the
   runtime configuration, the admin user, and — when `SEED_DEMO_DATA` is true —
   demo institutions. Re-runnable safely.

   > No shell on your host? You can run the setup once through the browser by
   > temporarily copying `sql/setup.php` into `public/` and visiting it, then
   > **delete it**.

3. **Point the web server's document root at `public/`.**

   - Apache with the bundled `public/.htaccess` works out of the box (needs
     `mod_rewrite`).
   - If you cannot change the docroot, the project-root `.htaccess` rewrites into
     `public/` as a fallback and blocks direct access to source folders.
   - nginx: route all non-file requests to `public/index.php`.

4. **Make `storage/uploads/` writable** by the PHP process. Attachments are
   stored there, outside the web root, and served only through the access-checked
   `/attachments/{id}` route.

### Local quick start (PHP built-in server)

```bash
php -S localhost:8080 -t public
```

Then set `PUBLIC_BASE_URL` to `http://localhost:8080` and, for email testing, run
MailHog (SMTP on `localhost:1025`, UI on `http://localhost:8025`).

Default seeded admin (change it!): `admin@health.local` / `ChangeMe!Now1`.

---

## Google OAuth

Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and add this exact redirect URI
in the Google Cloud console:

```
{PUBLIC_BASE_URL}/auth/oauth/google/callback
```

Set the same value in `GOOGLE_REDIRECT_URL`.

## hCaptcha

Set `HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET`. If the secret is left blank,
captcha verification is skipped (handy in development). The bundled defaults are
hCaptcha's public test keys.

---

## Project layout

```
PHP_version/
├── public/            # web root — front controller, .htaccess, assets
│   └── index.php      # single entry point + route table
├── config/            # config.example.php -> copy to config.php
├── src/               # App\ classes (PSR-4 autoloaded)
│   ├── Controllers/   # HTTP handlers (public + Admin/)
│   ├── Services/      # Complaints, Statistics
│   ├── Repo/          # Categories, Institutions, Users
│   ├── Auth.php Mailer.php Captcha.php GoogleOAuth.php Database.php ...
├── views/             # PHP templates (layouts, partials, pages)
├── locales/           # en.json, bg.json (i18n bundles)
├── emails/            # 12 email templates (html + txt)
├── sql/               # schema.sql + setup.php seeder
└── storage/uploads/   # attachment storage (not web-accessible)
```

## Notes & limitations

- Email is sent synchronously; if SMTP fails, the message is recorded in
  `EmailOutbox` with status `failed` and the user request still succeeds. You can
  later add a cron job to retry `failed`/`pending` rows if your host supports it.
- The statistics PDF is a plain text-table export (no charts), produced by a
  small built-in writer to avoid third-party dependencies. CSV contains the same
  columns as the original.
- Facebook login from the original was intentionally left out per project scope;
  the schema still supports it if you add it later.

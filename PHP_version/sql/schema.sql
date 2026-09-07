-- Vallentin Claims — PostgreSQL schema (PHP edition)
-- Faithful port of backend/prisma/schema.prisma. Table/column identifiers keep
-- the Prisma casing ("User", "emailVerified", ...) so the same DB can be shared
-- with the original app if desired, and so generatePublicId's raw SQL matches.

BEGIN;

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('draft', 'pending_confirmation', 'active', 'blocked', 'deactivated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OAuthProvider" AS ENUM ('google', 'facebook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ConsentDocument" AS ENUM ('terms', 'privacy', 'marketing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ComplaintStatus" AS ENUM ('submitted', 'pending_review', 'approved', 'rejected', 'forwarded', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubmissionType" AS ENUM ('authenticated', 'anonymous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmailOutboxStatus" AS ENUM ('pending', 'sent', 'failed', 'dead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ComplaintEventType" AS ENUM ('created', 'pending_review', 'approved', 'rejected', 'forwarded', 'closed', 'email_dispatched', 'email_failed', 'attachment_added');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  "id"               TEXT PRIMARY KEY,
  "email"            TEXT UNIQUE NOT NULL,
  "emailVerified"    BOOLEAN NOT NULL DEFAULT FALSE,
  "name"             TEXT,
  "passwordHash"     TEXT,
  "role"             "UserRole" NOT NULL DEFAULT 'user',
  "status"           "UserStatus" NOT NULL DEFAULT 'pending_confirmation',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastLoginAt"      TIMESTAMPTZ,
  "anonymizedAt"     TIMESTAMPTZ,
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil"      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User" ("role");
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User" ("status");

CREATE TABLE IF NOT EXISTS "OAuthIdentity" (
  "id"             TEXT PRIMARY KEY,
  "userId"         TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "provider"       "OAuthProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("provider", "providerUserId")
);
CREATE INDEX IF NOT EXISTS "OAuthIdentity_userId_idx" ON "OAuthIdentity" ("userId");

CREATE TABLE IF NOT EXISTS "Consent" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "document"   "ConsentDocument" NOT NULL,
  "version"    TEXT NOT NULL,
  "acceptedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress"  TEXT,
  "userAgent"  TEXT
);
CREATE INDEX IF NOT EXISTS "Consent_userId_document_idx" ON "Consent" ("userId", "document");

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "issuedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken" ("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenHash_idx" ON "RefreshToken" ("tokenHash");

CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash"  TEXT UNIQUE NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken" ("userId");

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash"  TEXT UNIQUE NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken" ("userId");

CREATE TABLE IF NOT EXISTS "Category" (
  "id"   TEXT PRIMARY KEY,
  "name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Institution" (
  "id"         TEXT PRIMARY KEY,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id"),
  "name"       TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Institution_categoryId_active_idx" ON "Institution" ("categoryId", "active");

CREATE TABLE IF NOT EXISTS "Complaint" (
  "id"                  TEXT PRIMARY KEY,
  "publicId"            TEXT UNIQUE NOT NULL,
  "userId"              TEXT REFERENCES "User"("id"),
  "categoryId"          TEXT NOT NULL REFERENCES "Category"("id"),
  "institutionId"       TEXT REFERENCES "Institution"("id"),
  "institutionFreeText" TEXT,
  "title"               TEXT NOT NULL,
  "body"                TEXT NOT NULL,
  "urgent"              BOOLEAN NOT NULL DEFAULT FALSE,
  "contactName"         TEXT,
  "contactEmail"        TEXT,
  "status"              "ComplaintStatus" NOT NULL DEFAULT 'submitted',
  "submissionType"      "SubmissionType" NOT NULL,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reviewedById"        TEXT REFERENCES "User"("id"),
  "reviewedAt"          TIMESTAMPTZ,
  "forwardedAt"         TIMESTAMPTZ,
  "closedAt"            TIMESTAMPTZ,
  "ipAddress"           TEXT,
  "userAgent"           TEXT
);
CREATE INDEX IF NOT EXISTS "Complaint_userId_idx" ON "Complaint" ("userId");
CREATE INDEX IF NOT EXISTS "Complaint_categoryId_idx" ON "Complaint" ("categoryId");
CREATE INDEX IF NOT EXISTS "Complaint_institutionId_idx" ON "Complaint" ("institutionId");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint" ("status");
CREATE INDEX IF NOT EXISTS "Complaint_createdAt_idx" ON "Complaint" ("createdAt");
-- Full-text search index over title + body (replaces the Prisma raw migration).
CREATE INDEX IF NOT EXISTS "Complaint_fts_idx" ON "Complaint"
  USING GIN (to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("body",'')));

CREATE TABLE IF NOT EXISTS "Attachment" (
  "id"               TEXT PRIMARY KEY,
  "complaintId"      TEXT NOT NULL REFERENCES "Complaint"("id") ON DELETE CASCADE,
  "originalFilename" TEXT NOT NULL,
  "storagePath"      TEXT NOT NULL,
  "mimeType"         TEXT NOT NULL,
  "size"             INTEGER NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Attachment_complaintId_idx" ON "Attachment" ("complaintId");

CREATE TABLE IF NOT EXISTS "ComplaintEvent" (
  "id"          TEXT PRIMARY KEY,
  "complaintId" TEXT NOT NULL REFERENCES "Complaint"("id") ON DELETE CASCADE,
  "event"       "ComplaintEventType" NOT NULL,
  "actorId"     TEXT REFERENCES "User"("id"),
  "at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "metadata"    JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS "ComplaintEvent_complaintId_at_idx" ON "ComplaintEvent" ("complaintId", "at");

CREATE TABLE IF NOT EXISTS "EmailOutbox" (
  "id"                 TEXT PRIMARY KEY,
  "toAddress"          TEXT NOT NULL,
  "fromAddress"        TEXT NOT NULL,
  "subject"            TEXT NOT NULL,
  "bodyHtml"           TEXT NOT NULL,
  "bodyText"           TEXT NOT NULL,
  "template"           TEXT NOT NULL,
  "relatedComplaintId" TEXT REFERENCES "Complaint"("id"),
  "relatedUserId"      TEXT REFERENCES "User"("id"),
  "status"             "EmailOutboxStatus" NOT NULL DEFAULT 'pending',
  "attempts"           INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt"      TIMESTAMPTZ,
  "lastError"          TEXT,
  "nextAttemptAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "sentAt"             TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox" ("status", "nextAttemptAt");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"        TEXT PRIMARY KEY,
  "actorId"   TEXT REFERENCES "User"("id"),
  "event"     TEXT NOT NULL,
  "target"    TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "metadata"  JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS "AuditLog_at_idx" ON "AuditLog" ("at");
CREATE INDEX IF NOT EXISTS "AuditLog_event_idx" ON "AuditLog" ("event");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog" ("actorId");

CREATE TABLE IF NOT EXISTS "Configuration" (
  "key"       TEXT PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "OAuthExchangeCode" (
  "code"       TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "OAuthExchangeCode_expiresAt_idx" ON "OAuthExchangeCode" ("expiresAt");

COMMIT;

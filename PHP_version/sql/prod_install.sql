-- ===========================================================================
-- Thirstforlife Claims — PRODUCTION install script (MySQL / MariaDB)
-- ===========================================================================
-- Self-contained DDL + required reference seed. Idempotent: safe to re-run
-- (CREATE TABLE IF NOT EXISTS / INSERT ... ON DUPLICATE KEY / INSERT IGNORE).
-- Target: MySQL 8.0+ or MariaDB 10.4+. Engine InnoDB, charset utf8mb4.
--
-- HOW TO RUN
--   1) Create the database + user (see commented block) OR use the one your
--      host provisioned.
--   2) Run this file:
--        mysql -h HOST -u USER -p DBNAME < prod_install.sql
--   3) Point PHP_version/config/config.php at the same DB.
--
-- SECURITY: seeds an admin login with a DEFAULT password. Change it before or
-- immediately after go-live (see the "Admin user" section at the bottom).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- OPTIONAL: create database + user (run as an admin/root MySQL account).
-- ---------------------------------------------------------------------------
-- CREATE DATABASE `thirstforlife` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CREATE USER 'thirstforlife'@'%' IDENTIFIED BY 'CHANGE_ME_STRONG';
-- GRANT ALL PRIVILEGES ON `thirstforlife`.* TO 'thirstforlife'@'%';
-- FLUSH PRIVILEGES;
-- USE `thirstforlife`;
-- ---------------------------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
  `id`               VARCHAR(36)  NOT NULL,
  `email`            VARCHAR(255) NOT NULL,
  `emailVerified`    TINYINT(1)   NOT NULL DEFAULT 0,
  `name`             VARCHAR(255) NULL,
  `passwordHash`     VARCHAR(255) NULL,
  `role`             ENUM('admin','user') NOT NULL DEFAULT 'user',
  `status`           ENUM('draft','pending_confirmation','active','blocked','deactivated') NOT NULL DEFAULT 'pending_confirmation',
  `createdAt`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastLoginAt`      DATETIME     NULL,
  `anonymizedAt`     DATETIME     NULL,
  `failedLoginCount` INT          NOT NULL DEFAULT 0,
  `lockedUntil`      DATETIME     NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  KEY `User_role_idx` (`role`),
  KEY `User_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `OAuthIdentity` (
  `id`             VARCHAR(36)  NOT NULL,
  `userId`         VARCHAR(36)  NOT NULL,
  `provider`       ENUM('google','facebook') NOT NULL,
  `providerUserId` VARCHAR(255) NOT NULL,
  `createdAt`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `OAuthIdentity_provider_providerUserId_key` (`provider`,`providerUserId`),
  KEY `OAuthIdentity_userId_idx` (`userId`),
  CONSTRAINT `OAuthIdentity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Consent` (
  `id`         VARCHAR(36)  NOT NULL,
  `userId`     VARCHAR(36)  NOT NULL,
  `document`   ENUM('terms','privacy','marketing') NOT NULL,
  `version`    VARCHAR(20)  NOT NULL,
  `acceptedAt` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress`  VARCHAR(45)  NULL,
  `userAgent`  VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  KEY `Consent_userId_document_idx` (`userId`,`document`),
  CONSTRAINT `Consent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `RefreshToken` (
  `id`        VARCHAR(36)  NOT NULL,
  `userId`    VARCHAR(36)  NOT NULL,
  `tokenHash` VARCHAR(64)  NOT NULL,
  `issuedAt`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` DATETIME     NOT NULL,
  `revokedAt` DATETIME     NULL,
  `ipAddress` VARCHAR(45)  NOT NULL,
  `userAgent` VARCHAR(512) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `RefreshToken_userId_idx` (`userId`),
  KEY `RefreshToken_tokenHash_idx` (`tokenHash`),
  CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `EmailVerificationToken` (
  `id`         VARCHAR(36) NOT NULL,
  `userId`     VARCHAR(36) NOT NULL,
  `tokenHash`  VARCHAR(64) NOT NULL,
  `expiresAt`  DATETIME    NOT NULL,
  `consumedAt` DATETIME    NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `EmailVerificationToken_tokenHash_key` (`tokenHash`),
  KEY `EmailVerificationToken_userId_idx` (`userId`),
  CONSTRAINT `EmailVerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PasswordResetToken` (
  `id`         VARCHAR(36) NOT NULL,
  `userId`     VARCHAR(36) NOT NULL,
  `tokenHash`  VARCHAR(64) NOT NULL,
  `expiresAt`  DATETIME    NOT NULL,
  `consumedAt` DATETIME    NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PasswordResetToken_tokenHash_key` (`tokenHash`),
  KEY `PasswordResetToken_userId_idx` (`userId`),
  CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Category` (
  `id`   VARCHAR(64)  NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Institution` (
  `id`         VARCHAR(36)  NOT NULL,
  `categoryId` VARCHAR(64)  NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `Institution_categoryId_active_idx` (`categoryId`,`active`),
  CONSTRAINT `Institution_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Complaint` (
  `id`                  VARCHAR(36)  NOT NULL,
  `publicId`            VARCHAR(32)  NOT NULL,
  `userId`              VARCHAR(36)  NULL,
  `categoryId`          VARCHAR(64)  NOT NULL,
  `institutionId`       VARCHAR(36)  NULL,
  `institutionFreeText` VARCHAR(255) NULL,
  `title`               VARCHAR(255) NOT NULL,
  `body`                TEXT         NOT NULL,
  `urgent`              TINYINT(1)   NOT NULL DEFAULT 0,
  `contactName`         VARCHAR(255) NULL,
  `contactEmail`        VARCHAR(255) NULL,
  `status`              ENUM('submitted','pending_review','approved','rejected','forwarded','closed') NOT NULL DEFAULT 'submitted',
  `submissionType`      ENUM('authenticated','anonymous') NOT NULL,
  `createdAt`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedById`        VARCHAR(36)  NULL,
  `reviewedAt`          DATETIME     NULL,
  `forwardedAt`         DATETIME     NULL,
  `closedAt`            DATETIME     NULL,
  `ipAddress`           VARCHAR(45)  NULL,
  `userAgent`           VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Complaint_publicId_key` (`publicId`),
  KEY `Complaint_userId_idx` (`userId`),
  KEY `Complaint_categoryId_idx` (`categoryId`),
  KEY `Complaint_institutionId_idx` (`institutionId`),
  KEY `Complaint_status_idx` (`status`),
  KEY `Complaint_createdAt_idx` (`createdAt`),
  FULLTEXT KEY `Complaint_fts_idx` (`title`,`body`),
  CONSTRAINT `Complaint_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`),
  CONSTRAINT `Complaint_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`),
  CONSTRAINT `Complaint_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `Institution`(`id`),
  CONSTRAINT `Complaint_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Attachment` (
  `id`               VARCHAR(36)  NOT NULL,
  `complaintId`      VARCHAR(36)  NOT NULL,
  `originalFilename` VARCHAR(255) NOT NULL,
  `storagePath`      VARCHAR(512) NOT NULL,
  `mimeType`         VARCHAR(100) NOT NULL,
  `size`             INT          NOT NULL,
  `createdAt`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `Attachment_complaintId_idx` (`complaintId`),
  CONSTRAINT `Attachment_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ComplaintEvent` (
  `id`          VARCHAR(36) NOT NULL,
  `complaintId` VARCHAR(36) NOT NULL,
  `event`       ENUM('created','pending_review','approved','rejected','forwarded','closed','email_dispatched','email_failed','attachment_added') NOT NULL,
  `actorId`     VARCHAR(36) NULL,
  `at`          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata`    JSON        NULL,
  PRIMARY KEY (`id`),
  KEY `ComplaintEvent_complaintId_at_idx` (`complaintId`,`at`),
  CONSTRAINT `ComplaintEvent_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE CASCADE,
  CONSTRAINT `ComplaintEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `EmailOutbox` (
  `id`                 VARCHAR(36)  NOT NULL,
  `toAddress`          VARCHAR(255) NOT NULL,
  `fromAddress`        VARCHAR(255) NOT NULL,
  `subject`            VARCHAR(255) NOT NULL,
  `bodyHtml`           LONGTEXT     NOT NULL,
  `bodyText`           LONGTEXT     NOT NULL,
  `template`           VARCHAR(100) NOT NULL,
  `relatedComplaintId` VARCHAR(36)  NULL,
  `relatedUserId`      VARCHAR(36)  NULL,
  `status`             ENUM('pending','sent','failed','dead') NOT NULL DEFAULT 'pending',
  `attempts`           INT          NOT NULL DEFAULT 0,
  `lastAttemptAt`      DATETIME     NULL,
  `lastError`          TEXT         NULL,
  `nextAttemptAt`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sentAt`             DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `EmailOutbox_status_nextAttemptAt_idx` (`status`,`nextAttemptAt`),
  CONSTRAINT `EmailOutbox_relatedComplaintId_fkey` FOREIGN KEY (`relatedComplaintId`) REFERENCES `Complaint`(`id`),
  CONSTRAINT `EmailOutbox_relatedUserId_fkey` FOREIGN KEY (`relatedUserId`) REFERENCES `User`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AuditLog` (
  `id`        VARCHAR(36)  NOT NULL,
  `actorId`   VARCHAR(36)  NULL,
  `event`     VARCHAR(100) NOT NULL,
  `target`    VARCHAR(255) NULL,
  `ipAddress` VARCHAR(45)  NULL,
  `userAgent` VARCHAR(512) NULL,
  `at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata`  JSON         NULL,
  PRIMARY KEY (`id`),
  KEY `AuditLog_at_idx` (`at`),
  KEY `AuditLog_event_idx` (`event`),
  KEY `AuditLog_actorId_idx` (`actorId`),
  CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Configuration` (
  `key`       VARCHAR(191) NOT NULL,
  `value`     TEXT         NOT NULL,
  `updatedAt` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `OAuthExchangeCode` (
  `code`       VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(36)  NOT NULL,
  `createdAt`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt`  DATETIME     NOT NULL,
  `consumedAt` DATETIME     NULL,
  PRIMARY KEY (`code`),
  KEY `OAuthExchangeCode_expiresAt_idx` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Required reference seed
-- ---------------------------------------------------------------------------
-- Categories referenced by the app (ids are stable keys, do not rename).
INSERT INTO `Category` (`id`,`name`) VALUES
  ('hospitals',       'Hospitals'),
  ('doctors',         'Doctors'),
  ('insurance_funds', 'Health Insurance Funds')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Runtime configuration (kept for parity; the app primarily reads config.php).
INSERT IGNORE INTO `Configuration` (`key`,`value`,`updatedAt`) VALUES
  ('min_body_length',            '100',                   NOW()),
  ('captcha_required_anonymous', 'true',                  NOW()),
  ('ombudsman_email',            'ombudsman@example.org', NOW());

-- ---------------------------------------------------------------------------
-- Admin user
-- ---------------------------------------------------------------------------
-- Password below hashes the DEFAULT password 'ChangeMe!Now1' (Argon2id).
-- >>> CHANGE THIS before or right after go-live. <<<
-- Generate your own hash with PHP and replace the value:
--   php -r "echo password_hash('YOUR_STRONG_PASSWORD', PASSWORD_ARGON2ID,
--           ['memory_cost'=>19456,'time_cost'=>2,'threads'=>1]);"
-- and change the email to your real admin address.
INSERT IGNORE INTO `User`
  (`id`,`email`,`name`,`passwordHash`,`role`,`status`,`emailVerified`,`createdAt`,`updatedAt`)
VALUES (
  UUID(),
  'admin@thirstforlife.local',
  'Admin',
  '$argon2id$v=19$m=19456,t=2,p=1$YU1GazZHUGMvcHRpLy5meQ$cEcY3yLY/PuNQYwcj4QRhDt7ZZTIbcnzupElOtikvdU',
  'admin',
  'active',
  1,
  NOW(), NOW()
);

-- ---------------------------------------------------------------------------
-- OPTIONAL: demo institutions (add your real institutions via the admin panel
-- instead). Uncomment to insert one example.
-- ---------------------------------------------------------------------------
-- INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`)
--   VALUES (UUID(), 'hospitals', 'City Hospital', 'city.hospital@example.org', 1, NOW(), NOW());

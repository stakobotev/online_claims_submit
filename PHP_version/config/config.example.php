<?php
/**
 * Thirstforlife Claims — PHP edition configuration.
 *
 * Copy this file to config/config.php and adjust for your environment.
 * On restricted/shared PHP hosting you normally cannot set OS env vars, so the
 * values below are the source of truth. Where an env var IS available it wins
 * (via env() in bootstrap), otherwise these defaults are used.
 *
 * Mirrors backend/src/config/index.ts from the original Node application.
 */

return [
    // --- Runtime ---
    'APP_ENV'             => 'development',           // development | production
    'PUBLIC_BASE_URL'     => 'http://localhost:8080', // public URL of THIS php app (no trailing slash)

    // --- Database (PostgreSQL) ---
    // The original app targets PostgreSQL. Keep the same DB/schema.
    'DB_HOST'             => 'localhost',
    'DB_PORT'             => '5433',
    'DB_NAME'             => 'vallentin',
    'DB_USER'             => 'vallentin',
    'DB_PASSWORD'         => 'vallentin',
    'DB_SCHEMA'           => 'public',

    // --- Password hashing (Argon2id) ---
    // PHP's PASSWORD_ARGON2ID uses KiB for memory, matching argon2 in Node.
    'ARGON2_MEMORY_COST'  => 19456, // KiB
    'ARGON2_TIME_COST'    => 2,
    'ARGON2_PARALLELISM'  => 1,

    // --- Sessions (replaces JWT for a server-rendered app) ---
    'SESSION_NAME'        => 'vlc_session',
    'SESSION_LIFETIME'    => 60 * 60 * 24 * 7, // 7 days, matches refresh TTL
    'SESSION_SECURE'      => false,            // set true behind HTTPS in production

    // --- Login lockout ---
    'MAX_FAILED_LOGINS'   => 5,
    'LOCKOUT_MINUTES'     => 15,

    // --- Google OAuth ---
    'GOOGLE_CLIENT_ID'     => '',
    'GOOGLE_CLIENT_SECRET' => '',
    // Must exactly match an Authorized redirect URI in Google Cloud console:
    'GOOGLE_REDIRECT_URL'  => 'http://localhost:8080/auth/oauth/google/callback',

    // --- hCaptcha ---
    'HCAPTCHA_SITE_KEY'   => '10000000-ffff-ffff-ffff-000000000001',
    'HCAPTCHA_SECRET'     => '0x0000000000000000000000000000000000000000',
    'CAPTCHA_REQUIRED_ANONYMOUS' => true,

    // --- SMTP (synchronous send per request) ---
    'SMTP_HOST'           => 'localhost',
    'SMTP_PORT'           => 1025,      // MailHog default in dev
    'SMTP_USER'           => '',
    'SMTP_PASSWORD'       => '',
    'SMTP_SECURE'         => '',        // '' | 'tls' | 'ssl'
    'MAIL_FROM_EMAIL'     => 'no-reply@health.local',
    'MAIL_FROM_NAME'      => 'Thirstforlife Claims',

    // --- Ombudsman ---
    'OMBUDSMAN_EMAIL'     => 'ombudsman@example.org',

    // --- Admin seed ---
    'ADMIN_EMAIL'            => 'admin@health.local',
    'ADMIN_INITIAL_PASSWORD' => 'ChangeMe!Now1',
    'SEED_DEMO_DATA'         => true,

    // --- Uploads ---
    // Store OUTSIDE the web root. Ensure it is writable by PHP.
    'UPLOAD_DIR'          => __DIR__ . '/../storage/uploads',
    'MAX_ATTACHMENTS'     => 3,
    'MAX_ATTACHMENT_TOTAL_BYTES' => 5242880, // 5 MB
    'MAX_ATTACHMENT_FILE_BYTES'  => 5242880, // 5 MB
    'ALLOWED_ATTACHMENT_MIME' => [
        'application/pdf',
        'image/bmp',
        'image/jpeg',
        'image/png',
        'image/tiff',
    ],

    // --- Business rules ---
    'MIN_BODY_LENGTH'     => 100,

    // --- i18n ---
    'DEFAULT_LOCALE'      => 'en',
    'LOCALES'             => ['en', 'bg'],
];

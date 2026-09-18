<?php
declare(strict_types=1);

namespace App;

/**
 * Authentication + session management. Server-rendered equivalent of the SPA's
 * JWT flow: the logged-in user is kept in $_SESSION. Password hashing is
 * Argon2id via PHP's native password_* (same algorithm as the Node app).
 *
 * Consolidates the logic of backend/src/modules/auth/auth.service.ts:
 * register, verify email, login (with lockout), forgot/reset password, and
 * OAuth account linking.
 */
final class Auth
{
    // ---- Session -----------------------------------------------------------
    public static function user(): ?array
    {
        return $_SESSION['_user'] ?? null;
    }

    public static function id(): ?string
    {
        return $_SESSION['_user']['id'] ?? null;
    }

    public static function check(): bool
    {
        return isset($_SESSION['_user']);
    }

    public static function isAdmin(): bool
    {
        return (($_SESSION['_user']['role'] ?? null) === 'admin');
    }

    public static function login(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION['_user'] = [
            'id'     => $user['id'],
            'email'  => $user['email'],
            'name'   => $user['name'] ?? null,
            'role'   => $user['role'],
            'status' => $user['status'],
        ];
    }

    public static function logout(): void
    {
        unset($_SESSION['_user']);
        session_regenerate_id(true);
    }

    /** Guard: require an authenticated user or redirect to login. */
    public static function requireAuth(): array
    {
        $user = self::user();
        if (!$user) {
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
            redirect('/auth/login?from=' . rawurlencode($path));
        }
        return $user;
    }

    /** Guard: require an admin, else 403. */
    public static function requireAdmin(): array
    {
        $user = self::requireAuth();
        if (($user['role'] ?? '') !== 'admin') {
            http_response_code(403);
            view('errors/403', [], 'app');
            exit;
        }
        return $user;
    }

    // ---- Password hashing --------------------------------------------------
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => (int) cfg('ARGON2_MEMORY_COST', 19456),
            'time_cost'   => (int) cfg('ARGON2_TIME_COST', 2),
            'threads'     => (int) cfg('ARGON2_PARALLELISM', 1),
        ]);
    }

    // ---- Registration ------------------------------------------------------
    /**
     * @return array{ok:bool,error?:string}
     */
    public static function register(string $email, string $name, string $password, bool $marketing): array
    {
        $email = strtolower(trim($email));
        $existing = Database::one('SELECT "id" FROM "User" WHERE "email" = :e', ['e' => $email]);
        if ($existing) {
            return ['ok' => false, 'error' => 'emailInUse'];
        }

        $userId = Ids::uuid();
        Database::transaction(function () use ($userId, $email, $name, $password, $marketing) {
            Database::run(
                'INSERT INTO "User" ("id","email","name","passwordHash","role","status","emailVerified","createdAt","updatedAt")
                 VALUES (:id,:email,:name,:hash,\'user\',\'pending_confirmation\',FALSE,now(),now())',
                ['id' => $userId, 'email' => $email, 'name' => $name, 'hash' => self::hashPassword($password)],
            );

            // Consents (terms + privacy always, marketing optional). Version 1.0.
            $docs = ['terms', 'privacy'];
            if ($marketing) {
                $docs[] = 'marketing';
            }
            foreach ($docs as $doc) {
                Database::run(
                    'INSERT INTO "Consent" ("id","userId","document","version","acceptedAt","ipAddress","userAgent")
                     VALUES (:id,:uid,:doc,\'1.0\',now(),:ip,:ua)',
                    ['id' => Ids::uuid(), 'uid' => $userId, 'doc' => $doc, 'ip' => client_ip(), 'ua' => user_agent()],
                );
            }
        });

        self::issueVerification($userId, $email, $name);
        Audit::log('auth.register', $userId, "user:{$userId}");
        return ['ok' => true];
    }

    private static function issueVerification(string $userId, string $email, ?string $name): void
    {
        $raw = Ids::randomToken(32);
        $hash = Ids::hashToken($raw);
        $expires = (new \DateTime('+24 hours'))->format('c');
        Database::run(
            'INSERT INTO "EmailVerificationToken" ("id","userId","tokenHash","expiresAt")
             VALUES (:id,:uid,:hash,:exp)',
            ['id' => Ids::uuid(), 'uid' => $userId, 'hash' => $hash, 'exp' => $expires],
        );
        Mailer::send(
            'auth.verify_email',
            $email,
            'Verify your email — Thirstforlife Claims',
            ['name' => $name ?: '', 'verifyUrl' => url('/auth/verify-email?token=' . $raw)],
            null,
            $userId,
        );
    }

    public static function verifyEmail(string $rawToken): bool
    {
        $hash = Ids::hashToken($rawToken);
        $row = Database::one(
            'SELECT * FROM "EmailVerificationToken" WHERE "tokenHash" = :h',
            ['h' => $hash],
        );
        if (!$row || $row['consumedAt'] !== null || new \DateTime($row['expiresAt']) < new \DateTime()) {
            return false;
        }
        Database::transaction(function () use ($row) {
            Database::run('UPDATE "EmailVerificationToken" SET "consumedAt" = now() WHERE "id" = :id', ['id' => $row['id']]);
            Database::run(
                'UPDATE "User" SET "emailVerified" = TRUE, "status" = \'active\', "updatedAt" = now() WHERE "id" = :id',
                ['id' => $row['userId']],
            );
        });
        Audit::log('auth.email_verified', $row['userId'], "user:{$row['userId']}");
        return true;
    }

    public static function resendVerification(string $email): void
    {
        $user = Database::one('SELECT * FROM "User" WHERE "email" = :e', ['e' => strtolower(trim($email))]);
        // Do not reveal existence; only send if unverified.
        if ($user && !pgbool($user['emailVerified'])) {
            self::issueVerification($user['id'], $user['email'], $user['name']);
        }
    }

    // ---- Login (with lockout) ---------------------------------------------
    /**
     * @return array{ok:bool,user?:array,error?:string}
     */
    public static function attemptLogin(string $email, string $password): array
    {
        $email = strtolower(trim($email));
        $user = Database::one('SELECT * FROM "User" WHERE "email" = :e', ['e' => $email]);
        $maxFailed = (int) cfg('MAX_FAILED_LOGINS', 5);
        $lockMin   = (int) cfg('LOCKOUT_MINUTES', 15);

        if (!$user || !$user['passwordHash']) {
            Audit::log('auth.login.failed', null, "email:{$email}");
            return ['ok' => false, 'error' => 'invalidCredentials'];
        }

        if ($user['lockedUntil'] !== null && new \DateTime($user['lockedUntil']) > new \DateTime()) {
            Audit::log('auth.login.locked', $user['id'], "user:{$user['id']}");
            return ['ok' => false, 'error' => 'invalidCredentials'];
        }

        if (!password_verify($password, $user['passwordHash'])) {
            $failed = (int) $user['failedLoginCount'] + 1;
            $lockedUntil = null;
            if ($failed >= $maxFailed) {
                $lockedUntil = (new \DateTime("+{$lockMin} minutes"))->format('c');
                $failed = 0;
            }
            Database::run(
                'UPDATE "User" SET "failedLoginCount" = :f, "lockedUntil" = :l, "updatedAt" = now() WHERE "id" = :id',
                ['f' => $failed, 'l' => $lockedUntil, 'id' => $user['id']],
            );
            Audit::log('auth.login.failed', $user['id'], "user:{$user['id']}");
            return ['ok' => false, 'error' => 'invalidCredentials'];
        }

        if ($user['status'] === 'blocked' || $user['status'] === 'deactivated') {
            return ['ok' => false, 'error' => 'invalidCredentials'];
        }

        // Success: reset counters, stamp login.
        Database::run(
            'UPDATE "User" SET "failedLoginCount" = 0, "lockedUntil" = NULL, "lastLoginAt" = now(), "updatedAt" = now() WHERE "id" = :id',
            ['id' => $user['id']],
        );
        Audit::log('auth.login.succeeded', $user['id'], "user:{$user['id']}");
        return ['ok' => true, 'user' => $user];
    }

    // ---- Forgot / reset password ------------------------------------------
    public static function forgotPassword(string $email): void
    {
        $user = Database::one('SELECT * FROM "User" WHERE "email" = :e', ['e' => strtolower(trim($email))]);
        if (!$user) {
            return; // no user enumeration
        }
        $raw = Ids::randomToken(32);
        $hash = Ids::hashToken($raw);
        $expires = (new \DateTime('+1 hour'))->format('c');
        Database::run(
            'INSERT INTO "PasswordResetToken" ("id","userId","tokenHash","expiresAt") VALUES (:id,:uid,:h,:exp)',
            ['id' => Ids::uuid(), 'uid' => $user['id'], 'h' => $hash, 'exp' => $expires],
        );
        Mailer::send(
            'auth.password_reset',
            $user['email'],
            'Reset your password — Thirstforlife Claims',
            ['name' => $user['name'] ?: '', 'resetUrl' => url('/auth/reset-password?token=' . $raw)],
            null,
            $user['id'],
        );
        Audit::log('auth.password_reset_requested', $user['id'], "user:{$user['id']}");
    }

    public static function resetPassword(string $rawToken, string $password): bool
    {
        $hash = Ids::hashToken($rawToken);
        $row = Database::one('SELECT * FROM "PasswordResetToken" WHERE "tokenHash" = :h', ['h' => $hash]);
        if (!$row || $row['consumedAt'] !== null || new \DateTime($row['expiresAt']) < new \DateTime()) {
            return false;
        }
        Database::transaction(function () use ($row, $password) {
            Database::run('UPDATE "PasswordResetToken" SET "consumedAt" = now() WHERE "id" = :id', ['id' => $row['id']]);
            Database::run(
                'UPDATE "User" SET "passwordHash" = :h, "failedLoginCount" = 0, "lockedUntil" = NULL, "updatedAt" = now() WHERE "id" = :id',
                ['h' => self::hashPassword($password), 'id' => $row['userId']],
            );
            // Revoke any refresh tokens (parity with original; sessions are separate).
            Database::run('UPDATE "RefreshToken" SET "revokedAt" = now() WHERE "userId" = :uid AND "revokedAt" IS NULL', ['uid' => $row['userId']]);
        });
        Audit::log('auth.password_reset', $row['userId'], "user:{$row['userId']}");
        return true;
    }

    // ---- OAuth linking -----------------------------------------------------
    /**
     * Find or create a user for a verified Google profile. Mirrors
     * findOrCreateOAuthUser in the Node service.
     * @return array{ok:bool,user?:array,error?:string}
     */
    public static function findOrCreateOAuthUser(string $provider, array $profile): array
    {
        $identity = Database::one(
            'SELECT * FROM "OAuthIdentity" WHERE "provider" = :p AND "providerUserId" = :pid',
            ['p' => $provider, 'pid' => $profile['sub']],
        );
        if ($identity) {
            $user = Database::one('SELECT * FROM "User" WHERE "id" = :id', ['id' => $identity['userId']]);
            return $user ? ['ok' => true, 'user' => $user] : ['ok' => false, 'error' => 'oauthError'];
        }

        $email = strtolower($profile['email']);
        $existing = Database::one('SELECT * FROM "User" WHERE "email" = :e', ['e' => $email]);

        if ($existing) {
            // Only link when the existing account is verified (avoids takeover).
            if (!pgbool($existing['emailVerified'])) {
                Audit::log('auth.oauth.link_blocked', $existing['id'], "user:{$existing['id']}");
                return ['ok' => false, 'error' => 'oauthError'];
            }
            self::linkIdentity($existing['id'], $provider, $profile['sub']);
            return ['ok' => true, 'user' => $existing];
        }

        // New account, considered verified via the provider.
        $userId = Ids::uuid();
        Database::transaction(function () use ($userId, $email, $profile, $provider) {
            Database::run(
                'INSERT INTO "User" ("id","email","name","role","status","emailVerified","createdAt","updatedAt")
                 VALUES (:id,:email,:name,\'user\',\'active\',TRUE,now(),now())',
                ['id' => $userId, 'email' => $email, 'name' => $profile['name']],
            );
            self::linkIdentity($userId, $provider, $profile['sub']);
        });
        $user = Database::one('SELECT * FROM "User" WHERE "id" = :id', ['id' => $userId]);
        Audit::log('auth.oauth.registered', $userId, "user:{$userId}");
        return ['ok' => true, 'user' => $user];
    }

    private static function linkIdentity(string $userId, string $provider, string $providerUserId): void
    {
        Database::run(
            'INSERT INTO "OAuthIdentity" ("id","userId","provider","providerUserId","createdAt")
             VALUES (:id,:uid,:p,:pid,now()) ON CONFLICT ("provider","providerUserId") DO NOTHING',
            ['id' => Ids::uuid(), 'uid' => $userId, 'p' => $provider, 'pid' => $providerUserId],
        );
    }
}

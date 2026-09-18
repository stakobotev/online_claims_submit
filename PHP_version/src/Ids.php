<?php
declare(strict_types=1);

namespace App;

/**
 * ID + token utilities. Mirrors backend/src/lib/ids.ts:
 *  - uuid()            : RFC-4122 v4 (Prisma @default(uuid))
 *  - randomToken()     : hex token for email/verification links
 *  - hashToken()       : sha256 hex (tokens stored hashed at rest)
 *  - generatePublicId(): atomic per-year counter -> TFL-YYYY-NNNNNN
 *                        (existing VLC- ids from before the rename are kept)
 */
final class Ids
{
    public static function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function randomToken(int $bytes = 32): string
    {
        return bin2hex(random_bytes($bytes));
    }

    public static function hashToken(string $raw): string
    {
        return hash('sha256', $raw);
    }

    /**
     * Atomic per-year counter -> TFL-YYYY-NNNNNN.
     * MySQL implementation: ensure the counter row exists, then increment it
     * inside a single UPDATE using LAST_INSERT_ID() so the new value is read
     * back atomically per connection (concurrency-safe via InnoDB row locking).
     */
    public static function generatePublicId(int $year): string
    {
        $key = "complaint_counter_{$year}";

        // Ensure the row exists (starting at 0); no-op if it already does.
        Database::run(
            'INSERT INTO "Configuration" ("key", "value", "updatedAt")
             VALUES (:k, \'0\', now())
             ON DUPLICATE KEY UPDATE "key" = "key"',
            ['k' => $key],
        );

        // Atomically increment and capture the new value via LAST_INSERT_ID().
        Database::run(
            'UPDATE "Configuration"
                SET "value" = LAST_INSERT_ID(CAST("value" AS UNSIGNED) + 1),
                    "updatedAt" = now()
              WHERE "key" = :k',
            ['k' => $key],
        );

        $counter = (int) Database::scalar('SELECT LAST_INSERT_ID()');
        return sprintf('TFL-%d-%06d', $year, $counter);
    }
}

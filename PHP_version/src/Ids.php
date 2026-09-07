<?php
declare(strict_types=1);

namespace App;

/**
 * ID + token utilities. Mirrors backend/src/lib/ids.ts:
 *  - uuid()            : RFC-4122 v4 (Prisma @default(uuid))
 *  - randomToken()     : hex token for email/verification links
 *  - hashToken()       : sha256 hex (tokens stored hashed at rest)
 *  - generatePublicId(): atomic per-year counter -> VLC-YYYY-NNNNNN
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

    /** Atomic UPSERT counter, identical logic to the Node implementation. */
    public static function generatePublicId(int $year): string
    {
        $key = "complaint_counter_{$year}";
        $row = Database::one(
            'INSERT INTO "Configuration" ("key", "value", "updatedAt")
             VALUES (:k, \'1\', now())
             ON CONFLICT ("key") DO UPDATE
               SET "value" = (CAST("Configuration"."value" AS bigint) + 1)::text,
                   "updatedAt" = now()
             RETURNING "value"',
            ['k' => $key],
        );
        $counter = (int) ($row['value'] ?? 1);
        return sprintf('VLC-%d-%06d', $year, $counter);
    }
}

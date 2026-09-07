<?php
declare(strict_types=1);

namespace App;

/**
 * Append-only audit log. Mirrors backend/src/modules/auditLog.
 */
final class Audit
{
    public static function log(
        string $event,
        ?string $actorId = null,
        ?string $target = null,
        array $metadata = [],
        ?string $ipAddress = null,
        ?string $userAgent = null,
    ): void {
        Database::run(
            'INSERT INTO "AuditLog" ("id","actorId","event","target","ipAddress","userAgent","at","metadata")
             VALUES (:id,:actorId,:event,:target,:ip,:ua,now(),:meta)',
            [
                'id'      => Ids::uuid(),
                'actorId' => $actorId,
                'event'   => $event,
                'target'  => $target,
                'ip'      => $ipAddress ?? client_ip(),
                'ua'      => $userAgent ?? user_agent(),
                'meta'    => json_encode($metadata, JSON_UNESCAPED_UNICODE) ?: '{}',
            ],
        );
    }
}

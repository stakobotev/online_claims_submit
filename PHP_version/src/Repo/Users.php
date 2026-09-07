<?php
declare(strict_types=1);

namespace App\Repo;

use App\Database;
use App\Ids;
use App\Audit;

final class Users
{
    public static function paginate(int $page, int $size, ?string $q, ?string $role, ?string $status): array
    {
        $where = [];
        $params = [];
        if ($q) {
            $where[] = '("email" ILIKE :q OR "name" ILIKE :q)';
            $params['q'] = '%' . $q . '%';
        }
        if ($role) {
            $where[] = '"role" = :role';
            $params['role'] = $role;
        }
        if ($status) {
            $where[] = '"status" = :status';
            $params['status'] = $status;
        }
        $clause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $total = (int) Database::scalar("SELECT COUNT(*) FROM \"User\" {$clause}", $params);
        $rows = Database::all(
            "SELECT \"id\",\"email\",\"name\",\"role\",\"status\",\"createdAt\",\"lastLoginAt\",\"anonymizedAt\"
               FROM \"User\" {$clause} ORDER BY \"createdAt\" DESC LIMIT :limit OFFSET :offset",
            array_merge($params, ['limit' => $size, 'offset' => ($page - 1) * $size]),
        );
        return ['data' => $rows, 'total' => $total, 'page' => $page, 'size' => $size, 'pages' => (int) ceil($total / $size)];
    }

    public static function find(string $id): ?array
    {
        return Database::one('SELECT * FROM "User" WHERE "id" = :id', ['id' => $id]);
    }

    public static function update(string $id, ?string $role, ?string $status, string $actorId): void
    {
        if ($role !== null) {
            Database::run('UPDATE "User" SET "role"=:r,"updatedAt"=now() WHERE "id"=:id', ['r' => $role, 'id' => $id]);
            Audit::log('admin.user.role_updated', $actorId, "user:{$id}", ['newRole' => $role]);
        }
        if ($status !== null) {
            Database::run('UPDATE "User" SET "status"=:s,"updatedAt"=now() WHERE "id"=:id', ['s' => $status, 'id' => $id]);
            Audit::log('admin.user.status_updated', $actorId, "user:{$id}", ['newStatus' => $status]);
        }
    }

    /** GDPR right-to-be-forgotten. Mirrors anonymizeUser in the Node service. */
    public static function anonymize(string $id, string $actorId): array
    {
        $user = self::find($id);
        if (!$user) {
            return ['ok' => false, 'error' => 'not_found'];
        }
        if ($user['anonymizedAt'] !== null) {
            return ['ok' => false, 'error' => 'already'];
        }
        $anon = Ids::uuid();
        Database::transaction(function () use ($id, $anon) {
            Database::run(
                'UPDATE "User" SET "email"=:email,"name"=\'Deleted User\',"passwordHash"=NULL,
                    "anonymizedAt"=now(),"status"=\'deactivated\',"updatedAt"=now() WHERE "id"=:id',
                ['email' => "deleted-{$anon}@anonymized.invalid", 'id' => $id],
            );
            Database::run('UPDATE "RefreshToken" SET "revokedAt"=now() WHERE "userId"=:id AND "revokedAt" IS NULL', ['id' => $id]);
            Database::run('UPDATE "EmailVerificationToken" SET "consumedAt"=now() WHERE "userId"=:id AND "consumedAt" IS NULL', ['id' => $id]);
            Database::run('UPDATE "PasswordResetToken" SET "consumedAt"=now() WHERE "userId"=:id AND "consumedAt" IS NULL', ['id' => $id]);
            Database::run('UPDATE "Complaint" SET "ipAddress"=NULL,"userAgent"=NULL,"contactName"=NULL,"contactEmail"=NULL WHERE "userId"=:id', ['id' => $id]);
            Database::run('UPDATE "Consent" SET "ipAddress"=NULL,"userAgent"=NULL WHERE "userId"=:id', ['id' => $id]);
        });
        Audit::log('admin.user.anonymized', $actorId, "user:{$id}");
        return ['ok' => true];
    }

    /** GDPR data export. Returns a JSON-serialisable array. */
    public static function exportData(string $id, string $actorId): ?array
    {
        $user = Database::one(
            'SELECT "id","email","name","role","status","emailVerified","createdAt","updatedAt","lastLoginAt","anonymizedAt"
               FROM "User" WHERE "id" = :id',
            ['id' => $id],
        );
        if (!$user) {
            return null;
        }
        $consents = Database::all(
            'SELECT "document","version","acceptedAt","ipAddress","userAgent" FROM "Consent" WHERE "userId"=:id ORDER BY "acceptedAt"',
            ['id' => $id],
        );
        $complaints = Database::all('SELECT * FROM "Complaint" WHERE "userId"=:id ORDER BY "createdAt"', ['id' => $id]);
        $oauth = Database::all('SELECT "provider","providerUserId","createdAt" FROM "OAuthIdentity" WHERE "userId"=:id', ['id' => $id]);
        $auditLogs = Database::all('SELECT "event","target","at","ipAddress","userAgent","metadata" FROM "AuditLog" WHERE "actorId"=:id ORDER BY "at"', ['id' => $id]);

        Audit::log('admin.user.exported', $actorId, "user:{$id}", ['complaints' => count($complaints), 'consents' => count($consents)]);

        return [
            'exportedAt'      => (new \DateTime())->format('c'),
            'user'            => $user,
            'consents'        => $consents,
            'oauthIdentities' => $oauth,
            'complaints'      => $complaints,
            'auditLogs'       => $auditLogs,
        ];
    }
}

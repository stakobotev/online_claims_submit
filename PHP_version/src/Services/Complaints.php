<?php
declare(strict_types=1);

namespace App\Services;

use App\Database;
use App\Ids;
use App\Audit;
use App\Mailer;

/**
 * Complaint lifecycle. Faithful port of
 * backend/src/modules/complaints/complaints.service.ts:
 *   submit -> (anonymous) pending_review + admin email
 *          -> (authenticated) forwarded immediately
 *   approve -> forwarded ; reject -> rejected ; close -> closed
 */
final class Complaints
{
    /**
     * @param array $input keys: categoryId, institutionId?, institutionFreeText?,
     *                     title, body, urgent(bool), contactName?, contactEmail?
     * @param array $files list of [originalFilename, storagePath, mimeType, size]
     * @return array{publicId:string,status:string}
     */
    public static function submit(array $input, array $files, ?string $userId, ?string $ip, ?string $ua): array
    {
        $year = (int) date('Y');
        $publicId = Ids::generatePublicId($year);
        $isAnonymous = $userId === null;
        $status = $isAnonymous ? 'pending_review' : 'submitted';
        $complaintId = Ids::uuid();

        Database::transaction(function () use ($complaintId, $publicId, $input, $files, $userId, $ip, $ua, $status, $isAnonymous) {
            Database::run(
                'INSERT INTO "Complaint"
                    ("id","publicId","userId","categoryId","institutionId","institutionFreeText",
                     "title","body","urgent","contactName","contactEmail","status","submissionType",
                     "createdAt","updatedAt","ipAddress","userAgent")
                 VALUES
                    (:id,:publicId,:userId,:categoryId,:institutionId,:freeText,
                     :title,:body,:urgent,:contactName,:contactEmail,:status,:subType,
                     now(),now(),:ip,:ua)',
                [
                    'id' => $complaintId, 'publicId' => $publicId, 'userId' => $userId,
                    'categoryId' => $input['categoryId'],
                    'institutionId' => $input['institutionId'] ?: null,
                    'freeText' => $input['institutionFreeText'] ?: null,
                    'title' => $input['title'], 'body' => $input['body'],
                    // PDO binds PHP false as '' which Postgres rejects for bool;
                    // pass an explicit 'true'/'false' text literal instead.
                    'urgent' => !empty($input['urgent']) ? 'true' : 'false',
                    'contactName' => $input['contactName'] ?: null,
                    'contactEmail' => $input['contactEmail'] ?: null,
                    'status' => $status,
                    'subType' => $isAnonymous ? 'anonymous' : 'authenticated',
                    'ip' => $ip, 'ua' => $ua,
                ],
            );

            foreach ($files as $f) {
                Database::run(
                    'INSERT INTO "Attachment" ("id","complaintId","originalFilename","storagePath","mimeType","size","createdAt")
                     VALUES (:id,:cid,:name,:path,:mime,:size,now())',
                    [
                        'id' => Ids::uuid(), 'cid' => $complaintId,
                        'name' => $f['originalFilename'], 'path' => $f['storagePath'],
                        'mime' => $f['mimeType'], 'size' => $f['size'],
                    ],
                );
            }

            self::event($complaintId, 'created', $userId, ['status' => $status]);
            if ($isAnonymous) {
                self::event($complaintId, 'pending_review', null, []);
            }
            if ($files) {
                self::event($complaintId, 'attachment_added', $userId, ['count' => count($files)]);
            }
        });

        if ($isAnonymous) {
            $c = self::rawWithRefs($complaintId);
            Mailer::send(
                'admin.new_anonymous_complaint',
                (string) cfg('OMBUDSMAN_EMAIL', ''),
                "[Vallentin Claims] New anonymous complaint {$publicId} requires review",
                [
                    'publicId' => $publicId,
                    'categoryName' => $c['categoryName'],
                    'title' => $c['title'],
                    'submittedAt' => $c['createdAt'],
                    'adminUrl' => url('/admin/complaints/' . $publicId),
                ],
                $complaintId,
            );
        } else {
            self::forward($complaintId);
        }

        Audit::log('complaint.created', $userId, "complaint:{$publicId}", [
            'status' => $status,
            'submissionType' => $isAnonymous ? 'anonymous' : 'authenticated',
        ], $ip, $ua);

        return ['publicId' => $publicId, 'status' => $status];
    }

    /** Forward to institution (if email known) + ombudsman + user copy. */
    public static function forward(string $complaintId): void
    {
        $c = self::rawWithRefs($complaintId);
        if (!$c || in_array($c['status'], ['forwarded', 'closed'], true)) {
            return;
        }

        $institutionName = $c['institutionName'] ?: ($c['institutionFreeText'] ?: 'Unknown Institution');
        $institutionEmail = $c['institutionEmail'] ?: null;
        $emailData = [
            'publicId' => $c['publicId'],
            'categoryName' => $c['categoryName'],
            'institutionName' => $institutionName,
            'title' => $c['title'],
            'body' => $c['body'],
            'urgent' => pgbool($c['urgent']),
            'submittedAt' => $c['createdAt'],
        ];

        // Claim the transition atomically.
        $claimed = Database::run(
            'UPDATE "Complaint" SET "status"=\'forwarded\',"forwardedAt"=now(),"updatedAt"=now()
              WHERE "id"=:id AND "status" NOT IN (\'forwarded\',\'closed\')',
            ['id' => $complaintId],
        );
        if ($claimed === 0) {
            return;
        }

        if ($institutionEmail) {
            Mailer::send('complaint.to_institution', $institutionEmail,
                "[Vallentin Claims] Complaint {$c['publicId']} — {$c['title']}", $emailData, $complaintId);
            self::event($complaintId, 'email_dispatched', null, ['template' => 'complaint.to_institution', 'to' => $institutionEmail]);
        } else {
            self::event($complaintId, 'email_failed', null, [
                'template' => 'complaint.to_institution',
                'reason' => 'no_institution_email',
                'institutionFreeText' => $c['institutionFreeText'],
            ]);
        }

        // Ombudsman copy (always).
        $ombuds = (string) cfg('OMBUDSMAN_EMAIL', '');
        if ($ombuds !== '') {
            Mailer::send('complaint.to_ombudsman', $ombuds,
                "[Vallentin Claims] Complaint {$c['publicId']} forwarded", $emailData, $complaintId);
        }

        if ($c['contactEmail']) {
            Mailer::send('complaint.to_user_copy', $c['contactEmail'],
                "[Vallentin Claims] Your complaint {$c['publicId']} has been submitted", $emailData, $complaintId);
        }

        self::event($complaintId, 'forwarded', null, ['forwardedToInstitution' => (bool) $institutionEmail, 'forwardedToOmbudsman' => true]);
        Audit::log('complaint.state.changed', null, "complaint:{$c['publicId']}", ['status' => 'forwarded']);
    }

    /**
     * List complaints. Non-admins see only their own; admins may filter.
     */
    public static function listComplaints(array $opts): array
    {
        $where = [];
        $params = [];
        if (empty($opts['isAdmin'])) {
            $where[] = 'c."userId" = :uid';
            $params['uid'] = $opts['userId'];
        } else {
            if (!empty($opts['category']))     { $where[] = 'c."categoryId" = :cat'; $params['cat'] = $opts['category']; }
            if (!empty($opts['institutionId'])){ $where[] = 'c."institutionId" = :inst'; $params['inst'] = $opts['institutionId']; }
            if (!empty($opts['status']))       { $where[] = 'c."status" = :status'; $params['status'] = $opts['status']; }
            if (!empty($opts['from']))         { $where[] = 'c."createdAt" >= :from'; $params['from'] = $opts['from']; }
            if (!empty($opts['to']))           { $where[] = 'c."createdAt" <= :to'; $params['to'] = $opts['to']; }
            if (isset($opts['urgent']) && $opts['urgent'] !== null) { $where[] = 'c."urgent" = :urgent::boolean'; $params['urgent'] = $opts['urgent'] ? 'true' : 'false'; }
            if (!empty($opts['q']))            { $where[] = '(c."title" ILIKE :q OR c."body" ILIKE :q)'; $params['q'] = '%' . $opts['q'] . '%'; }
        }
        $clause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $page = max(1, (int) $opts['page']);
        $size = max(1, (int) $opts['size']);

        $total = (int) Database::scalar("SELECT COUNT(*) FROM \"Complaint\" c {$clause}", $params);
        $rows = Database::all(
            "SELECT c.*, cat.\"name\" AS \"categoryName\", i.\"name\" AS \"institutionName\"
               FROM \"Complaint\" c
               JOIN \"Category\" cat ON cat.\"id\" = c.\"categoryId\"
               LEFT JOIN \"Institution\" i ON i.\"id\" = c.\"institutionId\"
               {$clause}
              ORDER BY c.\"createdAt\" DESC
              LIMIT :limit OFFSET :offset",
            array_merge($params, ['limit' => $size, 'offset' => ($page - 1) * $size]),
        );
        return ['data' => $rows, 'total' => $total, 'page' => $page, 'size' => $size, 'pages' => (int) ceil($total / $size)];
    }

    /** Full complaint by public id with category/institution + attachments. */
    public static function getByPublicId(string $publicId, ?string $userId, bool $isAdmin): ?array
    {
        $c = Database::one(
            'SELECT c.*, cat."name" AS "categoryName", i."name" AS "institutionName"
               FROM "Complaint" c
               JOIN "Category" cat ON cat."id" = c."categoryId"
               LEFT JOIN "Institution" i ON i."id" = c."institutionId"
              WHERE c."publicId" = :pid',
            ['pid' => $publicId],
        );
        if (!$c) {
            return null;
        }
        if (!$isAdmin && $c['userId'] !== $userId) {
            return null; // 404 semantics — do not leak
        }
        $c['attachments'] = Database::all(
            'SELECT "id","originalFilename","mimeType","size" FROM "Attachment" WHERE "complaintId" = :id ORDER BY "createdAt"',
            ['id' => $c['id']],
        );
        return $c;
    }

    /** Lightweight lookup for public tracking (limited fields). */
    public static function trackByPublicId(string $publicId): ?array
    {
        return Database::one(
            'SELECT "publicId","title","status","submissionType","createdAt","reviewedAt","forwardedAt","closedAt","userId"
               FROM "Complaint" WHERE "publicId" = :pid',
            ['pid' => $publicId],
        );
    }

    public static function approve(string $publicId, string $adminId): array
    {
        $c = Database::one('SELECT * FROM "Complaint" WHERE "publicId" = :pid', ['pid' => $publicId]);
        if (!$c) return ['ok' => false, 'error' => 'not_found'];
        if ($c['status'] !== 'pending_review') return ['ok' => false, 'error' => 'invalid_state'];

        Database::transaction(function () use ($publicId, $adminId, $c) {
            Database::run('UPDATE "Complaint" SET "status"=\'approved\',"reviewedById"=:aid,"reviewedAt"=now(),"updatedAt"=now() WHERE "publicId"=:pid',
                ['aid' => $adminId, 'pid' => $publicId]);
            self::event($c['id'], 'approved', $adminId, []);
        });
        Audit::log('admin.complaint.approved', $adminId, "complaint:{$publicId}");
        self::forward($c['id']);
        return ['ok' => true];
    }

    public static function reject(string $publicId, string $adminId, string $reason): array
    {
        $c = Database::one('SELECT * FROM "Complaint" WHERE "publicId" = :pid', ['pid' => $publicId]);
        if (!$c) return ['ok' => false, 'error' => 'not_found'];
        if ($c['status'] !== 'pending_review') return ['ok' => false, 'error' => 'invalid_state'];

        Database::transaction(function () use ($publicId, $adminId, $reason, $c) {
            Database::run('UPDATE "Complaint" SET "status"=\'rejected\',"reviewedById"=:aid,"reviewedAt"=now(),"updatedAt"=now() WHERE "publicId"=:pid',
                ['aid' => $adminId, 'pid' => $publicId]);
            self::event($c['id'], 'rejected', $adminId, ['reason' => $reason]);
        });
        Audit::log('admin.complaint.rejected', $adminId, "complaint:{$publicId}", ['reason' => $reason]);
        return ['ok' => true];
    }

    public static function close(string $publicId, string $adminId): array
    {
        $c = Database::one('SELECT * FROM "Complaint" WHERE "publicId" = :pid', ['pid' => $publicId]);
        if (!$c) return ['ok' => false, 'error' => 'not_found'];
        if ($c['status'] !== 'forwarded') return ['ok' => false, 'error' => 'invalid_state'];

        Database::transaction(function () use ($publicId, $adminId, $c) {
            Database::run('UPDATE "Complaint" SET "status"=\'closed\',"closedAt"=now(),"updatedAt"=now() WHERE "publicId"=:pid', ['pid' => $publicId]);
            self::event($c['id'], 'closed', $adminId, []);
        });
        Audit::log('admin.complaint.closed', $adminId, "complaint:{$publicId}");
        return ['ok' => true];
    }

    public static function events(string $publicId): array
    {
        $c = Database::one('SELECT "id" FROM "Complaint" WHERE "publicId" = :pid', ['pid' => $publicId]);
        if (!$c) return [];
        return Database::all(
            'SELECT ev.*, u."email" AS "actorEmail", u."name" AS "actorName"
               FROM "ComplaintEvent" ev
               LEFT JOIN "User" u ON u."id" = ev."actorId"
              WHERE ev."complaintId" = :id ORDER BY ev."at" ASC',
            ['id' => $c['id']],
        );
    }

    // ---- helpers -----------------------------------------------------------
    private static function event(string $complaintId, string $type, ?string $actorId, array $metadata): void
    {
        Database::run(
            'INSERT INTO "ComplaintEvent" ("id","complaintId","event","actorId","at","metadata")
             VALUES (:id,:cid,:ev,:actor,now(),:meta)',
            [
                'id' => Ids::uuid(), 'cid' => $complaintId, 'ev' => $type,
                'actor' => $actorId, 'meta' => json_encode($metadata, JSON_UNESCAPED_UNICODE) ?: '{}',
            ],
        );
    }

    private static function rawWithRefs(string $complaintId): ?array
    {
        return Database::one(
            'SELECT c.*, cat."name" AS "categoryName", i."name" AS "institutionName", i."email" AS "institutionEmail"
               FROM "Complaint" c
               JOIN "Category" cat ON cat."id" = c."categoryId"
               LEFT JOIN "Institution" i ON i."id" = c."institutionId"
              WHERE c."id" = :id',
            ['id' => $complaintId],
        );
    }
}

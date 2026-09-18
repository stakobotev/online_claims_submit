<?php
declare(strict_types=1);

namespace App\Services;

use App\Database;

/**
 * Aggregate reporting. Port of backend/src/modules/statistics/statistics.service.ts.
 */
final class Statistics
{
    /** Public summary (no PII). */
    public static function summary(): array
    {
        $total = (int) Database::scalar('SELECT COUNT(*) FROM "Complaint"');
        $forwarded = (int) Database::scalar('SELECT COUNT(*) FROM "Complaint" WHERE "status" IN (\'forwarded\',\'closed\')');
        $byCategory = Database::all('SELECT "categoryId" AS id, COUNT(*) AS count FROM "Complaint" GROUP BY "categoryId" ORDER BY count DESC');
        $urgent = (int) Database::scalar('SELECT COUNT(*) FROM "Complaint" WHERE "urgent" = TRUE');
        return [
            'totalComplaints' => $total,
            'totalForwarded'  => $forwarded,
            'byCategory'      => $byCategory,
            'byUrgency'       => ['urgent' => $urgent, 'normal' => $total - $urgent],
        ];
    }

    /** Admin detail with optional date range. */
    public static function detail(?string $from, ?string $to): array
    {
        $where = [];
        $params = [];
        // Qualify with the "c" alias: byInstitution joins Institution, which also
        // has a "createdAt" column, so an unqualified reference is ambiguous.
        if ($from) { $where[] = 'c."createdAt" >= :from'; $params['from'] = $from; }
        if ($to)   { $where[] = 'c."createdAt" <= :to'; $params['to'] = $to; }
        $clause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $base = self::summary();

        $byStatus = Database::all("SELECT c.\"status\", COUNT(*) AS count FROM \"Complaint\" c {$clause} GROUP BY c.\"status\"", $params);
        $byMonth = Database::all(
            "SELECT DATE_FORMAT(c.\"createdAt\", '%Y-%m') AS month, COUNT(*) AS count
               FROM \"Complaint\" c {$clause} GROUP BY 1 ORDER BY 1",
            $params,
        );
        $bySubmissionType = Database::all("SELECT c.\"submissionType\" AS type, COUNT(*) AS count FROM \"Complaint\" c {$clause} GROUP BY c.\"submissionType\"", $params);
        $byInstitution = Database::all(
            "SELECT c.\"institutionId\", i.\"name\", COUNT(*) AS count
               FROM \"Complaint\" c JOIN \"Institution\" i ON i.\"id\" = c.\"institutionId\"
               {$clause} GROUP BY c.\"institutionId\", i.\"name\" ORDER BY count DESC LIMIT 20",
            $params,
        );

        return array_merge($base, [
            'byStatus' => $byStatus,
            'byMonth' => $byMonth,
            'bySubmissionType' => $bySubmissionType,
            'byInstitution' => $byInstitution,
        ]);
    }

    /** Rows for CSV/PDF export. */
    public static function exportRows(?string $from, ?string $to): array
    {
        $where = [];
        $params = [];
        if ($from) { $where[] = '"createdAt" >= :from'; $params['from'] = $from; }
        if ($to)   { $where[] = '"createdAt" <= :to'; $params['to'] = $to; }
        $clause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        return Database::all(
            "SELECT \"publicId\",\"status\",\"categoryId\",\"submissionType\",\"urgent\",\"createdAt\",\"forwardedAt\",\"closedAt\"
               FROM \"Complaint\" {$clause} ORDER BY \"createdAt\" DESC",
            $params,
        );
    }
}

<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Audit;

/**
 * Streams an attachment to authorised users only (owner of the complaint or an
 * admin). Files live outside the web root; access is always brokered here.
 */
final class AttachmentController
{
    public function download(array $params): void
    {
        $user = Auth::requireAuth();
        $att = Database::one(
            'SELECT a.*, c."userId" AS "complaintUserId"
               FROM "Attachment" a JOIN "Complaint" c ON c."id" = a."complaintId"
              WHERE a."id" = :id',
            ['id' => $params['id']],
        );

        if (!$att) {
            http_response_code(404);
            view('errors/404', [], 'app');
            return;
        }
        if (!Auth::isAdmin() && $att['complaintUserId'] !== $user['id']) {
            http_response_code(404);
            view('errors/404', [], 'app');
            return;
        }
        if (!is_file($att['storagePath'])) {
            http_response_code(404);
            view('errors/404', [], 'app');
            return;
        }

        Audit::log('attachment.retrieved', $user['id'], "attachment:{$att['id']}");

        header('Content-Type: ' . $att['mimeType']);
        header('Content-Length: ' . (string) filesize($att['storagePath']));
        header('Content-Disposition: attachment; filename="' . basename($att['originalFilename']) . '"');
        header('X-Content-Type-Options: nosniff');
        readfile($att['storagePath']);
        exit;
    }
}

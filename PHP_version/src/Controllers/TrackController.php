<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\Complaints;
use App\Auth;

final class TrackController
{
    public function index(array $params): void
    {
        $pid = trim((string) ($_GET['publicId'] ?? ''));
        if ($pid !== '') {
            redirect('/track/' . rawurlencode($pid));
        }
        view('track', ['title' => t('track.title'), 'complaint' => null, 'notFound' => false]);
    }

    public function show(array $params): void
    {
        $pid = strtoupper(trim($params['publicId']));
        $complaint = Complaints::trackByPublicId($pid);

        // Public tracking exposes limited fields. Private (user-owned, non-closed)
        // complaints are only visible to their owner or an admin.
        $notFound = false;
        if (!$complaint) {
            $notFound = true;
        } else {
            $owner = $complaint['userId'];
            $isOwnerOrAdmin = Auth::isAdmin() || ($owner !== null && $owner === Auth::id());
            $isPublic = $owner === null || $complaint['status'] === 'closed';
            if (!$isOwnerOrAdmin && !$isPublic) {
                $complaint = null;
                $notFound = true;
            }
        }

        view('track', [
            'title' => t('track.title'),
            'complaint' => $complaint,
            'notFound' => $notFound,
            'query' => $pid,
        ]);
    }
}

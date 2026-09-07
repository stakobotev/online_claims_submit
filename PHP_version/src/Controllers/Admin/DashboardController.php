<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Auth;
use App\Services\Statistics;

final class DashboardController
{
    public function index(array $params): void
    {
        Auth::requireAdmin();
        view('admin/dashboard', [
            'title' => t('admin.dashboard'),
            'stats' => Statistics::summary(),
        ], 'admin');
    }
}

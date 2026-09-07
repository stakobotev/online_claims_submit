<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Auth;
use App\Repo\Users;

final class UsersController
{
    private const ROLES = ['admin', 'user'];
    private const STATUSES = ['draft', 'pending_confirmation', 'active', 'blocked', 'deactivated'];

    public function index(array $params): void
    {
        Auth::requireAdmin();
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $result = Users::paginate(
            $page, 20,
            trim((string) ($_GET['q'] ?? '')) ?: null,
            in_array($_GET['role'] ?? '', self::ROLES, true) ? $_GET['role'] : null,
            in_array($_GET['status'] ?? '', self::STATUSES, true) ? $_GET['status'] : null,
        );
        view('admin/users', [
            'title' => t('admin.nav.users'),
            'result' => $result,
            'roles' => self::ROLES,
            'statuses' => self::STATUSES,
        ], 'admin');
    }

    public function update(array $params): void
    {
        $admin = Auth::requireAdmin();
        $role = in_array($_POST['role'] ?? '', self::ROLES, true) ? $_POST['role'] : null;
        $status = in_array($_POST['status'] ?? '', self::STATUSES, true) ? $_POST['status'] : null;
        Users::update($params['id'], $role, $status, $admin['id']);
        flash('success', t('admin.userUpdated'));
        redirect('/admin/users' . qs([]));
    }

    public function anonymize(array $params): void
    {
        $admin = Auth::requireAdmin();
        $r = Users::anonymize($params['id'], $admin['id']);
        flash($r['ok'] ? 'success' : 'error', $r['ok'] ? t('admin.anonymized') : t('errors.generic'));
        redirect('/admin/users');
    }

    public function export(array $params): void
    {
        $admin = Auth::requireAdmin();
        $data = Users::exportData($params['id'], $admin['id']);
        if ($data === null) {
            http_response_code(404);
            view('errors/404', [], 'admin');
            return;
        }
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="user-' . $params['id'] . '.json"');
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

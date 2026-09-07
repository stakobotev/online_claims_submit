<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Auth;
use App\Validator;
use App\Services\Complaints;
use App\Repo\Categories;

final class ComplaintsController
{
    public function index(array $params): void
    {
        Auth::requireAdmin();
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $urgentParam = $_GET['urgent'] ?? '';
        $result = Complaints::listComplaints([
            'isAdmin'       => true,
            'q'             => trim((string) ($_GET['q'] ?? '')),
            'category'      => (string) ($_GET['category'] ?? ''),
            'status'        => (string) ($_GET['status'] ?? ''),
            'urgent'        => $urgentParam === '' ? null : ($urgentParam === '1'),
            'from'          => (string) ($_GET['from'] ?? ''),
            'to'            => (string) ($_GET['to'] ?? ''),
            'page'          => $page,
            'size'          => 20,
        ]);
        view('admin/complaints_queue', [
            'title' => t('admin.nav.complaints'),
            'result' => $result,
            'categories' => Categories::all(),
        ], 'admin');
    }

    public function show(array $params): void
    {
        Auth::requireAdmin();
        $c = Complaints::getByPublicId($params['publicId'], null, true);
        if (!$c) {
            http_response_code(404);
            view('errors/404', [], 'admin');
            return;
        }
        view('admin/complaint_detail', [
            'title' => $c['publicId'],
            'c' => $c,
            'events' => Complaints::events($params['publicId']),
        ], 'admin');
    }

    public function approve(array $params): void
    {
        $admin = Auth::requireAdmin();
        $r = Complaints::approve($params['publicId'], $admin['id']);
        flash($r['ok'] ? 'success' : 'error', $r['ok'] ? t('admin.approved') : t('errors.generic'));
        redirect('/admin/complaints/' . rawurlencode($params['publicId']));
    }

    public function reject(array $params): void
    {
        $admin = Auth::requireAdmin();
        $reason = trim((string) ($_POST['reason'] ?? ''));
        $v = (new Validator())->required('reason', $reason, t('admin.rejectReason'));
        if ($v->fails()) {
            flash('error', t('admin.rejectReason'));
            redirect('/admin/complaints/' . rawurlencode($params['publicId']));
        }
        $r = Complaints::reject($params['publicId'], $admin['id'], $reason);
        flash($r['ok'] ? 'success' : 'error', $r['ok'] ? t('admin.rejected') : t('errors.generic'));
        redirect('/admin/complaints/' . rawurlencode($params['publicId']));
    }

    public function close(array $params): void
    {
        $admin = Auth::requireAdmin();
        $r = Complaints::close($params['publicId'], $admin['id']);
        flash($r['ok'] ? 'success' : 'error', $r['ok'] ? t('admin.closed') : t('errors.generic'));
        redirect('/admin/complaints/' . rawurlencode($params['publicId']));
    }
}

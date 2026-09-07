<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Auth;
use App\Audit;
use App\Validator;
use App\Repo\Institutions;
use App\Repo\Categories;

final class InstitutionsController
{
    public function index(array $params): void
    {
        Auth::requireAdmin();
        $page = max(1, (int) ($_GET['page'] ?? 1));
        view('admin/institutions', [
            'title' => t('admin.nav.institutions'),
            'result' => Institutions::paginate($page, 20),
            'categories' => Categories::all(),
        ], 'admin');
    }

    public function create(array $params): void
    {
        $admin = Auth::requireAdmin();
        [$categoryId, $name, $email, $errors] = $this->validate();
        if ($errors) {
            flash('error', reset($errors));
            redirect('/admin/institutions');
        }
        $id = Institutions::create($categoryId, $name, $email);
        Audit::log('admin.institution.created', $admin['id'], "institution:{$id}");
        flash('success', t('admin.institutionCreated'));
        redirect('/admin/institutions');
    }

    public function update(array $params): void
    {
        $admin = Auth::requireAdmin();
        [$categoryId, $name, $email, $errors] = $this->validate();
        if ($errors) {
            flash('error', reset($errors));
            redirect('/admin/institutions');
        }
        Institutions::update($params['id'], $categoryId, $name, $email);
        Audit::log('admin.institution.updated', $admin['id'], "institution:{$params['id']}");
        flash('success', t('admin.institutionUpdated'));
        redirect('/admin/institutions');
    }

    public function delete(array $params): void
    {
        $admin = Auth::requireAdmin();
        Institutions::deactivate($params['id']);
        Audit::log('admin.institution.deactivated', $admin['id'], "institution:{$params['id']}");
        flash('success', t('admin.institutionDeleted'));
        redirect('/admin/institutions');
    }

    public function activate(array $params): void
    {
        $admin = Auth::requireAdmin();
        Institutions::activate($params['id']);
        Audit::log('admin.institution.activated', $admin['id'], "institution:{$params['id']}");
        flash('success', t('admin.institutionActivated'));
        redirect('/admin/institutions');
    }

    /** @return array{0:string,1:string,2:string,3:array<string,string>} */
    private function validate(): array
    {
        $categoryId = (string) ($_POST['categoryId'] ?? '');
        $name = trim((string) ($_POST['name'] ?? ''));
        $email = trim((string) ($_POST['email'] ?? ''));
        $v = (new Validator())
            ->required('categoryId', $categoryId, t('complaint.selectCategory'))
            ->minLen('name', $name, 2, t('complaint.institution'))
            ->email('email', $email, t('auth.email'));
        return [$categoryId, $name, $email, $v->errors()];
    }
}

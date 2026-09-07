<?php
/** @var array $result @var array $roles @var array $statuses */
$g = static fn (string $k) => (string) ($_GET[$k] ?? '');
?>
<h1 class="mb"><?= e(t('admin.nav.users')) ?></h1>

<form method="get" action="<?= e(url('/admin/users')) ?>" class="filters">
  <div class="field" style="flex:1;min-width:200px">
    <input class="input" name="q" value="<?= e($g('q')) ?>" placeholder="<?= e(t('auth.email')) ?>">
  </div>
  <div class="field">
    <select class="select" name="role">
      <option value=""><?= e(t('admin.allRoles')) ?></option>
      <?php foreach ($roles as $r): ?>
        <option value="<?= e($r) ?>" <?= $g('role') === $r ? 'selected' : '' ?>><?= e(t('role.' . $r)) ?></option>
      <?php endforeach; ?>
    </select>
  </div>
  <div class="field">
    <select class="select" name="status">
      <option value=""><?= e(t('admin.allStatuses')) ?></option>
      <?php foreach ($statuses as $s): ?>
        <option value="<?= e($s) ?>" <?= $g('status') === $s ? 'selected' : '' ?>><?= e($s) ?></option>
      <?php endforeach; ?>
    </select>
  </div>
  <button class="btn btn-primary" type="submit"><?= e(t('admin.searchAction')) ?></button>
</form>

<?php if (empty($result['data'])): ?>
  <div class="card"><div class="card-body"><?= e(t('admin.noUsers')) ?></div></div>
<?php else: ?>
  <div class="table-wrap">
    <table class="table">
      <thead><tr>
        <th><?= e(t('auth.email')) ?></th>
        <th><?= e(t('auth.name')) ?></th>
        <th><?= e(t('admin.role')) ?></th>
        <th><?= e(t('admin.status')) ?></th>
        <th><?= e(t('complaint.submitted')) ?></th>
        <th><?= e(t('admin.actions')) ?></th>
      </tr></thead>
      <tbody>
      <?php foreach ($result['data'] as $u): ?>
        <tr>
          <td class="small"><?= e($u['email']) ?></td>
          <td class="small"><?= e($u['name'] ?: '—') ?></td>
          <td colspan="2">
            <form method="post" action="<?= e(url('/admin/users/' . rawurlencode($u['id']) . '/update' . qs([]))) ?>" class="row" style="gap:.4rem;align-items:center">
              <?= csrf_field() ?>
              <select class="select" name="role" style="width:auto">
                <?php foreach ($roles as $r): ?>
                  <option value="<?= e($r) ?>" <?= $u['role'] === $r ? 'selected' : '' ?>><?= e(t('role.' . $r)) ?></option>
                <?php endforeach; ?>
              </select>
              <select class="select" name="status" style="width:auto">
                <?php foreach ($statuses as $s): ?>
                  <option value="<?= e($s) ?>" <?= $u['status'] === $s ? 'selected' : '' ?>><?= e($s) ?></option>
                <?php endforeach; ?>
              </select>
              <button class="btn btn-secondary btn-sm" type="submit"><?= e(t('actions.save')) ?></button>
            </form>
          </td>
          <td class="small"><?= e(fmt_date($u['createdAt'])) ?></td>
          <td>
            <div class="row" style="gap:.3rem">
              <a class="btn btn-secondary btn-sm" href="<?= e(url('/admin/users/' . rawurlencode($u['id']) . '/export')) ?>">JSON</a>
              <?php if (empty($u['anonymizedAt'])): ?>
                <form method="post" action="<?= e(url('/admin/users/' . rawurlencode($u['id']) . '/anonymize')) ?>"
                      onsubmit="return confirm('<?= e(t('admin.anonymizeConfirmBody', ['email' => $u['email']])) ?>')">
                  <?= csrf_field() ?>
                  <button class="btn btn-danger btn-sm" type="submit"><?= e(t('admin.anonymize')) ?></button>
                </form>
              <?php else: ?>
                <span class="badge badge-info">GDPR</span>
              <?php endif; ?>
            </div>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php require VLC_ROOT . '/views/partials/pagination.php'; ?>
<?php endif; ?>

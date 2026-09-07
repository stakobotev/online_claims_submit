<?php
/** @var array $result @var array $categories */
$statuses = ['submitted','pending_review','approved','rejected','forwarded','closed'];
$g = static fn (string $k) => (string) ($_GET[$k] ?? '');
?>
<h1 class="mb"><?= e(t('admin.nav.complaints')) ?></h1>

<form method="get" action="<?= e(url('/admin/complaints')) ?>" class="filters">
  <div class="field" style="flex:1;min-width:200px">
    <input class="input" name="q" value="<?= e($g('q')) ?>" placeholder="<?= e(t('admin.search')) ?>">
  </div>
  <div class="field">
    <select class="select" name="status">
      <option value=""><?= e(t('admin.allStatuses')) ?></option>
      <?php foreach ($statuses as $s): ?>
        <option value="<?= e($s) ?>" <?= $g('status') === $s ? 'selected' : '' ?>><?= e(t('status.' . $s)) ?></option>
      <?php endforeach; ?>
    </select>
  </div>
  <div class="field">
    <select class="select" name="category">
      <option value=""><?= e(t('admin.allCategories')) ?></option>
      <?php foreach ($categories as $c): ?>
        <option value="<?= e($c['id']) ?>" <?= $g('category') === $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
      <?php endforeach; ?>
    </select>
  </div>
  <div class="field">
    <select class="select" name="urgent">
      <option value=""><?= e(t('admin.allUrgency')) ?></option>
      <option value="1" <?= $g('urgent') === '1' ? 'selected' : '' ?>><?= e(t('complaint.urgent')) ?></option>
      <option value="0" <?= $g('urgent') === '0' ? 'selected' : '' ?>><?= e(t('admin.notUrgent')) ?></option>
    </select>
  </div>
  <button class="btn btn-primary" type="submit"><?= e(t('admin.searchAction')) ?></button>
  <a class="btn btn-secondary" href="<?= e(url('/admin/complaints')) ?>"><?= e(t('admin.clearSearch')) ?></a>
</form>

<?php if (empty($result['data'])): ?>
  <div class="card"><div class="card-body"><?= e(t('admin.noComplaints')) ?></div></div>
<?php else: ?>
  <div class="table-wrap">
    <table class="table">
      <thead><tr>
        <th><?= e(t('complaint.publicId')) ?></th>
        <th><?= e(t('complaint.category')) ?></th>
        <th><?= e(t('complaint.title')) ?></th>
        <th><?= e(t('complaint.status')) ?></th>
        <th><?= e(t('complaint.type')) ?></th>
        <th><?= e(t('complaint.submitted')) ?></th>
        <th></th>
      </tr></thead>
      <tbody>
      <?php foreach ($result['data'] as $c): ?>
        <tr>
          <td class="mono small"><?= e($c['publicId']) ?></td>
          <td class="small"><?= e($c['categoryName']) ?></td>
          <td><?= e($c['title']) ?></td>
          <td>
            <span class="badge badge-<?= e(status_variant($c['status'])) ?>"><?= e(t('status.' . $c['status'])) ?></span>
            <?php if (pgbool($c['urgent'])): ?><span class="badge badge-urgent"><?= e(t('complaint.urgent')) ?></span><?php endif; ?>
          </td>
          <td class="small"><?= e($c['submissionType']) ?></td>
          <td class="small"><?= e(fmt_date($c['createdAt'])) ?></td>
          <td><a class="btn btn-secondary btn-sm" href="<?= e(url('/admin/complaints/' . rawurlencode($c['publicId']))) ?>"><?= e(t('admin.view')) ?></a></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php require VLC_ROOT . '/views/partials/pagination.php'; ?>
<?php endif; ?>

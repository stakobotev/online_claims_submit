<?php /** @var array $result @var array $categories */ ?>
<div class="spread mb">
  <h1><?= e(t('admin.nav.institutions')) ?></h1>
</div>

<details class="card mb">
  <summary class="card-header" style="cursor:pointer"><?= e(t('admin.addInstitution')) ?></summary>
  <div class="card-body">
    <form method="post" action="<?= e(url('/admin/institutions')) ?>" class="filters">
      <?= csrf_field() ?>
      <div class="field">
        <label><?= e(t('complaint.category')) ?></label>
        <select class="select" name="categoryId" required>
          <option value=""><?= e(t('complaint.selectCategory')) ?></option>
          <?php foreach ($categories as $c): ?><option value="<?= e($c['id']) ?>"><?= e($c['name']) ?></option><?php endforeach; ?>
        </select>
      </div>
      <div class="field"><label><?= e(t('complaint.institution')) ?></label><input class="input" name="name" required></div>
      <div class="field"><label><?= e(t('auth.email')) ?></label><input class="input" type="email" name="email" required></div>
      <button class="btn btn-primary" type="submit"><?= e(t('actions.save')) ?></button>
    </form>
  </div>
</details>

<?php if (empty($result['data'])): ?>
  <div class="card"><div class="card-body"><?= e(t('admin.noInstitutions')) ?></div></div>
<?php else: ?>
  <div class="table-wrap">
    <table class="table">
      <thead><tr>
        <th><?= e(t('complaint.institution')) ?></th>
        <th><?= e(t('complaint.category')) ?></th>
        <th><?= e(t('auth.email')) ?></th>
        <th><?= e(t('admin.active')) ?></th>
        <th><?= e(t('admin.actions')) ?></th>
      </tr></thead>
      <tbody>
      <?php foreach ($result['data'] as $i): ?>
        <tr>
          <td><?= e($i['name']) ?></td>
          <td class="small"><?= e($i['categoryName']) ?></td>
          <td class="small"><?= e($i['email']) ?></td>
          <td><?= pgbool($i['active']) ? '✓' : '—' ?></td>
          <td>
            <details class="modal" style="display:inline-block">
              <summary class="btn btn-secondary btn-sm"><?= e(t('actions.edit')) ?></summary>
              <form method="post" action="<?= e(url('/admin/institutions/' . rawurlencode($i['id']) . '/update')) ?>" class="mt" style="min-width:260px">
                <?= csrf_field() ?>
                <div class="field">
                  <select class="select" name="categoryId" required>
                    <?php foreach ($categories as $c): ?>
                      <option value="<?= e($c['id']) ?>" <?= $i['categoryId'] === $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                    <?php endforeach; ?>
                  </select>
                </div>
                <div class="field"><input class="input" name="name" value="<?= e($i['name']) ?>" required></div>
                <div class="field"><input class="input" type="email" name="email" value="<?= e($i['email']) ?>" required></div>
                <button class="btn btn-primary btn-sm" type="submit"><?= e(t('actions.save')) ?></button>
              </form>
            </details>
            <?php if (pgbool($i['active'])): ?>
              <form method="post" action="<?= e(url('/admin/institutions/' . rawurlencode($i['id']) . '/delete')) ?>" style="display:inline"
                    onsubmit="return confirm('<?= e(t('admin.deleteInstitutionBody', ['name' => $i['name']])) ?>')">
                <?= csrf_field() ?>
                <button class="btn btn-danger btn-sm" type="submit"><?= e(t('admin.deleteInstitution')) ?></button>
              </form>
            <?php else: ?>
              <form method="post" action="<?= e(url('/admin/institutions/' . rawurlencode($i['id']) . '/activate')) ?>" style="display:inline">
                <?= csrf_field() ?>
                <button class="btn btn-primary btn-sm" type="submit"><?= e(t('admin.activateInstitution')) ?></button>
              </form>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php require VLC_ROOT . '/views/partials/pagination.php'; ?>
<?php endif; ?>

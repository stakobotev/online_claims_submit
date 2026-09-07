<?php /** @var array $result */ ?>
<div class="container mt2 mb">
  <div class="spread mb">
    <h1><?= e(t('nav.myComplaints')) ?></h1>
    <a class="btn btn-primary" href="<?= e(url('/complaints/submit')) ?>"><?= e(t('nav.submit')) ?></a>
  </div>

  <?php if (empty($result['data'])): ?>
    <div class="card"><div class="card-body" style="text-align:center">
      <h3><?= e(t('complaint.noComplaints')) ?></h3>
      <p class="muted"><?= e(t('complaint.noComplaintsDesc')) ?></p>
    </div></div>
  <?php else: ?>
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th><?= e(t('complaint.publicId')) ?></th>
          <th><?= e(t('complaint.title')) ?></th>
          <th><?= e(t('complaint.submitted')) ?></th>
          <th><?= e(t('complaint.status')) ?></th>
        </tr></thead>
        <tbody>
        <?php foreach ($result['data'] as $c): ?>
          <tr onclick="location.href='<?= e(url('/complaints/' . rawurlencode($c['publicId']))) ?>'" style="cursor:pointer">
            <td class="mono small"><?= e($c['publicId']) ?></td>
            <td><?= e($c['title']) ?><?php if (pgbool($c['urgent'])): ?><span class="badge badge-urgent"><?= e(t('complaint.urgent')) ?></span><?php endif; ?></td>
            <td class="small"><?= e(fmt_date($c['createdAt'])) ?></td>
            <td><span class="badge badge-<?= e(status_variant($c['status'])) ?>"><?= e(t('status.' . $c['status'])) ?></span></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php require VLC_ROOT . '/views/partials/pagination.php'; ?>
  <?php endif; ?>
</div>

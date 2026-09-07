<?php /** @var array $stats */ ?>
<div class="spread mb">
  <h1><?= e(t('admin.dashboard')) ?></h1>
  <a class="btn btn-primary" href="<?= e(url('/admin/complaints')) ?>"><?= e(t('admin.viewComplaints')) ?></a>
</div>

<div class="stats-grid mb">
  <div class="stat"><div class="num"><?= (int) $stats['totalComplaints'] ?></div><div class="label"><?= e(t('stats.totalComplaints')) ?></div></div>
  <div class="stat"><div class="num"><?= (int) $stats['totalForwarded'] ?></div><div class="label"><?= e(t('stats.forwarded')) ?></div></div>
  <div class="stat"><div class="num"><?= (int) $stats['byUrgency']['urgent'] ?></div><div class="label"><?= e(t('stats.urgent')) ?></div></div>
  <div class="stat"><div class="num"><?= (int) $stats['byUrgency']['normal'] ?></div><div class="label"><?= e(t('stats.normal')) ?></div></div>
</div>

<div class="row">
  <a class="card" style="flex:1;min-width:200px;text-decoration:none" href="<?= e(url('/admin/complaints')) ?>">
    <div class="card-body"><h3><?= e(t('admin.nav.complaints')) ?></h3></div></a>
  <a class="card" style="flex:1;min-width:200px;text-decoration:none" href="<?= e(url('/admin/users')) ?>">
    <div class="card-body"><h3><?= e(t('admin.nav.users')) ?></h3></div></a>
  <a class="card" style="flex:1;min-width:200px;text-decoration:none" href="<?= e(url('/admin/institutions')) ?>">
    <div class="card-body"><h3><?= e(t('admin.nav.institutions')) ?></h3></div></a>
  <a class="card" style="flex:1;min-width:200px;text-decoration:none" href="<?= e(url('/admin/statistics')) ?>">
    <div class="card-body"><h3><?= e(t('admin.nav.statistics')) ?></h3></div></a>
</div>

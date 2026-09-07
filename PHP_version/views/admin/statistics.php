<?php
/** @var array $detail @var array $categories @var string $from @var string $to */
$bar = static function (array $rows, string $labelKey, string $countKey = 'count', ?array $map = null): void {
    if (empty($rows)) { echo '<p class="muted small">—</p>'; return; }
    $max = max(array_map(static fn ($r) => (int) $r[$countKey], $rows)) ?: 1;
    foreach ($rows as $r) {
        $label = $map[$r[$labelKey]] ?? $r[$labelKey];
        $pct = (int) round(((int) $r[$countKey] / $max) * 100);
        echo '<div class="bar-row"><span class="bar-label">' . e((string) $label) . '</span>'
           . '<span class="bar-track"><span class="bar-fill" style="width:' . $pct . '%"></span></span>'
           . '<span class="bar-val">' . (int) $r[$countKey] . '</span></div>';
    }
};
?>
<div class="spread mb">
  <h1><?= e(t('admin.nav.statistics')) ?></h1>
  <div class="row">
    <a class="btn btn-secondary" href="<?= e(url('/admin/statistics/export' . qs(['format' => 'csv']))) ?>">CSV</a>
    <a class="btn btn-secondary" href="<?= e(url('/admin/statistics/export' . qs(['format' => 'pdf']))) ?>">PDF</a>
  </div>
</div>

<form method="get" action="<?= e(url('/admin/statistics')) ?>" class="filters">
  <div class="field"><label><?= e(t('admin.from')) ?></label><input class="input" type="date" name="from" value="<?= e($from) ?>"></div>
  <div class="field"><label><?= e(t('admin.to')) ?></label><input class="input" type="date" name="to" value="<?= e($to) ?>"></div>
  <button class="btn btn-primary" type="submit"><?= e(t('admin.searchAction')) ?></button>
</form>

<div class="stats-grid mb">
  <div class="stat"><div class="num"><?= (int) $detail['totalComplaints'] ?></div><div class="label"><?= e(t('stats.totalComplaints')) ?></div></div>
  <div class="stat"><div class="num"><?= (int) $detail['totalForwarded'] ?></div><div class="label"><?= e(t('stats.forwarded')) ?></div></div>
  <div class="stat"><div class="num"><?= (int) $detail['byUrgency']['urgent'] ?></div><div class="label"><?= e(t('stats.urgent')) ?></div></div>
  <div class="stat"><div class="num"><?= (int) $detail['byUrgency']['normal'] ?></div><div class="label"><?= e(t('stats.normal')) ?></div></div>
</div>

<div class="row">
  <div class="card" style="flex:1;min-width:280px"><div class="card-body">
    <h3><?= e(t('stats.byCategory')) ?></h3>
    <?php $bar($detail['byCategory'], 'id', 'count', $categories); ?>
  </div></div>
  <div class="card" style="flex:1;min-width:280px"><div class="card-body">
    <h3><?= e(t('stats.byStatus')) ?></h3>
    <?php
      $statusRows = array_map(static fn ($r) => ['label' => t('status.' . $r['status']), 'count' => $r['count']], $detail['byStatus']);
      $bar($statusRows, 'label');
    ?>
  </div></div>
</div>

<div class="card mt"><div class="card-body">
  <h3><?= e(t('stats.monthly')) ?></h3>
  <?php $bar($detail['byMonth'], 'month'); ?>
</div></div>

<div class="row mt">
  <div class="card" style="flex:1;min-width:280px"><div class="card-body">
    <h3><?= e(t('stats.byInstitution')) ?></h3>
    <?php $bar($detail['byInstitution'], 'name'); ?>
  </div></div>
  <div class="card" style="flex:1;min-width:280px"><div class="card-body">
    <h3><?= e(t('stats.bySubmissionType')) ?></h3>
    <?php $bar($detail['bySubmissionType'], 'type'); ?>
  </div></div>
</div>

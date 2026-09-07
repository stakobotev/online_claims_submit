<?php
/** @var array $stats @var array $categories */
$catMap = $categories;
?>
<section class="hero">
  <div class="container">
    <h1><?= e(t('home.hero.title')) ?></h1>
    <p><?= e(t('home.hero.subtitle')) ?></p>
    <div class="row mt">
      <a class="btn btn-primary" href="<?= e(url('/complaints/submit')) ?>"><?= e(t('home.cta.submit')) ?></a>
      <?php if (!current_user()): ?>
        <a class="btn btn-secondary" href="<?= e(url('/auth/register')) ?>"><?= e(t('nav.register')) ?></a>
      <?php else: ?>
        <a class="btn btn-secondary" href="<?= e(url('/complaints')) ?>"><?= e(t('nav.myComplaints')) ?></a>
      <?php endif; ?>
    </div>
  </div>
</section>

<div class="container mt2">
  <!-- Track box -->
  <div class="card mb">
    <div class="card-body">
      <form method="get" action="<?= e(url('/track')) ?>" class="spread">
        <div class="field" style="flex:1;margin:0;min-width:240px">
          <label for="publicId"><?= e(t('home.track.label')) ?></label>
          <input class="input" id="publicId" name="publicId" placeholder="<?= e(t('home.track.placeholder')) ?>">
        </div>
        <button class="btn btn-primary" type="submit"><?= e(t('home.track.action')) ?></button>
      </form>
    </div>
  </div>

  <!-- Stats -->
  <h2 class="mt2"><?= e(t('home.stats.title')) ?></h2>
  <div class="stats-grid mb">
    <div class="stat"><div class="num"><?= (int) $stats['totalComplaints'] ?></div><div class="label"><?= e(t('stats.totalComplaints')) ?></div></div>
    <div class="stat"><div class="num"><?= (int) $stats['totalForwarded'] ?></div><div class="label"><?= e(t('stats.forwarded')) ?></div></div>
    <div class="stat"><div class="num"><?= (int) $stats['byUrgency']['urgent'] ?></div><div class="label"><?= e(t('stats.urgent')) ?></div></div>
    <div class="stat"><div class="num"><?= (int) $stats['byUrgency']['normal'] ?></div><div class="label"><?= e(t('stats.normal')) ?></div></div>
  </div>

  <?php if (!empty($stats['byCategory'])): ?>
    <div class="card mb"><div class="card-body">
      <h3><?= e(t('stats.byCategory')) ?></h3>
      <?php
        $max = max(array_map(static fn ($r) => (int) $r['count'], $stats['byCategory'])) ?: 1;
        foreach ($stats['byCategory'] as $row):
          $label = $catMap[$row['id']] ?? $row['id'];
          $pct = (int) round(((int) $row['count'] / $max) * 100);
      ?>
        <div class="bar-row">
          <span class="bar-label"><?= e($label) ?></span>
          <span class="bar-track"><span class="bar-fill" style="width:<?= $pct ?>%"></span></span>
          <span class="bar-val"><?= (int) $row['count'] ?></span>
        </div>
      <?php endforeach; ?>
    </div></div>
  <?php endif; ?>

  <!-- How it works -->
  <h2 class="mt2"><?= e(t('home.howItWorks.title')) ?></h2>
  <div class="steps mb">
    <div class="step"><div class="n">1</div><h3><?= e(t('home.step1.title')) ?></h3><p class="muted"><?= e(t('home.step1.desc')) ?></p></div>
    <div class="step"><div class="n">2</div><h3><?= e(t('home.step2.title')) ?></h3><p class="muted"><?= e(t('home.step2.desc')) ?></p></div>
    <div class="step"><div class="n">3</div><h3><?= e(t('home.step3.title')) ?></h3><p class="muted"><?= e(t('home.step3.desc')) ?></p></div>
  </div>
</div>

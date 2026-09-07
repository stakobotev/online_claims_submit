<div class="container narrow mt2 mb">
  <h1><?= e(t('terms.title')) ?></h1>
  <?php foreach (['section1','section2','section3','section4'] as $s): ?>
    <h2 class="mt2"><?= e(t("terms.$s.title")) ?></h2>
    <p class="muted"><?= e(t("terms.$s.body")) ?></p>
  <?php endforeach; ?>
  <p class="small muted mt2"><?= e(t('terms.version')) ?></p>
</div>

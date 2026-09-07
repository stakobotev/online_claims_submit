<?php $title = t('errors.forbidden'); ?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body">
    <h1>403</h1>
    <p class="muted"><?= e(t('errors.forbidden')) ?></p>
    <a class="btn btn-primary mt" href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a>
  </div></div>
</div>

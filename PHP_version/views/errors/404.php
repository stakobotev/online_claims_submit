<?php $title = t('errors.notFound'); ?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body">
    <h1><?= e(t('errors.notFound')) ?></h1>
    <p class="muted"><?= e(t('errors.notFoundDesc')) ?></p>
    <a class="btn btn-primary mt" href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a>
  </div></div>
</div>

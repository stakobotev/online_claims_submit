<?php $sections = t_raw('terms.sections'); ?>
<div class="container narrow mt2 mb">
  <h1><?= e(t('terms.title')) ?></h1>

  <?php if (is_array($sections)): $n = 0; foreach ($sections as $s): $n++; ?>
    <h2 class="mt2"><?= $n ?>. <?= e($s['title'] ?? '') ?></h2>
    <?php foreach (($s['body'] ?? []) as $p): ?>
      <p class="muted"><?= e($p) ?></p>
    <?php endforeach; ?>
    <?php if (!empty($s['list'])): ?>
      <ul class="muted">
        <?php foreach ($s['list'] as $li): ?>
          <li><?= e($li) ?></li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
  <?php endforeach; endif; ?>

  <p class="small muted mt2"><?= e(t('terms.version')) ?></p>
</div>

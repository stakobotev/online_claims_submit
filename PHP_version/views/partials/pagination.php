<?php
/**
 * Renders pagination. Expects $result with keys page,pages. Preserves current
 * query-string params, overriding `page`.
 * @var array $result
 */
$page = (int) $result['page'];
$pages = (int) $result['pages'];
if ($pages <= 1) {
    return;
}
$window = range(max(1, $page - 2), min($pages, $page + 2));
?>
<div class="pagination">
  <?php if ($page > 1): ?>
    <a href="<?= e(qs(['page' => $page - 1])) ?>"><?= e(t('pagination.previous')) ?></a>
  <?php else: ?>
    <span class="disabled"><?= e(t('pagination.previous')) ?></span>
  <?php endif; ?>

  <?php if ($window[0] > 1): ?><span>…</span><?php endif; ?>
  <?php foreach ($window as $p): ?>
    <?php if ($p === $page): ?>
      <span class="current"><?= $p ?></span>
    <?php else: ?>
      <a href="<?= e(qs(['page' => $p])) ?>"><?= $p ?></a>
    <?php endif; ?>
  <?php endforeach; ?>
  <?php if (end($window) < $pages): ?><span>…</span><?php endif; ?>

  <?php if ($page < $pages): ?>
    <a href="<?= e(qs(['page' => $page + 1])) ?>"><?= e(t('pagination.next')) ?></a>
  <?php else: ?>
    <span class="disabled"><?= e(t('pagination.next')) ?></span>
  <?php endif; ?>
</div>

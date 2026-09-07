<?php
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$items = [
    '/admin'              => t('admin.nav.dashboard'),
    '/admin/complaints'   => t('admin.nav.complaints'),
    '/admin/users'        => t('admin.nav.users'),
    '/admin/institutions' => t('admin.nav.institutions'),
    '/admin/statistics'   => t('admin.nav.statistics'),
];
?>
<aside class="sidebar">
  <?php foreach ($items as $href => $label):
      $active = ($href === '/admin') ? ($path === '/admin') : str_starts_with($path, $href);
  ?>
    <a class="<?= $active ? 'active' : '' ?>" href="<?= e(url($href)) ?>"><?= e($label) ?></a>
  <?php endforeach; ?>
</aside>

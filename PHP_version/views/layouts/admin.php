<?php /** @var string $content */ ?>
<!DOCTYPE html>
<html lang="<?= e(locale()) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= isset($title) ? e($title) . ' — ' : '' ?><?= e(t('nav.admin')) ?></title>
  <link rel="stylesheet" href="<?= e(url('/assets/css/app.css')) ?>">
</head>
<body>
  <?php require VLC_ROOT . '/views/partials/header.php'; ?>
  <main>
    <div class="container admin-shell">
      <?php require VLC_ROOT . '/views/partials/sidebar.php'; ?>
      <div class="admin-main">
        <?php require VLC_ROOT . '/views/partials/flash.php'; ?>
        <?= $content ?>
      </div>
    </div>
  </main>
  <?php require VLC_ROOT . '/views/partials/footer.php'; ?>
</body>
</html>

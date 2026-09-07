<?php /** @var string $content */ ?>
<!DOCTYPE html>
<html lang="<?= e(locale()) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= isset($title) ? e($title) . ' — ' : '' ?><?= e(t('app.name')) ?></title>
  <link rel="stylesheet" href="<?= e(url('/assets/css/app.css')) ?>">
</head>
<body>
  <?php require VLC_ROOT . '/views/partials/header.php'; ?>
  <main>
    <div class="container">
      <?php require VLC_ROOT . '/views/partials/flash.php'; ?>
    </div>
    <?= $content ?>
  </main>
  <?php require VLC_ROOT . '/views/partials/footer.php'; ?>
</body>
</html>

<footer class="site-footer">
  <div class="container">
    <span>&copy; <?= date('Y') ?> <?= e(t('footer.org')) ?></span>
    <nav class="nav">
      <a href="<?= e(url('/about')) ?>"><?= e(t('nav.about')) ?></a>
      <a href="<?= e(url('/privacy')) ?>"><?= e(t('nav.privacy')) ?></a>
      <a href="<?= e(url('/terms')) ?>"><?= e(t('nav.terms')) ?></a>
    </nav>
  </div>
</footer>

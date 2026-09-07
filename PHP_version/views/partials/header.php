<?php $u = current_user(); $otherLang = locale() === 'bg' ? 'en' : 'bg'; ?>
<header class="site-header">
  <div class="container">
    <a class="brand" href="<?= e(url('/')) ?>"><?= e(t('app.name')) ?></a>
    <nav class="nav">
      <a href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a>
      <a href="<?= e(url('/complaints/submit')) ?>"><?= e(t('nav.submit')) ?></a>
      <?php if ($u): ?>
        <a href="<?= e(url('/complaints')) ?>"><?= e(t('nav.myComplaints')) ?></a>
      <?php endif; ?>
      <?php if (is_admin()): ?>
        <a href="<?= e(url('/admin')) ?>"><?= e(t('nav.admin')) ?></a>
      <?php endif; ?>

      <a class="lang-toggle" href="<?= e(url('/?lang=' . $otherLang)) ?>"><?= strtoupper($otherLang) ?></a>

      <?php if ($u): ?>
        <span class="muted small"><?= e($u['name'] ?: $u['email']) ?></span>
        <form method="post" action="<?= e(url('/auth/logout')) ?>">
          <?= csrf_field() ?>
          <button class="btn btn-secondary btn-sm" type="submit"><?= e(t('nav.logout')) ?></button>
        </form>
      <?php else: ?>
        <a href="<?= e(url('/auth/login')) ?>"><?= e(t('nav.login')) ?></a>
        <a class="btn btn-primary btn-sm" href="<?= e(url('/auth/register')) ?>"><?= e(t('nav.register')) ?></a>
      <?php endif; ?>
    </nav>
  </div>
</header>

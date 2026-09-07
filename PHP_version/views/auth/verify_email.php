<?php /** @var string $mode  'sent'|'success'|'failed' */ ?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body" style="text-align:center">
    <?php if ($mode === 'success'): ?>
      <h1><?= e(t('auth.emailVerified')) ?></h1>
      <p class="muted"><?= e(t('auth.emailVerifiedDesc')) ?></p>
      <a class="btn btn-primary mt" href="<?= e(url('/auth/login')) ?>"><?= e(t('nav.login')) ?></a>
    <?php elseif ($mode === 'failed'): ?>
      <h1><?= e(t('auth.verifyFailed')) ?></h1>
      <p class="muted"><?= e(t('auth.verifyFailedDesc')) ?></p>
      <a class="btn btn-secondary mt" href="<?= e(url('/auth/verify-email')) ?>"><?= e(t('auth.resend')) ?></a>
    <?php else: ?>
      <h1><?= e(t('auth.checkEmail')) ?></h1>
      <p class="muted"><?= e(t('auth.verifyEmailSent')) ?></p>
      <form method="post" action="<?= e(url('/auth/resend-verification')) ?>" class="mt">
        <?= csrf_field() ?>
        <div class="field">
          <label for="email"><?= e(t('auth.didntReceive')) ?></label>
          <input class="input" type="email" id="email" name="email" placeholder="<?= e(t('auth.email')) ?>" required>
        </div>
        <button class="btn btn-secondary" type="submit"><?= e(t('auth.resend')) ?></button>
      </form>
    <?php endif; ?>
  </div></div>
</div>

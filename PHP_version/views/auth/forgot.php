<?php /** @var bool $sent @var array $errors */ ?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body">
    <h1><?= e(t('auth.forgotPassword')) ?></h1>
    <?php if (!empty($sent)): ?>
      <div class="alert alert-success"><?= e(t('auth.forgotSent')) ?></div>
      <a class="btn btn-secondary" href="<?= e(url('/auth/login')) ?>"><?= e(t('nav.login')) ?></a>
    <?php else: ?>
      <p class="muted"><?= e(t('auth.forgotDesc')) ?></p>
      <form method="post" action="<?= e(url('/auth/forgot-password')) ?>">
        <?= csrf_field() ?>
        <div class="field">
          <label for="email"><?= e(t('auth.email')) ?></label>
          <input class="input <?= err($errors,'email') ? 'is-invalid' : '' ?>" type="email" id="email" name="email" value="<?= e(old('email')) ?>" required>
        </div>
        <?php require VLC_ROOT . '/views/partials/captcha.php'; ?>
        <button class="btn btn-primary btn-block" type="submit"><?= e(t('auth.sendResetLink')) ?></button>
      </form>
    <?php endif; ?>
  </div></div>
</div>

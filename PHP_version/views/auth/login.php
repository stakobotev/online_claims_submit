<?php
use App\GoogleOAuth;
/** @var array $errors @var string $from */
?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body">
    <h1><?= e(t('nav.login')) ?></h1>

    <?php if (!empty($reset)): ?>
      <div class="alert alert-success"><?= e(t('auth.passwordResetSuccess')) ?></div>
    <?php endif; ?>
    <?php if (!empty($oauthError)): ?>
      <div class="alert alert-error"><?= e(t('auth.oauthError')) ?></div>
    <?php endif; ?>

    <?php require VLC_ROOT . '/views/partials/form_errors.php'; ?>

    <form method="post" action="<?= e(url('/auth/login')) ?>">
      <?= csrf_field() ?>
      <input type="hidden" name="from" value="<?= e($from ?? '') ?>">
      <div class="field">
        <label for="email"><?= e(t('auth.email')) ?></label>
        <input class="input <?= !empty($errors) ? 'is-invalid' : '' ?>" type="email" id="email" name="email" value="<?= e(old('email')) ?>" required>
      </div>
      <div class="field">
        <label for="password"><?= e(t('auth.password')) ?></label>
        <input class="input <?= !empty($errors) ? 'is-invalid' : '' ?>" type="password" id="password" name="password" required>
      </div>
      <div class="spread">
        <a class="small" href="<?= e(url('/auth/forgot-password')) ?>"><?= e(t('auth.forgotPassword')) ?></a>
      </div>
      <button class="btn btn-primary btn-block mt" type="submit"><?= e(t('nav.login')) ?></button>
    </form>

    <?php if (GoogleOAuth::configured()): ?>
      <div class="mt2 small muted" style="text-align:center"><?= e(t('auth.orContinueWith')) ?></div>
      <a class="btn btn-secondary btn-block mt" href="<?= e(url('/auth/oauth/google?from=' . rawurlencode($from ?? '/'))) ?>">Google</a>
    <?php endif; ?>

    <p class="small muted mt2"><?= e(t('auth.noAccount')) ?>
      <a href="<?= e(url('/auth/register')) ?>"><?= e(t('nav.register')) ?></a>
    </p>
  </div></div>
</div>

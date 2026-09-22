<?php
use App\GoogleOAuth;
/** @var array $errors */
?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body">
    <h1><?= e(t('auth.createAccount')) ?></h1>

    <?php require VLC_ROOT . '/views/partials/form_errors.php'; ?>

    <form method="post" action="<?= e(url('/auth/register')) ?>">
      <?= csrf_field() ?>
      <div class="field">
        <label for="email"><?= e(t('auth.email')) ?> <span class="req">*</span></label>
        <input class="input <?= err($errors,'email') ? 'is-invalid' : '' ?>" type="email" id="email" name="email" value="<?= e(old('email')) ?>" required>
        <?php if (err($errors,'email')): ?><div class="error"><?= e($errors['email']) ?></div><?php endif; ?>
      </div>
      <div class="field">
        <label for="name"><?= e(t('auth.name')) ?> <span class="req">*</span></label>
        <input class="input <?= err($errors,'name') ? 'is-invalid' : '' ?>" id="name" name="name" value="<?= e(old('name')) ?>" required>
        <?php if (err($errors,'name')): ?><div class="error"><?= e($errors['name']) ?></div><?php endif; ?>
      </div>
      <div class="field">
        <label for="password"><?= e(t('auth.password')) ?> <span class="req">*</span></label>
        <input class="input <?= err($errors,'password') ? 'is-invalid' : '' ?>" type="password" id="password" name="password" required>
        <?php if (err($errors,'password')): ?>
          <div class="error"><?= e($errors['password']) ?></div>
        <?php else: ?>
          <div class="hint"><?= e(t('auth.passwordHint')) ?></div>
        <?php endif; ?>
      </div>
      <div class="field">
        <label for="passwordConfirmation"><?= e(t('auth.passwordConfirmation')) ?> <span class="req">*</span></label>
        <input class="input <?= err($errors,'passwordConfirmation') ? 'is-invalid' : '' ?>" type="password" id="passwordConfirmation" name="passwordConfirmation" required>
        <?php if (err($errors,'passwordConfirmation')): ?><div class="error"><?= e($errors['passwordConfirmation']) ?></div><?php endif; ?>
      </div>

      <div class="field">
        <label class="check">
          <input type="checkbox" name="terms" value="1">
          <span><?= e(t('auth.agreeTerms')) ?>
            <a href="<?= e(url('/terms')) ?>" target="_blank"><?= e(t('nav.terms')) ?></a>
            <?= e(t('auth.and')) ?>
            <a href="<?= e(url('/privacy')) ?>" target="_blank"><?= e(t('nav.privacy')) ?></a>
          </span>
        </label>
        <?php if (err($errors,'terms')): ?><div class="error"><?= e($errors['terms']) ?></div><?php endif; ?>
      </div>
      <div class="field">
        <label class="check">
          <input type="checkbox" name="marketing" value="1">
          <span><?= e(t('auth.marketing')) ?></span>
        </label>
      </div>

      <?php require VLC_ROOT . '/views/partials/captcha.php'; ?>

      <button class="btn btn-primary btn-block" type="submit"><?= e(t('auth.registerAction')) ?></button>
    </form>

    <?php if (GoogleOAuth::configured()): ?>
      <div class="mt2 small muted" style="text-align:center"><?= e(t('auth.orContinueWith')) ?></div>
      <a class="btn btn-secondary btn-block mt" href="<?= e(url('/auth/oauth/google')) ?>">Google</a>
    <?php endif; ?>

    <p class="small muted mt2"><?= e(t('auth.alreadyHaveAccount')) ?>
      <a href="<?= e(url('/auth/login')) ?>"><?= e(t('nav.login')) ?></a>
    </p>
  </div></div>
</div>

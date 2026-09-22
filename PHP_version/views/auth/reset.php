<?php /** @var string $token @var array $errors */ ?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body">
    <h1><?= e(t('auth.resetPassword')) ?></h1>
    <?php require VLC_ROOT . '/views/partials/form_errors.php'; ?>
    <form method="post" action="<?= e(url('/auth/reset-password')) ?>">
      <?= csrf_field() ?>
      <input type="hidden" name="token" value="<?= e($token) ?>">
      <div class="field">
        <label for="password"><?= e(t('auth.newPassword')) ?></label>
        <input class="input <?= err($errors,'password') ? 'is-invalid' : '' ?>" type="password" id="password" name="password" required>
        <div class="hint"><?= e(t('auth.passwordHint')) ?></div>
        <?php if (err($errors,'password')): ?><div class="error"><?= e($errors['password']) ?></div><?php endif; ?>
      </div>
      <div class="field">
        <label for="passwordConfirmation"><?= e(t('auth.passwordConfirmation')) ?></label>
        <input class="input <?= err($errors,'passwordConfirmation') ? 'is-invalid' : '' ?>" type="password" id="passwordConfirmation" name="passwordConfirmation" required>
        <?php if (err($errors,'passwordConfirmation')): ?><div class="error"><?= e($errors['passwordConfirmation']) ?></div><?php endif; ?>
      </div>
      <button class="btn btn-primary btn-block" type="submit"><?= e(t('auth.resetPassword')) ?></button>
    </form>
  </div></div>
</div>

<?php
/** Renders the hCaptcha widget when configured. Include inside a <form>. */
use App\Captcha;
if (Captcha::enabled()):
?>
  <div class="field">
    <div class="h-captcha" data-sitekey="<?= e(Captcha::siteKey()) ?>"></div>
    <?php if (!empty($errors['captcha'])): ?>
      <div class="error"><?= e($errors['captcha']) ?></div>
    <?php endif; ?>
  </div>
  <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
<?php endif; ?>

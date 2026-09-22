<?php
/**
 * Top-of-form error banner. Shows a form-level message ($errors['_form']) if
 * present, otherwise a generic "correct the fields below" when any field has an
 * error. Include inside a form view; relies on $errors being in scope.
 */
if (!empty($errors)):
?>
  <div class="alert alert-error"><?= e($errors['_form'] ?? t('errors.checkForm')) ?></div>
<?php endif; ?>

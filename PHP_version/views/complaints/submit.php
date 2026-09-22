<?php
/** @var array $categories @var array $institutions @var int $minBody
 *  @var int $maxFiles @var int $maxBytes @var bool $captcha @var array $errors */
?>
<div class="container narrow mt2 mb">
  <h1><?= e(t('complaint.submitTitle')) ?></h1>
  <p class="muted"><?= e(t('complaint.submitDesc')) ?></p>

  <div class="card"><div class="card-body">
    <?php require VLC_ROOT . '/views/partials/form_errors.php'; ?>

    <form method="post" action="<?= e(url('/complaints/submit')) ?>" enctype="multipart/form-data">
      <?= csrf_field() ?>

      <div class="field">
        <label for="categoryId"><?= e(t('complaint.category')) ?> <span class="req">*</span></label>
        <select class="select <?= err($errors,'categoryId') ? 'is-invalid' : '' ?>" id="categoryId" name="categoryId" required>
          <option value=""><?= e(t('complaint.selectCategory')) ?></option>
          <?php foreach ($categories as $c): ?>
            <option value="<?= e($c['id']) ?>" <?= old('categoryId') === $c['id'] ? 'selected' : '' ?>>
              <?= e(t('category.' . $c['id']) !== 'category.' . $c['id'] ? t('category.' . $c['id']) : $c['name']) ?>
            </option>
          <?php endforeach; ?>
        </select>
        <?php if (err($errors,'categoryId')): ?><div class="error"><?= e($errors['categoryId']) ?></div><?php endif; ?>
      </div>

      <div class="field">
        <label for="institutionId"><?= e(t('complaint.institution')) ?></label>
        <select class="select" id="institutionId" name="institutionId">
          <option value=""><?= e(t('complaint.selectInstitution')) ?></option>
          <?php foreach ($institutions as $i): ?>
            <option value="<?= e($i['id']) ?>" data-category="<?= e($i['categoryId']) ?>" <?= old('institutionId') === $i['id'] ? 'selected' : '' ?>>
              <?= e($i['name']) ?>
            </option>
          <?php endforeach; ?>
        </select>
        <div class="hint"><?= e(t('complaint.switchToFreeText')) ?>:</div>
        <input class="input mt" name="institutionFreeText" value="<?= e(old('institutionFreeText')) ?>"
               placeholder="<?= e(t('complaint.institutionFreeTextPlaceholder')) ?>">
        <?php if (err($errors,'institution')): ?><div class="error"><?= e($errors['institution']) ?></div><?php endif; ?>
      </div>

      <div class="field">
        <label for="title"><?= e(t('complaint.title')) ?> <span class="req">*</span></label>
        <input class="input <?= err($errors,'title') ? 'is-invalid' : '' ?>" id="title" name="title" value="<?= e(old('title')) ?>"
               placeholder="<?= e(t('complaint.titlePlaceholder')) ?>" required>
        <?php if (err($errors,'title')): ?><div class="error"><?= e($errors['title']) ?></div><?php endif; ?>
      </div>

      <div class="field">
        <label for="body"><?= e(t('complaint.body')) ?> <span class="req">*</span></label>
        <textarea class="textarea <?= err($errors,'body') ? 'is-invalid' : '' ?>" id="body" name="body"
                  placeholder="<?= e(t('complaint.bodyPlaceholder')) ?>" required><?= e(old('body')) ?></textarea>
        <div class="hint"><?= e(t('complaint.bodyHint', ['min' => $minBody])) ?></div>
        <?php if (err($errors,'body')): ?><div class="error"><?= e($errors['body']) ?></div><?php endif; ?>
      </div>

      <div class="field">
        <label class="check"><input type="checkbox" name="urgent" value="1" <?= old('urgent') ? 'checked' : '' ?>> <span><?= e(t('complaint.urgent')) ?></span></label>
      </div>

      <fieldset style="border:1px solid var(--gray-200);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
        <legend class="small muted"><?= e(t('complaint.contactOptional')) ?></legend>
        <div class="field">
          <label for="contactName"><?= e(t('complaint.contactName')) ?></label>
          <input class="input" id="contactName" name="contactName" value="<?= e(old('contactName')) ?>" placeholder="<?= e(t('complaint.contactNamePlaceholder')) ?>">
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="contactEmail"><?= e(t('complaint.contactEmail')) ?></label>
          <input class="input <?= err($errors,'contactEmail') ? 'is-invalid' : '' ?>" type="email" id="contactEmail" name="contactEmail" value="<?= e(old('contactEmail')) ?>">
          <?php if (err($errors,'contactEmail')): ?><div class="error"><?= e($errors['contactEmail']) ?></div><?php endif; ?>
        </div>
      </fieldset>

      <div class="field">
        <label for="attachments"><?= e(t('complaint.attachments')) ?></label>
        <input class="input" type="file" id="attachments" name="attachments[]" multiple
               accept="application/pdf,image/bmp,image/jpeg,image/png,image/tiff">
        <div class="hint"><?= e(t('dropzone.hint', ['max' => $maxFiles, 'size' => human_bytes($maxBytes)])) ?></div>
        <?php if (err($errors,'attachments')): ?><div class="error"><?= e($errors['attachments']) ?></div><?php endif; ?>
      </div>

      <?php if ($captcha): require VLC_ROOT . '/views/partials/captcha.php'; endif; ?>

      <button class="btn btn-primary btn-block" type="submit"><?= e(t('actions.submit')) ?></button>
    </form>
  </div></div>
</div>

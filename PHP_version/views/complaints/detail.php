<?php /** @var array $c */ ?>
<div class="container mt2 mb">
  <a class="small" href="<?= e(url('/complaints')) ?>">&larr; <?= e(t('actions.back')) ?></a>
  <div class="spread mt mb">
    <div>
      <span class="mono"><?= e($c['publicId']) ?></span>
      <h1 style="margin-top:.25rem"><?= e($c['title']) ?></h1>
    </div>
    <span class="badge badge-<?= e(status_variant($c['status'])) ?>"><?= e(t('status.' . $c['status'])) ?></span>
  </div>

  <div class="card"><div class="card-body">
    <h3><?= e(t('complaint.details')) ?></h3>
    <div class="row" style="gap:2rem">
      <div><div class="small muted"><?= e(t('complaint.category')) ?></div>
        <div><?= e(t('category.' . $c['categoryId']) !== 'category.' . $c['categoryId'] ? t('category.' . $c['categoryId']) : $c['categoryName']) ?></div></div>
      <div><div class="small muted"><?= e(t('complaint.institution')) ?></div>
        <div><?= e($c['institutionName'] ?: ($c['institutionFreeText'] ?: '—')) ?></div></div>
      <div><div class="small muted"><?= e(t('complaint.submitted')) ?></div>
        <div><?= e(fmt_date($c['createdAt'], true)) ?></div></div>
      <div><div class="small muted"><?= e(t('complaint.type')) ?></div>
        <div><?= e($c['submissionType']) ?></div></div>
    </div>

    <h3 class="mt2"><?= e(t('complaint.body')) ?></h3>
    <p style="white-space:pre-wrap"><?= e($c['body']) ?></p>

    <?php if (!empty($c['attachments'])): ?>
      <h3 class="mt2"><?= e(t('complaint.attachments')) ?></h3>
      <ul>
        <?php foreach ($c['attachments'] as $a): ?>
          <li>
            <a href="<?= e(url('/attachments/' . rawurlencode($a['id']))) ?>"><?= e($a['originalFilename']) ?></a>
            <span class="small muted">(<?= e(human_bytes((int) $a['size'])) ?>)</span>
          </li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
  </div></div>
</div>

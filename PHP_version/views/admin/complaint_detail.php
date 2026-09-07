<?php /** @var array $c @var array $events */ ?>
<a class="small" href="<?= e(url('/admin/complaints')) ?>">&larr; <?= e(t('actions.back')) ?></a>
<div class="spread mt mb">
  <div>
    <span class="mono"><?= e($c['publicId']) ?></span>
    <h1 style="margin-top:.25rem"><?= e($c['title']) ?></h1>
  </div>
  <span class="badge badge-<?= e(status_variant($c['status'])) ?>"><?= e(t('status.' . $c['status'])) ?></span>
</div>

<div class="card"><div class="card-body">
  <div class="row" style="gap:2rem">
    <div><div class="small muted"><?= e(t('complaint.category')) ?></div><div><?= e($c['categoryName']) ?></div></div>
    <div><div class="small muted"><?= e(t('complaint.institution')) ?></div><div><?= e($c['institutionName'] ?: ($c['institutionFreeText'] ?: '—')) ?></div></div>
    <div><div class="small muted"><?= e(t('complaint.type')) ?></div><div><?= e($c['submissionType']) ?></div></div>
    <div><div class="small muted"><?= e(t('complaint.submitted')) ?></div><div><?= e(fmt_date($c['createdAt'], true)) ?></div></div>
    <div><div class="small muted"><?= e(t('complaint.contactEmail')) ?></div><div><?= e($c['contactEmail'] ?: '—') ?></div></div>
  </div>

  <h3 class="mt2"><?= e(t('complaint.body')) ?></h3>
  <p style="white-space:pre-wrap"><?= e($c['body']) ?></p>

  <?php if (!empty($c['attachments'])): ?>
    <h3 class="mt2"><?= e(t('complaint.attachments')) ?></h3>
    <ul>
      <?php foreach ($c['attachments'] as $a): ?>
        <li><a href="<?= e(url('/attachments/' . rawurlencode($a['id']))) ?>"><?= e($a['originalFilename']) ?></a>
          <span class="small muted">(<?= e(human_bytes((int) $a['size'])) ?>)</span></li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>
</div></div>

<!-- Actions -->
<?php if ($c['status'] === 'pending_review'): ?>
  <div class="card"><div class="card-body">
    <div class="row">
      <form method="post" action="<?= e(url('/admin/complaints/' . rawurlencode($c['publicId']) . '/approve')) ?>">
        <?= csrf_field() ?>
        <button class="btn btn-primary" type="submit"><?= e(t('admin.approve')) ?></button>
      </form>
      <form method="post" action="<?= e(url('/admin/complaints/' . rawurlencode($c['publicId']) . '/reject')) ?>" style="flex:1;min-width:260px">
        <?= csrf_field() ?>
        <div class="field" style="margin-bottom:.5rem">
          <label for="reason"><?= e(t('admin.rejectReason')) ?></label>
          <textarea class="textarea" id="reason" name="reason" rows="3" style="min-height:80px"></textarea>
        </div>
        <button class="btn btn-danger" type="submit"><?= e(t('admin.reject')) ?></button>
      </form>
    </div>
  </div></div>
<?php elseif ($c['status'] === 'forwarded'): ?>
  <div class="card"><div class="card-body">
    <form method="post" action="<?= e(url('/admin/complaints/' . rawurlencode($c['publicId']) . '/close')) ?>">
      <?= csrf_field() ?>
      <button class="btn btn-primary" type="submit"><?= e(t('admin.close')) ?></button>
    </form>
  </div></div>
<?php endif; ?>

<!-- Timeline -->
<?php if (!empty($events)): ?>
  <div class="card"><div class="card-body">
    <h3><?= e(t('admin.timeline')) ?></h3>
    <ul class="timeline mt">
      <?php foreach ($events as $ev): ?>
        <li>
          <strong><?= e($ev['event']) ?></strong>
          <span class="small muted">· <?= e(fmt_date($ev['at'], true)) ?></span>
          <?php if (!empty($ev['actorEmail'])): ?><span class="small muted">· <?= e($ev['actorName'] ?: $ev['actorEmail']) ?></span><?php endif; ?>
          <?php
            $meta = json_decode((string) ($ev['metadata'] ?? '{}'), true);
            if (!empty($meta['reason'])): ?>
            <div class="small muted"><?= e($meta['reason']) ?></div>
          <?php endif; ?>
        </li>
      <?php endforeach; ?>
    </ul>
  </div></div>
<?php endif; ?>

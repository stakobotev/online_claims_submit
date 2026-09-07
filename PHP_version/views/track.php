<?php /** @var ?array $complaint @var bool $notFound */ ?>
<div class="container narrow mt2 mb">
  <h1><?= e(t('track.title')) ?></h1>

  <div class="card mb"><div class="card-body">
    <form method="get" action="<?= e(url('/track')) ?>">
      <div class="field">
        <label for="publicId"><?= e(t('track.inputLabel')) ?></label>
        <input class="input" id="publicId" name="publicId" value="<?= e($query ?? '') ?>"
               placeholder="<?= e(t('track.placeholder')) ?>">
      </div>
      <button class="btn btn-primary" type="submit"><?= e(t('track.action')) ?></button>
    </form>
  </div></div>

  <?php if ($notFound): ?>
    <div class="alert alert-warning"><?= e(t('track.notFound')) ?></div>
  <?php elseif ($complaint): ?>
    <?php
      $status = $complaint['status'];
      $isRejected = $status === 'rejected';
      $order = ['submitted', 'pending_review', 'forwarded', 'closed'];
      $rank = ['submitted' => 0, 'pending_review' => 1, 'approved' => 2, 'forwarded' => 2, 'closed' => 3, 'rejected' => 1];
      $current = $rank[$status] ?? 0;
    ?>
    <div class="card"><div class="card-body">
      <div class="spread mb">
        <span class="mono"><?= e($complaint['publicId']) ?></span>
        <span class="badge badge-<?= e(status_variant($status)) ?>"><?= e(t('status.' . $status)) ?></span>
      </div>
      <h2><?= e($complaint['title']) ?></h2>
      <p class="small muted"><?= e(t('complaint.submitted')) ?>: <?= e(fmt_date($complaint['createdAt'])) ?></p>

      <ul class="timeline mt">
        <?php if ($isRejected): ?>
          <li><?= e(t('status.submitted')) ?></li>
          <li><?= e(t('status.pending_review')) ?></li>
          <li><strong><?= e(t('status.rejected')) ?></strong></li>
        <?php else: ?>
          <?php foreach ($order as $step):
              $reached = ($rank[$step] ?? 99) <= $current;
          ?>
            <li style="<?= $reached ? '' : 'opacity:.5' ?>">
              <?= $reached ? '✓ ' : '' ?><?= e(t('status.' . $step)) ?>
            </li>
          <?php endforeach; ?>
        <?php endif; ?>
      </ul>
    </div></div>
  <?php endif; ?>
</div>

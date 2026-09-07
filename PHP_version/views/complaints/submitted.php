<?php /** @var string $publicId @var string $status */ ?>
<div class="container narrow mt2 mb">
  <div class="card"><div class="card-body" style="text-align:center">
    <span class="badge badge-success"><?= e(t('status.' . $status)) ?></span>
    <h1 class="mt"><?= e(t('complaint.submitted.title')) ?></h1>
    <p class="muted">
      <?= $status === 'pending_review' ? e(t('complaint.submitted.anonymous')) : e(t('complaint.submitted.authorized')) ?>
    </p>
    <p class="mono mt" style="font-size:1.25rem"><?= e($publicId) ?></p>
    <div class="row mt2" style="justify-content:center">
      <a class="btn btn-primary" href="<?= e(url('/track/' . rawurlencode($publicId))) ?>"><?= e(t('complaint.submitted.track')) ?></a>
      <a class="btn btn-secondary" href="<?= e(url('/complaints/submit')) ?>"><?= e(t('complaint.submitted.another')) ?></a>
    </div>
  </div></div>
</div>

<?php /* Landing page — faithful port of the approved "Жажда за живот" mockup. */ ?>

<!-- Hero: report intro + track card -->
<section class="hero">
  <div class="container lp-hero-grid">
    <div>
      <h1><?= e(t('home.hero.title')) ?></h1>
      <p class="lp-lead"><?= e(t('home.hero.lead')) ?></p>
      <div class="row">
        <a class="btn btn-primary" href="<?= e(url('/complaints/submit')) ?>">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          <?= e(t('home.cta.submit')) ?>
        </a>
        <a class="btn btn-secondary" href="#works">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <?= e(t('home.cta.how')) ?>
        </a>
      </div>
    </div>

    <div class="card lp-hero-card" id="track">
      <div class="card-body">
        <h2><?= e(t('home.track.title')) ?></h2>
        <p class="muted small"><?= e(t('home.track.desc')) ?></p>
        <form method="get" action="<?= e(url('/track')) ?>" class="lp-field-row">
          <input class="input" name="publicId" placeholder="<?= e(t('home.track.placeholder')) ?>" aria-label="<?= e(t('home.track.title')) ?>">
          <button class="btn btn-accent" type="submit"><?= e(t('home.track.action')) ?></button>
        </form>
        <div class="lp-note"><?= e(t('home.track.note')) ?></div>
      </div>
    </div>
  </div>
</section>

<!-- 112 emergency warning -->
<div class="container">
  <div class="lp-warning">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    <div><strong><?= e(t('home.emergency.title')) ?></strong><br><?= e(t('home.emergency.body')) ?></div>
  </div>
</div>

<!-- How it works: 5 steps -->
<section class="lp-section" id="works">
  <div class="container">
    <h2><?= e(t('home.howItWorks.title')) ?></h2>
    <p class="muted lp-intro"><?= e(t('home.howItWorks.intro')) ?></p>
    <div class="lp-steps">
      <?php for ($i = 1; $i <= 5; $i++): ?>
        <article class="step">
          <div class="n"><?= $i ?></div>
          <h3><?= e(t("home.step{$i}.title")) ?></h3>
          <p class="muted small"><?= e(t("home.step{$i}.desc")) ?></p>
        </article>
      <?php endfor; ?>
    </div>
  </div>
</section>

<!-- Help band -->
<div class="container">
  <section class="lp-help">
    <div>
      <h2><?= e(t('home.help.title')) ?></h2>
      <p><?= e(t('home.help.body')) ?></p>
    </div>
    <a class="btn" href="<?= e(url('/about')) ?>">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.98.36 1.94.7 2.86a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.22-1.27a2 2 0 0 1 2.11-.45c.92.34 1.88.57 2.86.7A2 2 0 0 1 22 16.92Z"/></svg>
      <?= e(t('home.help.action')) ?>
    </a>
  </section>
</div>

<!-- Funding / partners strip -->
<section class="lp-funding">
  <div class="container lp-funding-grid">
    <div class="lp-project">
      <strong><?= e(t('home.funding.title')) ?></strong>
      <?= e(t('home.funding.text')) ?>
    </div>
    <div class="lp-logo-row" aria-label="<?= e(t('home.funding.title')) ?>">
      <div class="lp-partner-logo">
        <img src="<?= e(url('/assets/img/tfl_logo.jpg')) ?>" alt="Жажда за живот — Thirst for Life">
      </div>
      <div class="lp-partner-logo">
        <img src="<?= e(url('/assets/img/logo_p2_0.png')) ?>" alt="Швейцарско-българска програма за сътрудничество">
      </div>
      <div class="lp-partner-logo">
        <img src="<?= e(url('/assets/img/logo_p2_1.png')) ?>" alt="Swiss-Bulgarian Cooperation Programme">
      </div>
    </div>
  </div>
  <div class="container">
    <p class="lp-disclaimer"><?= e(t('home.funding.disclaimer')) ?></p>
  </div>
</section>

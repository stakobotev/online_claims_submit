<?php
declare(strict_types=1);

namespace App\Controllers;

final class HomeController
{
    public function index(array $params): void
    {
        // Landing page mirrors the approved mockup; it renders static marketing
        // content + a track form, so no data fetch is required here.
        view('home', ['title' => t('nav.home')]);
    }
}

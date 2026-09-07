<?php
declare(strict_types=1);

namespace App\Controllers;

final class PageController
{
    public function about(array $params): void
    {
        view('pages/about', ['title' => t('about.title')]);
    }

    public function privacy(array $params): void
    {
        view('pages/privacy', ['title' => t('privacy.title')]);
    }

    public function terms(array $params): void
    {
        view('pages/terms', ['title' => t('terms.title')]);
    }
}

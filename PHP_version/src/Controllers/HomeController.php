<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\Statistics;
use App\Repo\Categories;

final class HomeController
{
    public function index(array $params): void
    {
        $stats = Statistics::summary();
        $categories = Categories::map();
        view('home', [
            'title' => t('nav.home'),
            'stats' => $stats,
            'categories' => $categories,
        ]);
    }
}

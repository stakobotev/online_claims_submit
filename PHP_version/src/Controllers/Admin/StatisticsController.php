<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Auth;
use App\Audit;
use App\Pdf;
use App\Services\Statistics;
use App\Repo\Categories;

final class StatisticsController
{
    public function index(array $params): void
    {
        Auth::requireAdmin();
        $from = (string) ($_GET['from'] ?? '');
        $to = (string) ($_GET['to'] ?? '');
        view('admin/statistics', [
            'title' => t('admin.nav.statistics'),
            'detail' => Statistics::detail($from ?: null, $to ?: null),
            'categories' => Categories::map(),
            'from' => $from,
            'to' => $to,
        ], 'admin');
    }

    public function export(array $params): void
    {
        $admin = Auth::requireAdmin();
        $format = ($_GET['format'] ?? 'csv') === 'pdf' ? 'pdf' : 'csv';
        $from = (string) ($_GET['from'] ?? '') ?: null;
        $to = (string) ($_GET['to'] ?? '') ?: null;
        $rows = Statistics::exportRows($from, $to);
        $columns = ['publicId', 'status', 'categoryId', 'submissionType', 'urgent', 'createdAt', 'forwardedAt', 'closedAt'];

        Audit::log('admin.statistics.exported', $admin['id'], null, ['format' => $format, 'count' => count($rows)]);

        if ($format === 'pdf') {
            $pdf = new Pdf('Vallentin Claims — Statistics Export');
            $pdf->line('Generated: ' . date('Y-m-d H:i'));
            $pdf->line(str_repeat('-', 90));
            $pdf->line(implode('  ', $columns));
            foreach ($rows as $r) {
                $vals = array_map(static fn ($c) => (string) ($r[$c] ?? ''), $columns);
                $pdf->line(implode('  ', $vals));
            }
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="statistics.pdf"');
            echo $pdf->output();
            exit;
        }

        // CSV
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="statistics.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, $columns);
        foreach ($rows as $r) {
            fputcsv($out, array_map(static fn ($c) => $r[$c] ?? '', $columns));
        }
        fclose($out);
        exit;
    }
}

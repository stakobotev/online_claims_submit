<?php
declare(strict_types=1);

namespace App;

/**
 * Minimal, dependency-free PDF writer for simple tabular text reports.
 * Produces multi-page documents using the built-in Helvetica font. This
 * replaces PDFKit for the statistics export on hosts without Composer.
 */
final class Pdf
{
    private array $pages = [];
    private string $current = '';
    private int $y = 0;

    private const PAGE_W = 595;   // A4 in points
    private const PAGE_H = 842;
    private const MARGIN = 40;
    private const LINE = 16;

    public function __construct(private string $title = 'Report')
    {
        $this->newPage();
        $this->heading($this->title);
    }

    public function heading(string $text): void
    {
        $this->ensureSpace();
        $this->current .= "BT /F1 16 Tf " . self::MARGIN . " {$this->y} Td (" . self::esc($text) . ") Tj ET\n";
        $this->y -= self::LINE + 6;
    }

    public function line(string $text): void
    {
        $this->ensureSpace();
        $this->current .= "BT /F1 10 Tf " . self::MARGIN . " {$this->y} Td (" . self::esc($text) . ") Tj ET\n";
        $this->y -= self::LINE;
    }

    private function ensureSpace(): void
    {
        if ($this->y < self::MARGIN + self::LINE) {
            $this->flushPage();
            $this->newPage();
        }
    }

    private function newPage(): void
    {
        $this->current = '';
        $this->y = self::PAGE_H - self::MARGIN;
    }

    private function flushPage(): void
    {
        $this->pages[] = $this->current;
        $this->current = '';
    }

    public function output(): string
    {
        $this->flushPage();

        $objects = [];
        $fontObj = 3 + count($this->pages) * 2; // font after page/content objects

        // 1: Catalog, 2: Pages
        $kids = [];
        $objNum = 3;
        $body = [];

        foreach ($this->pages as $content) {
            $contentObj = $objNum + 1;
            $pageObj = $objNum;
            $kids[] = "{$pageObj} 0 R";
            $body[$pageObj] =
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " . self::PAGE_W . " " . self::PAGE_H . "] "
                . "/Resources << /Font << /F1 {$fontObj} 0 R >> >> /Contents {$contentObj} 0 R >>";
            $stream = $content;
            $body[$contentObj] = "<< /Length " . strlen($stream) . " >>\nstream\n{$stream}\nendstream";
            $objNum += 2;
        }

        $body[1] = "<< /Type /Catalog /Pages 2 0 R >>";
        $body[2] = "<< /Type /Pages /Count " . count($this->pages) . " /Kids [" . implode(' ', $kids) . "] >>";
        $body[$fontObj] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

        ksort($body);
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($body as $num => $obj) {
            $offsets[$num] = strlen($pdf);
            $pdf .= "{$num} 0 obj\n{$obj}\nendobj\n";
        }
        $xrefPos = strlen($pdf);
        $count = max(array_keys($body)) + 1;
        $pdf .= "xref\n0 {$count}\n0000000000 65535 f \n";
        for ($i = 1; $i < $count; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i] ?? 0);
        }
        $pdf .= "trailer\n<< /Size {$count} /Root 1 0 R >>\nstartxref\n{$xrefPos}\n%%EOF";
        return $pdf;
    }

    private static function esc(string $s): string
    {
        // PDF text strings: escape backslash and parentheses; drop non-ASCII.
        $s = preg_replace('/[^\x20-\x7e]/', '?', $s) ?? $s;
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);
    }
}

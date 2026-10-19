<?php

namespace App\Support;

final class ProfessionalPdf
{
    private const PAGE_WIDTH = 595.28;

    private const PAGE_HEIGHT = 841.89;

    private string $content = '';

    private float $cursorY = 132.0;

    private ?array $logo = null;

    public function __construct(private readonly string $documentTitle, ?string $logoPath = null)
    {
        $logoPath ??= function_exists('public_path')
            ? public_path('admin/assets/images/aryan_gold_favicon.png')
            : null;
        $this->logo = $logoPath === null ? null : $this->loadPng($logoPath);
        $this->drawHeader();
    }

    public function heading(string $text, ?string $subtitle = null): self
    {
        $this->text($text, 54, $this->cursorY, 19, true, [0.0, 0.416, 0.392]);
        $this->cursorY += 28;

        if ($subtitle !== null && trim($subtitle) !== '') {
            $this->text($subtitle, 54, $this->cursorY, 9.5, false, [0.38, 0.43, 0.41]);
            $this->cursorY += 22;
        }

        $this->line(54, $this->cursorY, self::PAGE_WIDTH - 54, $this->cursorY, [0.961, 0.761, 0.106], 1.2);
        $this->cursorY += 24;

        return $this;
    }

    public function metadata(array $items): self
    {
        $items = array_values($items);
        $columns = 2;
        $cellWidth = (self::PAGE_WIDTH - 108) / $columns;
        $rows = (int) ceil(count($items) / $columns);
        $height = max(50, $rows * 38 + 12);

        $this->rect(54, $this->cursorY, self::PAGE_WIDTH - 108, $height, [0.965, 0.972, 0.968], null, 7);

        foreach ($items as $index => $item) {
            $column = $index % $columns;
            $row = intdiv($index, $columns);
            $x = 67 + ($column * $cellWidth);
            $y = $this->cursorY + 18 + ($row * 38);
            $this->text((string) ($item['label'] ?? ''), $x, $y, 8, true, [0.45, 0.49, 0.47]);
            $this->text((string) ($item['value'] ?? '--'), $x, $y + 14, 10.5, true, [0.10, 0.18, 0.15]);
        }

        $this->cursorY += $height + 22;

        return $this;
    }

    public function salutation(string $name): self
    {
        $this->text('Dear '.$name.',', 54, $this->cursorY, 11, true, [0.12, 0.15, 0.14]);
        $this->cursorY += 24;

        return $this;
    }

    public function paragraph(string $text): self
    {
        foreach ($this->wrap($text, 94) as $line) {
            $this->text($line, 54, $this->cursorY, 10.5, false, [0.18, 0.21, 0.20]);
            $this->cursorY += 16;
        }

        $this->cursorY += 9;

        return $this;
    }

    public function sectionTitle(string $text): self
    {
        $this->cursorY += 2;
        $this->text(strtoupper($text), 54, $this->cursorY, 9, true, [0.58, 0.43, 0.08]);
        $this->cursorY += 17;

        return $this;
    }

    public function table(array $headers, array $rows, array $widths, array $alignments = []): self
    {
        $x = 54.0;
        $rowHeight = 24.0;
        $totalWidth = array_sum($widths);

        $this->rect($x, $this->cursorY, $totalWidth, $rowHeight, [0.0, 0.416, 0.392]);
        $cellX = $x;
        foreach ($headers as $index => $header) {
            $this->cellText((string) $header, $cellX, $this->cursorY, (float) $widths[$index], $rowHeight, 8.5, true, [1, 1, 1], $alignments[$index] ?? 'left');
            $cellX += (float) $widths[$index];
        }
        $this->cursorY += $rowHeight;

        foreach (array_values($rows) as $rowIndex => $row) {
            $fill = $rowIndex % 2 === 0 ? [0.98, 0.98, 0.97] : [0.94, 0.96, 0.95];
            $this->rect($x, $this->cursorY, $totalWidth, $rowHeight, $fill, [0.84, 0.87, 0.85]);
            $cellX = $x;
            foreach (array_values($row) as $index => $value) {
                $this->cellText((string) $value, $cellX, $this->cursorY, (float) $widths[$index], $rowHeight, 9, false, [0.16, 0.19, 0.18], $alignments[$index] ?? 'left');
                $cellX += (float) $widths[$index];
            }
            $this->cursorY += $rowHeight;
        }

        $this->cursorY += 18;

        return $this;
    }

    public function callout(string $label, string $value): self
    {
        $this->rect(54, $this->cursorY, self::PAGE_WIDTH - 108, 43, [0.93, 0.96, 0.94], [0.961, 0.761, 0.106]);
        $this->text($label, 68, $this->cursorY + 17, 9, true, [0.38, 0.43, 0.41]);
        $this->rightText($value, self::PAGE_WIDTH - 68, $this->cursorY + 27, 15, true, [0.0, 0.416, 0.392]);
        $this->cursorY += 61;

        return $this;
    }

    public function signature(string $label = 'For Aryan Gold'): self
    {
        $this->cursorY = min($this->cursorY + 14, 690);
        $this->text('Sincerely,', 54, $this->cursorY, 10.5, false, [0.18, 0.21, 0.20]);
        $this->text($label, 54, $this->cursorY + 24, 11, true, [0.0, 0.416, 0.392]);
        $this->text('Human Resources', 54, $this->cursorY + 40, 9.5, false, [0.38, 0.43, 0.41]);

        return $this;
    }

    public function output(): string
    {
        $this->drawFooter();

        $pageResources = '/Font << /F1 4 0 R /F2 5 0 R >>';
        if ($this->logo !== null) {
            $pageResources .= ' /XObject << /ImLogo 8 0 R >>';
        }

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            sprintf(
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << %s >> /Contents 6 0 R >>',
                self::PAGE_WIDTH,
                self::PAGE_HEIGHT,
                $pageResources
            ),
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
            '<< /Length '.strlen($this->content)." >>\nstream\n".$this->content.'endstream',
            '<< /Title ('.$this->escape($this->documentTitle).') /Author (Aryan Attendance Application) /Creator (Aryan Attendance Application) >>',
        ];

        if ($this->logo !== null) {
            $softMask = $this->logo['alpha'] !== null ? ' /SMask 9 0 R' : '';
            $objects[] = sprintf(
                "<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode%s /Length %d >>\nstream\n%s\nendstream",
                $this->logo['width'],
                $this->logo['height'],
                $softMask,
                strlen($this->logo['rgb']),
                $this->logo['rgb']
            );

            if ($this->logo['alpha'] !== null) {
                $objects[] = sprintf(
                    "<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length %d >>\nstream\n%s\nendstream",
                    $this->logo['width'],
                    $this->logo['height'],
                    strlen($this->logo['alpha']),
                    $this->logo['alpha']
                );
            }
        }

        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [0];
        foreach ($objects as $number => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($number + 1)." 0 obj\n".$object."\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        $pdf .= 'trailer << /Size '.(count($objects) + 1).' /Root 1 0 R /Info 7 0 R >>'."\n";
        $pdf .= "startxref\n{$xrefOffset}\n%%EOF";

        return $pdf;
    }

    private function drawHeader(): void
    {
        $this->rect(0, 0, self::PAGE_WIDTH, 92, [0.0, 0.416, 0.392]);
        $this->rect(0, 88, self::PAGE_WIDTH, 4, [0.961, 0.761, 0.106]);

        if ($this->logo !== null) {
            $this->image('ImLogo', 52, 20, 50, 50);
        } else {
            $this->rect(52, 22, 46, 46, [0.961, 0.761, 0.106]);
            $this->text('AG', 61, 52, 16, true, [0.0, 0.416, 0.392]);
        }

        $this->text('ARYAN GOLD', 112, 42, 18, true, [1, 1, 1]);
        $this->text('EMPLOYEE DOCUMENT', 113, 59, 8, true, [0.961, 0.761, 0.106]);
        $this->rightText($this->documentTitle, self::PAGE_WIDTH - 52, 48, 10, true, [1, 1, 1]);
    }

    private function drawFooter(): void
    {
        $this->line(54, 770, self::PAGE_WIDTH - 54, 770, [0.961, 0.761, 0.106], 0.8);
        $this->text('Digitally generated through Aryan Attendance Application.', 54, 789, 8.5, true, [0.28, 0.33, 0.31]);
        $this->rightText('Verification: system generated', self::PAGE_WIDTH - 54, 789, 8, false, [0.48, 0.51, 0.50]);
        $this->text('This document does not require a physical signature.', 54, 804, 7.5, false, [0.52, 0.55, 0.54]);
    }

    private function text(string $text, float $x, float $y, float $size, bool $bold, array $color): void
    {
        $font = $bold ? 'F2' : 'F1';
        $pdfY = self::PAGE_HEIGHT - $y;
        $this->content .= sprintf(
            "BT /%s %.2F Tf %.3F %.3F %.3F rg 1 0 0 1 %.2F %.2F Tm (%s) Tj ET\n",
            $font,
            $size,
            $color[0],
            $color[1],
            $color[2],
            $x,
            $pdfY,
            $this->escape($text)
        );
    }

    private function rightText(string $text, float $rightX, float $y, float $size, bool $bold, array $color): void
    {
        $estimatedWidth = strlen($this->normalize($text)) * $size * ($bold ? 0.56 : 0.50);
        $this->text($text, max(54, $rightX - $estimatedWidth), $y, $size, $bold, $color);
    }

    private function cellText(string $text, float $x, float $y, float $width, float $height, float $size, bool $bold, array $color, string $alignment): void
    {
        $padding = 9.0;
        $textX = $x + $padding;
        if ($alignment === 'right') {
            $estimatedWidth = strlen($this->normalize($text)) * $size * ($bold ? 0.56 : 0.50);
            $textX = max($x + $padding, $x + $width - $padding - $estimatedWidth);
        }
        $this->text($text, $textX, $y + ($height / 2) + 3, $size, $bold, $color);
    }

    private function rect(float $x, float $y, float $width, float $height, ?array $fill = null, ?array $stroke = null, float $radius = 0): void
    {
        $pdfY = self::PAGE_HEIGHT - $y - $height;
        if ($fill !== null) {
            $this->content .= sprintf('%.3F %.3F %.3F rg ', $fill[0], $fill[1], $fill[2]);
        }
        if ($stroke !== null) {
            $this->content .= sprintf('%.3F %.3F %.3F RG ', $stroke[0], $stroke[1], $stroke[2]);
        }
        $operator = $fill !== null && $stroke !== null ? 'B' : ($fill !== null ? 'f' : 'S');
        $this->content .= sprintf("%.2F %.2F %.2F %.2F re %s\n", $x, $pdfY, $width, $height, $operator);
    }

    private function line(float $x1, float $y1, float $x2, float $y2, array $color, float $width): void
    {
        $this->content .= sprintf(
            "%.3F %.3F %.3F RG %.2F w %.2F %.2F m %.2F %.2F l S\n",
            $color[0],
            $color[1],
            $color[2],
            $width,
            $x1,
            self::PAGE_HEIGHT - $y1,
            $x2,
            self::PAGE_HEIGHT - $y2
        );
    }

    private function image(string $name, float $x, float $y, float $width, float $height): void
    {
        $pdfY = self::PAGE_HEIGHT - $y - $height;
        $this->content .= sprintf(
            "q %.2F 0 0 %.2F %.2F %.2F cm /%s Do Q\n",
            $width,
            $height,
            $x,
            $pdfY,
            $name
        );
    }

    private function loadPng(string $path): ?array
    {
        $png = @file_get_contents($path);
        if ($png === false || !str_starts_with($png, "\x89PNG\r\n\x1a\n")) {
            return null;
        }

        $offset = 8;
        $length = strlen($png);
        $header = null;
        $compressedPixels = '';

        while ($offset + 12 <= $length) {
            $chunkLength = unpack('Nlength', substr($png, $offset, 4))['length'];
            $chunkType = substr($png, $offset + 4, 4);
            $chunkData = substr($png, $offset + 8, $chunkLength);
            $offset += 12 + $chunkLength;

            if ($chunkType === 'IHDR') {
                $header = unpack('Nwidth/Nheight/CbitDepth/CcolorType/Ccompression/Cfilter/Cinterlace', $chunkData);
            } elseif ($chunkType === 'IDAT') {
                $compressedPixels .= $chunkData;
            } elseif ($chunkType === 'IEND') {
                break;
            }
        }

        if ($header === null
            || $header['bitDepth'] !== 8
            || !in_array($header['colorType'], [2, 6], true)
            || $header['compression'] !== 0
            || $header['filter'] !== 0
            || $header['interlace'] !== 0
            || $compressedPixels === '') {
            return null;
        }

        $pixels = @gzuncompress($compressedPixels);
        if ($pixels === false) {
            return null;
        }

        $width = (int) $header['width'];
        $height = (int) $header['height'];
        $bytesPerPixel = $header['colorType'] === 6 ? 4 : 3;
        $scanlineLength = $width * $bytesPerPixel;
        $pixelOffset = 0;
        $previousRow = array_fill(0, $scanlineLength, 0);
        $rgb = '';
        $alpha = '';
        $hasTransparency = false;

        for ($rowIndex = 0; $rowIndex < $height; $rowIndex++) {
            if ($pixelOffset + $scanlineLength + 1 > strlen($pixels)) {
                return null;
            }

            $filterType = ord($pixels[$pixelOffset]);
            $pixelOffset++;
            $filtered = unpack('C*', substr($pixels, $pixelOffset, $scanlineLength));
            $pixelOffset += $scanlineLength;
            $row = [];

            for ($index = 0; $index < $scanlineLength; $index++) {
                $left = $index >= $bytesPerPixel ? $row[$index - $bytesPerPixel] : 0;
                $up = $previousRow[$index];
                $upLeft = $index >= $bytesPerPixel ? $previousRow[$index - $bytesPerPixel] : 0;
                $predictor = match ($filterType) {
                    0 => 0,
                    1 => $left,
                    2 => $up,
                    3 => intdiv($left + $up, 2),
                    4 => $this->paeth($left, $up, $upLeft),
                    default => null,
                };

                if ($predictor === null) {
                    return null;
                }

                $row[$index] = (($filtered[$index + 1] ?? 0) + $predictor) & 0xff;
            }

            for ($index = 0; $index < $scanlineLength; $index += $bytesPerPixel) {
                $rgb .= chr($row[$index]).chr($row[$index + 1]).chr($row[$index + 2]);
                if ($bytesPerPixel === 4) {
                    $alpha .= chr($row[$index + 3]);
                    $hasTransparency = $hasTransparency || $row[$index + 3] !== 255;
                }
            }

            $previousRow = $row;
        }

        $compressedRgb = gzcompress($rgb, 9);
        $compressedAlpha = $hasTransparency ? gzcompress($alpha, 9) : null;
        if ($compressedRgb === false || $compressedAlpha === false) {
            return null;
        }

        return [
            'width' => $width,
            'height' => $height,
            'rgb' => $compressedRgb,
            'alpha' => $compressedAlpha,
        ];
    }

    private function paeth(int $left, int $up, int $upLeft): int
    {
        $estimate = $left + $up - $upLeft;
        $leftDistance = abs($estimate - $left);
        $upDistance = abs($estimate - $up);
        $upLeftDistance = abs($estimate - $upLeft);

        if ($leftDistance <= $upDistance && $leftDistance <= $upLeftDistance) {
            return $left;
        }

        return $upDistance <= $upLeftDistance ? $up : $upLeft;
    }

    private function wrap(string $text, int $characters): array
    {
        return explode("\n", wordwrap(preg_replace('/\s+/u', ' ', trim($text)) ?? '', $characters, "\n", true));
    }

    private function escape(string $text): string
    {
        return str_replace(['\\', '(', ')', "\r", "\n"], ['\\\\', '\\(', '\\)', '', ' '], $this->normalize($text));
    }

    private function normalize(string $text): string
    {
        $normalized = iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $text);

        return $normalized === false ? preg_replace('/[^\x20-\x7E]/', '', $text) ?? '' : $normalized;
    }
}

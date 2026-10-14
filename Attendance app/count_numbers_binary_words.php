<?php

declare(strict_types=1);

const MIN_NUMBER = 1;
const MAX_NUMBER = 1000000000;

if ($argc < 2 || $argc > 3) {
    fwrite(STDERR, "Usage: php count_numbers_binary_words.php <start> [end]\n");
    fwrite(STDERR, "Example: php count_numbers_binary_words.php 1 20\n");
    exit(1);
}

$start = parsePositiveInt($argv[1]);
$end = $argc === 3 ? parsePositiveInt($argv[2]) : $start;

if ($start < MIN_NUMBER || $end < MIN_NUMBER || $start > MAX_NUMBER || $end > MAX_NUMBER) {
    fwrite(STDERR, "Range must stay between 1 and 1000000000.\n");
    exit(1);
}

if ($start > $end) {
    fwrite(STDERR, "Start must be less than or equal to end.\n");
    exit(1);
}

for ($number = $start; $number <= $end; $number++) {
    $binary = decbin($number);
    $words = numberToWords($number);
    echo $number . ' - ' . $binary . ' - ' . $words . PHP_EOL;
}

function parsePositiveInt(string $value): int
{
    if (!preg_match('/^\d+$/', $value)) {
        fwrite(STDERR, "Invalid integer: {$value}\n");
        exit(1);
    }

    return (int) $value;
}

function numberToWords(int $number): string
{
    if ($number === 1000000000) {
        return 'one billion';
    }

    if ($number >= 1000000) {
        $millions = intdiv($number, 1000000);
        $remainder = $number % 1000000;

        return appendRemainder(numberToWords($millions) . ' million', $remainder);
    }

    if ($number >= 1000) {
        $thousands = intdiv($number, 1000);
        $remainder = $number % 1000;

        return appendRemainder(numberToWords($thousands) . ' thousand', $remainder);
    }

    if ($number >= 100) {
        $hundreds = intdiv($number, 100);
        $remainder = $number % 100;

        return appendRemainder(numberToWords($hundreds) . ' hundred', $remainder);
    }

    return numberBelowOneHundredToWords($number);
}

function appendRemainder(string $prefix, int $remainder): string
{
    if ($remainder === 0) {
        return $prefix;
    }

    return $prefix . ' ' . numberToWords($remainder);
}

function numberBelowOneHundredToWords(int $number): string
{
    $ones = [
        0 => 'zero',
        1 => 'one',
        2 => 'two',
        3 => 'three',
        4 => 'four',
        5 => 'five',
        6 => 'six',
        7 => 'seven',
        8 => 'eight',
        9 => 'nine',
        10 => 'ten',
        11 => 'eleven',
        12 => 'twelve',
        13 => 'thirteen',
        14 => 'fourteen',
        15 => 'fifteen',
        16 => 'sixteen',
        17 => 'seventeen',
        18 => 'eighteen',
        19 => 'nineteen',
    ];

    $tens = [
        2 => 'twenty',
        3 => 'thirty',
        4 => 'forty',
        5 => 'fifty',
        6 => 'sixty',
        7 => 'seventy',
        8 => 'eighty',
        9 => 'ninety',
    ];

    if ($number < 20) {
        return $ones[$number];
    }

    $tenValue = intdiv($number, 10);
    $remainder = $number % 10;

    if ($remainder === 0) {
        return $tens[$tenValue];
    }

    return $tens[$tenValue] . '-' . $ones[$remainder];
}

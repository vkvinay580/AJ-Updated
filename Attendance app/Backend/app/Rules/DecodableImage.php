<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

final class DecodableImage implements ValidationRule
{
    /**
     * Validate images without relying on PHP's optional fileinfo extension.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid() || self::extension($value) === null) {
            $fail('The :attribute must be a valid JPG, PNG, GIF, BMP, or WebP image.');
        }
    }

    public static function extension(mixed $value): ?string
    {
        if (! $value instanceof UploadedFile) {
            return null;
        }

        $path = $value->getPathname();
        if ($path === '' || ! is_file($path)) {
            return null;
        }

        $details = @getimagesize($path);
        if (! is_array($details) || empty($details[0]) || empty($details[1])) {
            return null;
        }

        return match ($details[2] ?? null) {
            IMAGETYPE_JPEG => 'jpg',
            IMAGETYPE_PNG => 'png',
            IMAGETYPE_GIF => 'gif',
            IMAGETYPE_BMP => 'bmp',
            IMAGETYPE_WEBP => 'webp',
            default => null,
        };
    }
}

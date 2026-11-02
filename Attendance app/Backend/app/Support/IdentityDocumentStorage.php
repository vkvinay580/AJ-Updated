<?php

namespace App\Support;

use App\Models\Employee;
use App\Rules\DecodableImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Intervention\Image\Laravel\Facades\Image;

final class IdentityDocumentStorage
{
    private const DIRECTORY = 'private/employee-identity-documents/';

    public static function store(
        UploadedFile $image,
        Employee $employee,
        string $type,
        string $scope,
        ?string $existingPath = null
    ): string {
        $type = self::normalizedType($type);
        $scope = preg_replace('/[^a-z0-9_-]+/i', '-', $scope) ?: 'document';
        $extension = DecodableImage::extension($image) ?? 'jpg';
        $directory = self::DIRECTORY.$employee->getKey();
        $filename = sprintf(
            '%s_%s_%s_%s.%s',
            $scope,
            $type,
            now(config('app.timezone', 'Asia/Kolkata'))->format('YmdHis'),
            bin2hex(random_bytes(4)),
            $extension
        );
        $path = $directory.'/'.$filename;

        File::ensureDirectoryExists(storage_path('app/'.$directory), 0750, true);
        Image::read($image)
            ->scaleDown(width: 2000)
            ->save(self::absolutePath($path));

        self::delete($existingPath);

        return $path;
    }

    public static function delete(?string $path): void
    {
        $path = trim((string) $path);
        $absolutePath = self::safeAbsolutePath($path);
        if ($absolutePath !== null) {
            File::delete($absolutePath);
        }
    }

    public static function exists(?string $path): bool
    {
        $absolutePath = self::safeAbsolutePath(trim((string) $path));

        return $absolutePath !== null && File::exists($absolutePath);
    }

    public static function absolutePath(string $path): string
    {
        $absolutePath = self::safeAbsolutePath($path);
        abort_unless($absolutePath !== null, 404);

        return $absolutePath;
    }

    public static function normalizedType(string $type): string
    {
        $type = strtolower(trim($type));
        abort_unless(in_array($type, ['aadhaar', 'pan'], true), 404);

        return $type;
    }

    private static function safeAbsolutePath(string $path): ?string
    {
        $path = ltrim(str_replace('\\', '/', trim($path)), '/');
        if (! str_starts_with($path, self::DIRECTORY) || str_contains($path, '..')) {
            return null;
        }

        return storage_path('app/'.$path);
    }
}

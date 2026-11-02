<?php

namespace App\Support;

use App\Models\Employee;
use App\Rules\DecodableImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image;

final class IdentityDocumentStorage
{
    private const DISK = 'local';

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
        $directory = 'private/employee-identity-documents/'.$employee->getKey();
        $filename = sprintf(
            '%s_%s_%s_%s.%s',
            $scope,
            $type,
            now(config('app.timezone', 'Asia/Kolkata'))->format('YmdHis'),
            bin2hex(random_bytes(4)),
            $extension
        );
        $path = $directory.'/'.$filename;

        Storage::disk(self::DISK)->makeDirectory($directory);
        Image::read($image)
            ->scaleDown(width: 2000)
            ->save(Storage::disk(self::DISK)->path($path));

        self::delete($existingPath);

        return $path;
    }

    public static function delete(?string $path): void
    {
        $path = trim((string) $path);
        if ($path !== '') {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    public static function exists(?string $path): bool
    {
        $path = trim((string) $path);

        return $path !== '' && Storage::disk(self::DISK)->exists($path);
    }

    public static function absolutePath(string $path): string
    {
        return Storage::disk(self::DISK)->path($path);
    }

    public static function normalizedType(string $type): string
    {
        $type = strtolower(trim($type));
        abort_unless(in_array($type, ['aadhaar', 'pan'], true), 404);

        return $type;
    }
}

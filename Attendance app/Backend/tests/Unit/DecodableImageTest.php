<?php

namespace Tests\Unit;

use App\Rules\DecodableImage;
use Illuminate\Http\UploadedFile;
use PHPUnit\Framework\TestCase;

class DecodableImageTest extends TestCase
{
    public function test_it_accepts_a_real_image_without_fileinfo(): void
    {
        $image = UploadedFile::fake()->image('attendance-selfie.jpg', 256, 256);
        $errors = [];

        (new DecodableImage)->validate('photo', $image, function (string $message) use (&$errors): void {
            $errors[] = $message;
        });

        $this->assertSame([], $errors);
        $this->assertSame('jpg', DecodableImage::extension($image));
    }

    public function test_it_rejects_a_non_image_with_an_image_filename(): void
    {
        $file = UploadedFile::fake()->createWithContent('attendance-selfie.jpg', 'not an image');
        $errors = [];

        (new DecodableImage)->validate('photo', $file, function (string $message) use (&$errors): void {
            $errors[] = $message;
        });

        $this->assertCount(1, $errors);
        $this->assertNull(DecodableImage::extension($file));
    }

    public function test_it_uses_detected_content_instead_of_an_untrusted_extension(): void
    {
        $image = UploadedFile::fake()->image('attendance-selfie.php', 64, 64);

        $this->assertSame('jpg', DecodableImage::extension($image));
        $this->assertNotSame('php', DecodableImage::extension($image));
    }
}

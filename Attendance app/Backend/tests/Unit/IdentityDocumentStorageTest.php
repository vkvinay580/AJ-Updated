<?php

namespace Tests\Unit;

use App\Models\Employee;
use App\Support\IdentityDocumentStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class IdentityDocumentStorageTest extends TestCase
{
    public function test_supported_identity_document_types_are_normalized(): void
    {
        $this->assertSame('aadhaar', IdentityDocumentStorage::normalizedType(' Aadhaar '));
        $this->assertSame('pan', IdentityDocumentStorage::normalizedType('PAN'));
    }

    public function test_unsupported_identity_document_type_is_not_available(): void
    {
        $this->expectException(NotFoundHttpException::class);

        IdentityDocumentStorage::normalizedType('passport');
    }

    public function test_image_storage_does_not_require_the_fileinfo_extension(): void
    {
        $employee = new Employee;
        $employee->id = 999999999;
        $path = null;

        try {
            $path = IdentityDocumentStorage::store(
                UploadedFile::fake()->image('aadhaar.jpg', 1200, 800),
                $employee,
                'aadhaar',
                'pending'
            );

            $this->assertStringStartsWith(
                'private/employee-identity-documents/999999999/pending_aadhaar_',
                $path
            );
            $this->assertTrue(IdentityDocumentStorage::exists($path));
            $this->assertFileExists(IdentityDocumentStorage::absolutePath($path));
        } finally {
            IdentityDocumentStorage::delete($path);
            File::deleteDirectory(storage_path('app/private/employee-identity-documents/999999999'));
        }
    }
}

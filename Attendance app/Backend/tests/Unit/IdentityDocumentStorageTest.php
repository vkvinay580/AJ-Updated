<?php

namespace Tests\Unit;

use App\Support\IdentityDocumentStorage;
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
        $this->expectException(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);

        IdentityDocumentStorage::normalizedType('passport');
    }
}

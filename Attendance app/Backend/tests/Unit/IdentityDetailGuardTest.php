<?php

namespace Tests\Unit;

use App\Support\IdentityDetailGuard;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class IdentityDetailGuardTest extends TestCase
{
    public static function directSaveCases(): array
    {
        return [
            'initial Aadhaar save' => ['', '123456789012', true],
            'unchanged saved Aadhaar' => ['123456789012', '123456789012', true],
            'changed saved Aadhaar' => ['123456789012', '999999999999', false],
            'cleared saved Aadhaar' => ['123456789012', '', false],
            'initial PAN save' => ['', 'ABCDE1234F', true],
            'changed saved PAN' => ['ABCDE1234F', 'ZZZZZ9999Z', false],
        ];
    }

    #[DataProvider('directSaveCases')]
    public function test_saved_identity_values_cannot_be_changed_directly(
        string $current,
        string $requested,
        bool $expected
    ): void {
        $this->assertSame($expected, IdentityDetailGuard::permitsDirectSave($current, $requested));
    }
}

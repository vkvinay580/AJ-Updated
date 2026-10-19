<?php

namespace Tests\Unit;

use App\Casts\EncryptedString;
use App\Casts\EncryptedStringOrEmpty;
use App\Models\EmployeeDetail;
use Tests\TestCase;

class EncryptedStringTest extends TestCase
{
    public function test_encrypted_bank_values_require_more_than_legacy_varchar_lengths(): void
    {
        $cast = new EncryptedString;
        $accountNumber = '123456789012345678';

        $encrypted = $cast->set(new \stdClass, 'bank_account_number', $accountNumber, []);

        $this->assertIsString($encrypted);
        $this->assertGreaterThan(50, strlen($encrypted));
        $this->assertSame(
            $accountNumber,
            $cast->get(new \stdClass, 'bank_account_number', $encrypted, [])
        );
    }

    public function test_required_employee_detail_fields_preserve_empty_strings(): void
    {
        $cast = new EncryptedStringOrEmpty;

        $this->assertSame('', $cast->set(new EmployeeDetail, 'aadhaarNo', '', []));
        $this->assertSame('', $cast->get(new EmployeeDetail, 'aadhaarNo', null, []));
    }

    public function test_nullable_request_fields_still_use_null_for_empty_values(): void
    {
        $cast = new EncryptedString;

        $this->assertNull($cast->set(new \stdClass, 'requested_uan_number', '', []));
    }
}

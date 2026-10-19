<?php

namespace Tests\Unit;

use App\Http\Controllers\Admin\BankDetailRequestController;
use App\Models\EmployeeBankDetailRequest;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class BankDetailRequestTabsTest extends TestCase
{
    public function test_approved_tab_includes_waiting_and_verified_requests(): void
    {
        $reflection = new ReflectionClass(BankDetailRequestController::class);
        $controller = $reflection->newInstanceWithoutConstructor();
        $method = $reflection->getMethod('tabStatuses');

        $this->assertSame([
            EmployeeBankDetailRequest::STATUS_APPROVED,
            EmployeeBankDetailRequest::STATUS_VERIFIED,
        ], $method->invoke($controller, 'approved'));
    }
}

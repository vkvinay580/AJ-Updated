<?php

namespace Tests\Unit;

use App\Http\Controllers\Admin\IdentityDetailRequestController;
use App\Models\EmployeeIdentityDetailRequest;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class IdentityDetailRequestTabsTest extends TestCase
{
    public function test_approved_tab_includes_waiting_and_verified_requests(): void
    {
        $reflection = new ReflectionClass(IdentityDetailRequestController::class);
        $controller = $reflection->newInstanceWithoutConstructor();
        $method = $reflection->getMethod('tabStatuses');

        $this->assertSame([
            EmployeeIdentityDetailRequest::STATUS_APPROVED,
            EmployeeIdentityDetailRequest::STATUS_VERIFIED,
        ], $method->invoke($controller, 'approved'));
    }
}

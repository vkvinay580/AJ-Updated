<?php

namespace Tests\Unit;

use App\Support\AdminMenu;
use PHPUnit\Framework\TestCase;

class AdminMenuEditRequestAccessTest extends TestCase
{
    public function test_edit_request_access_is_listed_under_employee_not_salary(): void
    {
        $groups = collect(AdminMenu::groups())->keyBy('key');
        $employeeItems = collect($groups->get('employee')['items'])->keyBy('key');
        $salaryItems = collect($groups->get('salary')['items'])->keyBy('key');

        $this->assertSame(
            'Edit Request Access',
            $employeeItems->get('salary.bank_requests')['label']
        );
        $this->assertFalse($salaryItems->has('salary.bank_requests'));
    }
}

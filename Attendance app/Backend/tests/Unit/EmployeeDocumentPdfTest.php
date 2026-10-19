<?php

namespace Tests\Unit;

use App\Models\Employee;
use App\Services\EmployeeDocumentPdfFactory;
use Tests\TestCase;

class EmployeeDocumentPdfTest extends TestCase
{
    private Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee = new Employee([
            'empId' => 'AG-1001',
            'name' => 'Sample Employee',
            'designation' => 'Branch Manager',
            'doj' => '2025-01-15',
            'last_working_date' => '2026-09-30',
        ]);
    }

    public function test_all_generated_documents_are_valid_pdf_downloads_with_digital_footer(): void
    {
        $factory = app(EmployeeDocumentPdfFactory::class);
        $documents = [
            $factory->offerLetter($this->employee, 45000),
            $factory->experienceLetter($this->employee),
            $factory->relievingLetter($this->employee),
            $factory->payslip($this->employee, [
                'monthLabel' => 'September 2026',
                'salary' => 45000,
                'payableDays' => 29.5,
                'fullDays' => 24,
                'halfDays' => 1,
                'absentDays' => 1,
                'singlePunchDays' => 0,
                'grossPayableSalary' => 44250,
                'pf' => 1800,
                'advance' => 2000,
                'securityDeposit' => 0,
                'netPayableSalary' => 40450,
            ]),
        ];

        foreach ($documents as $pdf) {
            $this->assertStringStartsWith('%PDF-1.4', $pdf);
            $this->assertStringContainsString('/ImLogo', $pdf);
            $this->assertStringContainsString('/Subtype /Image', $pdf);
            $this->assertStringContainsString('Digitally generated through Aryan Attendance Application.', $pdf);
            $this->assertStringContainsString('%%EOF', $pdf);
            $this->assertGreaterThan(3000, strlen($pdf));
        }
    }

    public function test_payslip_contains_employee_salary_attendance_and_deduction_details(): void
    {
        $pdf = app(EmployeeDocumentPdfFactory::class)->payslip($this->employee, [
            'monthLabel' => 'September 2026',
            'salary' => 45000,
            'payableDays' => 29.5,
            'fullDays' => 24,
            'halfDays' => 1,
            'absentDays' => 1,
            'singlePunchDays' => 0,
            'grossPayableSalary' => 44250,
            'pf' => 1800,
            'advance' => 2000,
            'securityDeposit' => 0,
            'netPayableSalary' => 40450,
        ]);

        $this->assertStringContainsString('Sample Employee', $pdf);
        $this->assertStringContainsString('September 2026', $pdf);
        $this->assertStringContainsString('NET PAYABLE', $pdf);
        $this->assertStringContainsString('INR 40,450.00', $pdf);
    }
}

<?php

namespace App\Services;

use App\Models\Employee;
use App\Support\ProfessionalPdf;
use Illuminate\Support\Carbon;

final class EmployeeDocumentPdfFactory
{
    public function offerLetter(Employee $employee, float $monthlySalary): string
    {
        $effectiveDate = $this->date($employee->doj) ?? Carbon::now($this->timezone());
        $designation = $this->value($employee->designation, 'Employee');
        $pdf = (new ProfessionalPdf('Offer Letter'))
            ->heading('Offer Letter', 'Issued on '.$effectiveDate->format('d F Y'))
            ->metadata([
                ['label' => 'EMPLOYEE', 'value' => $this->value($employee->name)],
                ['label' => 'EMPLOYEE ID', 'value' => $this->value($employee->empId)],
                ['label' => 'DESIGNATION', 'value' => $designation],
                ['label' => 'DATE OF JOINING', 'value' => $this->displayDate($employee->doj)],
            ])
            ->salutation($this->value($employee->name, 'Employee'))
            ->paragraph("We are pleased to offer you employment with Aryan Gold as {$designation}, effective from the date of joining stated above. We look forward to your contribution and trust that you will uphold the professional standards of the organisation.")
            ->sectionTitle('Appointment and compensation')
            ->table(
                ['Particular', 'Basis'],
                [
                    ['Monthly gross salary', $this->money($monthlySalary)],
                    ['Annual gross salary', $this->money($monthlySalary * 12)],
                    ['Probationary period', '3 months from date of joining'],
                    ['Provident Fund', 'As applicable under payroll rules'],
                    ['Advance / security recovery', 'As applicable to approved records'],
                ],
                [250, 237],
                ['left', 'right']
            )
            ->paragraph('Salary payments are subject to attendance, statutory deductions, approved recoveries and company payroll policies. Your appointment is also subject to satisfactory verification of the information and documents provided by you.')
            ->paragraph('The terms and code of conduct on the following page form an integral part of this offer. By joining Aryan Gold, you acknowledge and accept these conditions of employment.')
            ->signature()
            ->pageBreak('Terms and Conditions', 'Integral to the Offer Letter')
            ->sectionTitle('Terms of employment')
            ->clauses([
                [
                    'number' => '1.',
                    'title' => 'Probation',
                    'body' => 'Your first three months of employment will be a probationary period. Confirmation will depend on satisfactory performance, conduct and written confirmation by the company.',
                ],
                [
                    'number' => '2.',
                    'title' => 'Duties and reporting',
                    'body' => 'You will perform the responsibilities of your role and other reasonable duties assigned by your reporting manager with care, diligence and professionalism.',
                ],
                [
                    'number' => '3.',
                    'title' => 'Working hours and place of work',
                    'body' => 'You will follow assigned schedules, attendance requirements and workplace rules. Business needs may require reasonable changes to duties, hours or work location.',
                ],
                [
                    'number' => '4.',
                    'title' => 'Compensation and benefits',
                    'body' => 'Compensation and eligible benefits will be administered under company policy and applicable law, including required taxes, contributions and authorised deductions.',
                ],
                [
                    'number' => '5.',
                    'title' => 'Attendance and leave',
                    'body' => 'Leave must be requested and approved through the prescribed process. Unauthorised absence, habitual lateness or inaccurate attendance records may lead to disciplinary action.',
                ],
                [
                    'number' => '6.',
                    'title' => 'Confidentiality and work product',
                    'body' => 'You must protect confidential business, customer and employee information. Work product created in the course of employment belongs to the company to the extent permitted by law.',
                ],
            ])
            ->sectionTitle('Code of conduct')
            ->clauses([
                [
                    'number' => '7.',
                    'title' => 'Professional behaviour',
                    'body' => 'Treat colleagues, customers and partners with dignity and respect. Discrimination, harassment, violence, intimidation and unsafe conduct are not acceptable.',
                ],
                [
                    'number' => '8.',
                    'title' => 'Integrity and compliance',
                    'body' => 'Act honestly, maintain accurate records, follow lawful instructions and comply with company policies and applicable law. Fraud, bribery and falsification are prohibited.',
                ],
                [
                    'number' => '9.',
                    'title' => 'Conflicts and company property',
                    'body' => 'Disclose actual or potential conflicts of interest. Use company funds, equipment and systems only for authorised purposes and return all property when requested.',
                ],
                [
                    'number' => '10.',
                    'title' => 'Discipline and separation',
                    'body' => 'Misconduct or breach of policy may result in disciplinary action. Resignation or termination will be handled under company policy, contract terms and applicable law.',
                ],
            ]);

        return $pdf->output();
    }

    public function experienceLetter(Employee $employee): string
    {
        $joiningDate = $this->date($employee->doj);
        $endDate = $this->date($employee->last_working_date);
        $serviceEnd = $endDate?->format('d F Y') ?? 'the present date';
        $designation = $this->value($employee->designation, 'Employee');
        $pdf = (new ProfessionalPdf('Experience Letter'))
            ->heading('Experience Letter', 'To whom it may concern')
            ->metadata([
                ['label' => 'EMPLOYEE', 'value' => $this->value($employee->name)],
                ['label' => 'EMPLOYEE ID', 'value' => $this->value($employee->empId)],
                ['label' => 'DESIGNATION', 'value' => $designation],
                ['label' => 'SERVICE PERIOD', 'value' => ($joiningDate?->format('d M Y') ?? '--').' to '.$serviceEnd],
            ])
            ->paragraph('This is to certify that '.$this->value($employee->name, 'the employee').' has been associated with Aryan Gold from '.($joiningDate?->format('d F Y') ?? '--').' to '.$serviceEnd.' in the capacity of '.$designation.'.')
            ->paragraph('During this period, the employee carried out assigned responsibilities and contributed to the organisation with professionalism. We appreciate the service rendered and wish the employee continued success in future endeavours.')
            ->paragraph('This letter is issued upon request for official employment-verification purposes.')
            ->signature();

        return $pdf->output();
    }

    public function relievingLetter(Employee $employee): string
    {
        $lastWorkingDate = $this->date($employee->last_working_date);
        $designation = $this->value($employee->designation, 'Employee');
        $pdf = (new ProfessionalPdf('Relieving Letter'))
            ->heading('Relieving Letter', 'Issued on '.Carbon::now($this->timezone())->format('d F Y'))
            ->metadata([
                ['label' => 'EMPLOYEE', 'value' => $this->value($employee->name)],
                ['label' => 'EMPLOYEE ID', 'value' => $this->value($employee->empId)],
                ['label' => 'DESIGNATION', 'value' => $designation],
                ['label' => 'LAST WORKING DATE', 'value' => $lastWorkingDate?->format('d F Y') ?? '--'],
            ])
            ->salutation($this->value($employee->name, 'Employee'))
            ->paragraph('This is to confirm that you have been relieved from your duties as '.$designation.' with Aryan Gold effective at the close of business on '.($lastWorkingDate?->format('d F Y') ?? '--').'.')
            ->paragraph('We acknowledge your contribution during your tenure. Any remaining financial settlement, statutory processing or asset clearance continues to be governed by company records and applicable policy.')
            ->paragraph('We thank you for your service and wish you success in your future professional pursuits.')
            ->signature();

        return $pdf->output();
    }

    public function payslip(Employee $employee, array $summary): string
    {
        $gross = (float) ($summary['grossPayableSalary'] ?? 0);
        $pf = (float) ($summary['pf'] ?? 0);
        $advance = (float) ($summary['advance'] ?? 0);
        $securityDeposit = (float) ($summary['securityDeposit'] ?? 0);
        $net = (float) ($summary['netPayableSalary'] ?? 0);
        $pdf = (new ProfessionalPdf('Payslip'))
            ->heading('Payslip', $this->value($summary['monthLabel'] ?? null))
            ->metadata([
                ['label' => 'EMPLOYEE', 'value' => $this->value($employee->name)],
                ['label' => 'EMPLOYEE ID', 'value' => $this->value($employee->empId)],
                ['label' => 'DESIGNATION', 'value' => $this->value($employee->designation)],
                ['label' => 'MONTHLY SALARY', 'value' => $this->money((float) ($summary['salary'] ?? 0))],
            ])
            ->sectionTitle('Attendance summary')
            ->table(
                ['Payable days', 'Full days', 'Half days', 'Absent', 'Single punch'],
                [[
                    $this->days($summary['payableDays'] ?? 0),
                    $this->days($summary['fullDays'] ?? 0),
                    $this->days($summary['halfDays'] ?? 0),
                    $this->days($summary['absentDays'] ?? 0),
                    $this->days($summary['singlePunchDays'] ?? 0),
                ]],
                [100, 97, 97, 97, 96],
                ['right', 'right', 'right', 'right', 'right']
            )
            ->sectionTitle('Salary statement')
            ->table(
                ['Earnings', 'Amount', 'Deductions', 'Amount'],
                [
                    ['Gross payable salary', $this->money($gross), 'Provident Fund', $this->money($pf)],
                    ['', '', 'Salary advance', $this->money($advance)],
                    ['', '', 'Security deposit', $this->money($securityDeposit)],
                    ['Total earnings', $this->money($gross), 'Total deductions', $this->money(max(0, $gross - $net))],
                ],
                [155, 88, 155, 89],
                ['left', 'right', 'left', 'right']
            )
            ->callout('NET PAYABLE', $this->money($net));

        return $pdf->output();
    }

    private function money(float $amount): string
    {
        return 'INR '.number_format($amount, 2, '.', ',');
    }

    private function days(mixed $days): string
    {
        return rtrim(rtrim(number_format((float) $days, 1, '.', ''), '0'), '.');
    }

    private function displayDate(mixed $value): string
    {
        return $this->date($value)?->format('d F Y') ?? '--';
    }

    private function date(mixed $value): ?Carbon
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }
        try {
            return Carbon::parse($value, $this->timezone())->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    private function value(mixed $value, string $fallback = '--'): string
    {
        $value = trim((string) $value);

        return $value === '' ? $fallback : $value;
    }

    private function timezone(): string
    {
        return config('app.timezone', 'Asia/Kolkata');
    }
}

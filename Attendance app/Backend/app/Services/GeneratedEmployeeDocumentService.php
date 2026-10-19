<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceDayOverride;
use App\Models\Employee;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

final class GeneratedEmployeeDocumentService
{
    public const OFFER_LETTER = 'offer-letter';

    public const EXPERIENCE_LETTER = 'experience-letter';

    public const PAYSLIP = 'payslip';

    public const RELIEVING_LETTER = 'relieving-letter';

    public function __construct(
        private readonly EmployeeSalarySummaryService $salarySummaryService,
        private readonly EmployeeDocumentPdfFactory $pdfFactory
    ) {}

    public function availableFor(Employee $employee): array
    {
        $documents = [];
        $salary = $this->salarySummaryService->salaryFor($employee);

        if ($salary > 0) {
            $documents[] = $this->descriptor($employee, self::OFFER_LETTER, 'Offer Letter', 'offer-letter-'.$this->fileEmployeeId($employee).'.pdf');
        }

        if ($this->date($employee->doj)) {
            $documents[] = $this->descriptor($employee, self::EXPERIENCE_LETTER, 'Experience Letter', 'experience-letter-'.$this->fileEmployeeId($employee).'.pdf');
        }

        if ($salary > 0) {
            foreach ($this->eligiblePayslipMonths($employee) as $month) {
                $documents[] = $this->descriptor(
                    $employee,
                    self::PAYSLIP,
                    'Payslip — '.$month->format('F Y'),
                    'payslip-'.$month->format('Y-m').'-'.$this->fileEmployeeId($employee).'.pdf',
                    $month->format('Y-m')
                );
            }
        }

        if ($this->date($employee->last_working_date)) {
            $documents[] = $this->descriptor($employee, self::RELIEVING_LETTER, 'Relieving Letter', 'relieving-letter-'.$this->fileEmployeeId($employee).'.pdf');
        }

        return $documents;
    }

    public function render(Employee $employee, string $type, ?string $period = null): array
    {
        $available = collect($this->availableFor($employee))->first(
            fn (array $document): bool => $document['generatedType'] === $type
                && (($document['payPeriod'] ?? null) === ($period ?: null))
        );
        abort_unless(is_array($available), 404);

        $pdf = match ($type) {
            self::OFFER_LETTER => $this->pdfFactory->offerLetter($employee, $this->salarySummaryService->salaryFor($employee)),
            self::EXPERIENCE_LETTER => $this->pdfFactory->experienceLetter($employee),
            self::RELIEVING_LETTER => $this->pdfFactory->relievingLetter($employee),
            self::PAYSLIP => $this->pdfFactory->payslip(
                $employee,
                $this->salarySummaryService->forMonth(
                    $employee,
                    Carbon::createFromFormat('!Y-m', (string) $period, $this->timezone())->startOfMonth()
                )
            ),
            default => abort(404),
        };

        return ['content' => $pdf, 'fileName' => $available['fileName']];
    }

    private function eligiblePayslipMonths(Employee $employee): array
    {
        $lastCompletedMonth = Carbon::now($this->timezone())->startOfMonth()->subMonth();
        $joiningDate = $this->date($employee->doj);
        $lastWorkingDate = $this->date($employee->last_working_date);
        $attendanceDates = Attendance::query()
            ->whereRaw('TRIM(empId) = ?', [trim((string) $employee->empId)])
            ->whereNotNull('check_in_date')
            ->where('check_in_date', '<=', $lastCompletedMonth->copy()->endOfMonth()->toDateString())
            ->where(function ($query): void {
                $query->where(function ($punchQuery): void {
                    $punchQuery->whereNotNull('check_in_time')->where('check_in_time', '<>', '');
                })->orWhere(function ($punchQuery): void {
                    $punchQuery->whereNotNull('check_out_time')->where('check_out_time', '<>', '');
                })->orWhereIn('attendance_status_override', [
                    'full_day',
                    'full_day_remote',
                    'half_day',
                    'single_punch',
                    'absent',
                ]);
            })
            ->pluck('check_in_date');
        $overrideDates = AttendanceDayOverride::query()
            ->whereRaw('TRIM(emp_id) = ?', [trim((string) $employee->empId)])
            ->where('attendance_date', '<=', $lastCompletedMonth->copy()->endOfMonth()->toDateString())
            ->whereIn('final_status', ['full_day', 'full_day_remote', 'half_day', 'single_punch', 'absent'])
            ->pluck('attendance_date');

        return $attendanceDates
            ->concat($overrideDates)
            ->map(function ($date): ?Carbon {
                try {
                    return Carbon::parse($date, $this->timezone())->startOfMonth();
                } catch (\Throwable) {
                    return null;
                }
            })
            ->filter()
            ->filter(fn (Carbon $month): bool => $month->lte($lastCompletedMonth))
            ->filter(fn (Carbon $month): bool => ! $joiningDate || $month->endOfMonth()->gte($joiningDate))
            ->filter(fn (Carbon $month): bool => ! $lastWorkingDate || $month->startOfMonth()->lte($lastWorkingDate))
            ->unique(fn (Carbon $month): string => $month->format('Y-m'))
            ->sortByDesc(fn (Carbon $month): string => $month->format('Y-m'))
            ->values()
            ->all();
    }

    private function descriptor(Employee $employee, string $type, string $title, string $fileName, ?string $period = null): array
    {
        $parameters = ['employee' => $employee->getKey(), 'type' => $type];
        if ($period !== null) {
            $parameters['period'] = $period;
        }

        return [
            'id' => 'generated-'.$type.($period ? '-'.$period : ''),
            'type' => str_replace('-', '_', $type),
            'generatedType' => $type,
            'title' => $title,
            'payPeriod' => $period,
            'fileName' => $fileName,
            'uploadedAt' => Carbon::now($this->timezone())->toIso8601String(),
            'downloadUrl' => URL::temporarySignedRoute(
                'employee.generated-documents.download',
                now()->addMinutes(15),
                $parameters,
                false
            ),
        ];
    }

    private function fileEmployeeId(Employee $employee): string
    {
        return preg_replace('/[^A-Za-z0-9_-]+/', '-', trim((string) $employee->empId)) ?: 'employee';
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

    private function timezone(): string
    {
        return config('app.timezone', 'Asia/Kolkata');
    }
}

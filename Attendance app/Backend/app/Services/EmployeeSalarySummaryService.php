<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceDayOverride;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeAdvanceTransaction;
use App\Models\EmployeeBankDetailRequest;
use App\Models\EmployeeDetail;
use App\Models\SalaryCalculationSetting;
use App\Support\AdvancePayrollWindow;
use App\Support\MayPfEligibility;
use App\Support\MayPfSecurityDeposit;
use App\Support\PfSalaryBreakdown;
use App\Support\SalaryProration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

final class EmployeeSalarySummaryService
{
    private const STATUS_FULL_DAY = 'full_day';

    private const STATUS_FULL_DAY_REMOTE = 'full_day_remote';

    private const STATUS_HALF_DAY = 'half_day';

    private const STATUS_SINGLE_PUNCH = 'single_punch';

    private const STATUS_ABSENT = 'absent';

    private const NIGHT_SHIFT_MONTHLY_WEEKOFF_DAYS = 4;

    public function __construct(
        private readonly AttendanceClassificationService $attendanceClassificationService
    ) {}

    public function forMonth(Employee $employee, Carbon $selectedMonth, ?Carbon $today = null): array
    {
        $timezone = config('app.timezone', 'Asia/Kolkata');
        $today = ($today ?? Carbon::now($timezone))->copy()->setTimezone($timezone);
        $selectedMonth = $selectedMonth->copy()->setTimezone($timezone)->startOfMonth();
        $monthStart = $selectedMonth->copy();
        $monthEnd = $selectedMonth->copy()->endOfMonth();
        $todayDate = $today->copy()->startOfDay();
        $isCurrentMonth = $monthStart->isSameMonth($today);
        $summaryEndDate = $isCurrentMonth ? $today->copy()->subDay()->startOfDay() : $monthEnd->copy();
        $advanceWindow = AdvancePayrollWindow::currentOpenWindowForPayrollMonth($monthStart, $today);
        $calendarDaysInMonth = $monthStart->daysInMonth;
        $salarySettings = SalaryCalculationSetting::configuration();
        $salaryDaysInMonth = $salarySettings['fixed_30_days'] ? 30 : $calendarDaysInMonth;
        $detail = $this->employeeDetail($employee);
        $isNightShiftEmployee = (bool) $employee->is_night_shift;
        $calendarDaysElapsed = $isCurrentMonth ? max(0, min($today->day - 1, $calendarDaysInMonth)) : $calendarDaysInMonth;
        $records = Attendance::query()
            ->where('empId', $this->clean($employee->empId))
            ->whereBetween('check_in_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->orderBy('check_in_date')
            ->orderBy('id')
            ->get()
            ->keyBy(fn (Attendance $attendance): string => $attendance->check_in_date);
        $dayOverrides = AttendanceDayOverride::query()
            ->where('emp_id', $this->clean($employee->empId))
            ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get(['attendance_date', 'final_status'])
            ->keyBy(fn (AttendanceDayOverride $override): string => Carbon::parse($override->attendance_date)->toDateString());
        $firstRegularizedDate = $dayOverrides
            ->filter(fn (AttendanceDayOverride $override): bool => $this->isAttendanceStatus($override->final_status))
            ->keys()
            ->sort()
            ->first();
        $employmentStartDate = $this->salaryEmploymentStartDate($employee, $firstRegularizedDate);

        $fullDays = 0;
        $halfDays = 0;
        $absentDays = 0;
        $singlePunchDays = 0;
        $paidSundayDays = 0;
        $sundayLoggedDays = 0;
        $adminOverrideDays = 0;
        $anyPunches = 0;
        $regularizedDays = 0;
        $cursor = $monthStart->copy();

        while ($cursor->lte($summaryEndDate) && $cursor->lte($monthEnd)) {
            $date = $cursor->toDateString();
            $record = $records->get($date);
            $dayOverrideStatus = $this->clean($dayOverrides->get($date)?->final_status);
            $hasDayOverride = $this->isAttendanceStatus($dayOverrideStatus);
            $recordOverrideStatus = $this->clean($record?->attendance_status_override);
            $hasRecordOverride = $this->isAttendanceStatus($recordOverrideStatus);

            if ($employmentStartDate instanceof Carbon && $cursor->lt($employmentStartDate)) {
                $cursor->addDay();

                continue;
            }
            if ($record && ($this->clean($record->check_in_time) !== '' || $this->clean($record->check_out_time) !== '')) {
                $anyPunches++;
            }
            if ($hasDayOverride || $hasRecordOverride) {
                $regularizedDays++;
            }
            if (! $isNightShiftEmployee && $cursor->isSunday() && $this->hasCompletedAttendance($record)) {
                $sundayLoggedDays++;
            }
            if (! $isNightShiftEmployee && $cursor->isSunday()) {
                if (! $isCurrentMonth || $cursor->lt($todayDate)) {
                    $paidSundayDays++;
                }
                $cursor->addDay();

                continue;
            }

            $status = $this->effectiveAttendanceStatus($record, $dayOverrideStatus, $employee);
            if ($hasDayOverride) {
                $adminOverrideDays++;
            }
            if (in_array($status, [self::STATUS_FULL_DAY, self::STATUS_FULL_DAY_REMOTE], true)) {
                $fullDays++;
            } elseif ($status === self::STATUS_HALF_DAY) {
                $halfDays++;
            } elseif ($status === self::STATUS_SINGLE_PUNCH) {
                $singlePunchDays++;
            } elseif ($status === self::STATUS_ABSENT) {
                $absentDays++;
            }
            $cursor->addDay();
        }

        if ($isNightShiftEmployee && $absentDays > 0) {
            $nightShiftWeekOffDays = min($absentDays, self::NIGHT_SHIFT_MONTHLY_WEEKOFF_DAYS);
            $absentDays -= $nightShiftWeekOffDays;
            $paidSundayDays += $nightShiftWeekOffDays;
        }

        $payableDays = $paidSundayDays + $fullDays + ($halfDays * 0.5);
        $hasSalaryActivity = $anyPunches > 0 || $regularizedDays > 0;
        if (! $hasSalaryActivity) {
            $payableDays = 0.0;
        }

        $salary = is_numeric($detail?->salary) ? (float) $detail->salary : (is_numeric($employee->salary) ? (float) $employee->salary : 0.0);
        $uanNumber = $this->salaryUanNumber($employee, $detail);
        $pf = 0.0;
        $securityDeposit = MayPfSecurityDeposit::amountFor(
            $monthStart,
            $employee->empId,
            $uanNumber,
            $employee->designation ?: $detail?->designation,
            $employee->pf_eligible,
            $employee->pfsecuritydeposit
        );
        if (! $hasSalaryActivity) {
            $securityDeposit = 0.0;
        }

        $advance = (float) EmployeeAdvanceTransaction::query()
            ->where('employee_id', $employee->id)
            ->whereBetween('advance_date', [$advanceWindow['start']->toDateString(), $advanceWindow['end']->toDateString()])
            ->sum('amount');
        $salaryPerDay = SalaryProration::dailyRate($salary, $salaryDaysInMonth);
        $grossPayable = $hasSalaryActivity ? SalaryProration::grossPayable($salary, $salaryDaysInMonth, $payableDays) : 0.0;
        $netPayable = $hasSalaryActivity ? round($grossPayable - $advance - $securityDeposit) : 0.0;

        if ($salarySettings['pf_enabled'] && $hasSalaryActivity && MayPfEligibility::isEligible($monthStart, $employee->empId, $uanNumber, $employee->pf_eligible)) {
            $breakdown = PfSalaryBreakdown::forReportRow([
                'emp_id' => $this->clean($employee->empId),
                'state' => $this->salaryState($employee, $detail),
                'designation' => $employee->designation ?: $detail?->designation,
                'salary_days_in_month' => $salaryDaysInMonth,
                'credited_days' => $payableDays,
                'gross_payable_salary' => $grossPayable,
                'advance' => $advance,
                'security_deposit' => $securityDeposit,
            ]);
            $pf = $breakdown['ee_pf'];
            $netPayable = $breakdown['take_home_salary'];
        }

        return [
            'month' => $monthStart->format('Y-m'),
            'monthLabel' => $monthStart->format('F Y'),
            'salary' => $salary,
            'salaryPerDay' => $salaryPerDay,
            'salaryDaysInMonth' => $salaryDaysInMonth,
            'advance' => $advance,
            'pf' => $pf,
            'securityDeposit' => $securityDeposit,
            'fullDays' => $fullDays,
            'halfDays' => $halfDays,
            'singlePunchDays' => $singlePunchDays,
            'absentDays' => $absentDays,
            'paidSundayDays' => $paidSundayDays,
            'sundayLoggedDays' => $sundayLoggedDays,
            'adminOverrideDays' => $adminOverrideDays,
            'regularizedDays' => $regularizedDays,
            'payableDays' => $payableDays,
            'grossPayableSalary' => $grossPayable,
            'netPayableSalary' => $netPayable,
            'totalDeductions' => max(0, $grossPayable - $netPayable),
            'daysElapsed' => $calendarDaysElapsed,
            'daysInMonth' => $calendarDaysInMonth,
            'hasSalaryActivity' => $hasSalaryActivity,
        ];
    }

    public function salaryFor(Employee $employee): float
    {
        $detail = $this->employeeDetail($employee);

        return is_numeric($detail?->salary)
            ? (float) $detail->salary
            : (is_numeric($employee->salary) ? (float) $employee->salary : 0.0);
    }

    private function effectiveAttendanceStatus(?Attendance $attendance, ?string $dayOverrideStatus, Employee $employee): string
    {
        if ($this->isAttendanceStatus($dayOverrideStatus)) {
            return $this->clean($dayOverrideStatus);
        }
        if (! $attendance) {
            return self::STATUS_ABSENT;
        }
        $override = $this->clean($attendance->attendance_status_override);

        return $this->isAttendanceStatus($override)
            ? $override
            : $this->attendanceClassificationService->calculatedStatus($attendance, $employee);
    }

    private function hasCompletedAttendance(?Attendance $attendance): bool
    {
        return $attendance !== null
            && $this->clean($attendance->check_in_date) !== ''
            && $this->clean($attendance->check_in_time) !== ''
            && $this->clean($attendance->check_out_date) !== ''
            && $this->clean($attendance->check_out_time) !== '';
    }

    private function isAttendanceStatus(?string $status): bool
    {
        return in_array($this->clean($status), [
            self::STATUS_FULL_DAY,
            self::STATUS_FULL_DAY_REMOTE,
            self::STATUS_HALF_DAY,
            self::STATUS_SINGLE_PUNCH,
            self::STATUS_ABSENT,
        ], true);
    }

    private function employeeDetail(Employee $employee): ?EmployeeDetail
    {
        return EmployeeDetail::query()
            ->whereRaw('TRIM(employeeId) = ?', [$this->clean($employee->empId)])
            ->orderByDesc('id')
            ->first();
    }

    private function salaryUanNumber(Employee $employee, ?EmployeeDetail $detail): string
    {
        $uanNumber = preg_replace('/\D+/', '', (string) $detail?->uanNumber) ?? '';
        if ($uanNumber !== '') {
            return $uanNumber;
        }
        if (! Schema::hasTable('employee_bank_detail_requests')) {
            return MayPfEligibility::uanForEmployee($employee->empId);
        }
        $requestUan = EmployeeBankDetailRequest::query()
            ->where('employee_id', $employee->id)
            ->whereIn('status', [EmployeeBankDetailRequest::STATUS_SUBMITTED, EmployeeBankDetailRequest::STATUS_VERIFIED])
            ->whereNotNull('requested_uan_number')
            ->where('requested_uan_number', '<>', '')
            ->latest('id')
            ->value('requested_uan_number');
        $uanNumber = preg_replace('/\D+/', '', (string) $requestUan) ?? '';

        return $uanNumber !== '' ? $uanNumber : MayPfEligibility::uanForEmployee($employee->empId);
    }

    private function salaryState(Employee $employee, ?EmployeeDetail $detail): string
    {
        if (! Schema::hasTable('wp_branches_database')) {
            return '';
        }
        $branchId = $this->clean($detail?->branchId) ?: $this->latestAttendanceBranchId($employee);

        return $this->clean(Branch::query()->whereRaw('TRIM(branchId) = ?', [$branchId])->value('state'));
    }

    private function salaryEmploymentStartDate(Employee $employee, ?string $firstRegularizedDate = null): ?Carbon
    {
        $doj = $this->clean($employee->doj);
        if ($doj !== '') {
            try {
                return Carbon::parse($doj, config('app.timezone', 'Asia/Kolkata'))->startOfDay();
            } catch (\Throwable) {
            }
        }
        $firstAttendanceDate = Attendance::query()
            ->whereRaw('TRIM(empId) = ?', [$this->clean($employee->empId)])
            ->min('check_in_date');
        $firstActivityDate = collect([$firstAttendanceDate, $firstRegularizedDate])
            ->map(fn ($date): string => $this->clean($date))
            ->filter()
            ->sort()
            ->first();

        return $this->clean($firstActivityDate) !== ''
            ? Carbon::parse($firstActivityDate, config('app.timezone', 'Asia/Kolkata'))->startOfDay()
            : null;
    }

    private function latestAttendanceBranchId(Employee $employee): string
    {
        $attendance = Attendance::query()
            ->whereRaw('TRIM(empId) = ?', [$this->clean($employee->empId)])
            ->latest('id')
            ->first(['check_in_branch_id', 'check_out_branch_id']);

        return $attendance ? $this->clean($attendance->check_out_branch_id ?: $attendance->check_in_branch_id) : '';
    }

    private function clean(mixed $value): string
    {
        return trim((string) $value);
    }
}

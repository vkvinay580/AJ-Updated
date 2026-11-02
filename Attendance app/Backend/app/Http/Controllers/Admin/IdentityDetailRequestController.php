<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeDetail;
use App\Models\EmployeeIdentityDetailRequest;
use App\Services\EmployeeNotificationDispatchService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class IdentityDetailRequestController extends Controller
{
    private const TAB_PENDING_APPROVAL = 'pending_approval';

    private const TAB_VERIFICATION = 'verification';

    private const TAB_APPROVED = 'approved';

    public function __construct(
        private readonly EmployeeNotificationDispatchService $notificationDispatchService
    ) {}

    public function index(Request $request): View
    {
        $filters = [
            'tab' => $this->normalizeTab($request->input('tab')),
            'emp_id' => trim((string) $request->input('emp_id')),
        ];
        $query = $this->baseRequestQuery()
            ->when(
                $filters['emp_id'] !== '',
                fn ($builder) => $builder->where('emp_id', 'like', '%'.$filters['emp_id'].'%')
            );
        $rows = (clone $query)
            ->whereIn('status', $this->tabStatuses($filters['tab']))
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'submitted', 'verified', 'rejected')")
            ->orderByDesc('id')
            ->get();

        $this->attachEmployeeDetails($rows);

        return view('admin.salary.identity_detail_requests', [
            'filters' => $filters,
            'rows' => $rows->map(fn (EmployeeIdentityDetailRequest $record): array => $this->rowPayload($record))->values(),
            'summary' => [
                'pending_approval' => (clone $query)->where('status', EmployeeIdentityDetailRequest::STATUS_PENDING)->count(),
                'approved_waiting' => (clone $query)->where('status', EmployeeIdentityDetailRequest::STATUS_APPROVED)->count(),
                'pending_verification' => (clone $query)->where('status', EmployeeIdentityDetailRequest::STATUS_SUBMITTED)->count(),
                'verified' => (clone $query)->where('status', EmployeeIdentityDetailRequest::STATUS_VERIFIED)->count(),
            ],
        ]);
    }

    public function approve(Request $request, EmployeeIdentityDetailRequest $requestRecord): RedirectResponse
    {
        $data = $request->validate(['admin_note' => ['nullable', 'string', 'max:2000']]);

        if ($requestRecord->status !== EmployeeIdentityDetailRequest::STATUS_PENDING) {
            return back()->with('status', 'Only pending requests can be approved.');
        }

        $admin = auth('admin')->user();
        $requestRecord->update([
            'status' => EmployeeIdentityDetailRequest::STATUS_APPROVED,
            'admin_note' => trim((string) ($data['admin_note'] ?? '')) ?: null,
            'approved_by' => trim((string) ($admin->email ?? $admin->name ?? 'admin')),
            'approved_at' => now(),
        ]);

        if ($requestRecord->employee) {
            $this->notificationDispatchService->sendToEmployee(
                $requestRecord->employee,
                'Aadhaar / PAN Edit Approved',
                'Your Aadhaar/PAN edit request was approved. Submit the corrected details in the employee app for verification.',
                auth('admin')->id()
            );
        }

        return redirect()->route('admin-identity-detail-requests')->with('status', 'Aadhaar/PAN edit request approved.');
    }

    public function reject(Request $request, EmployeeIdentityDetailRequest $requestRecord): RedirectResponse
    {
        $data = $request->validate(['admin_note' => ['nullable', 'string', 'max:2000']]);

        if (! in_array($requestRecord->status, [
            EmployeeIdentityDetailRequest::STATUS_PENDING,
            EmployeeIdentityDetailRequest::STATUS_APPROVED,
            EmployeeIdentityDetailRequest::STATUS_SUBMITTED,
        ], true)) {
            return back()->with('status', 'This request cannot be rejected now.');
        }

        $wasSubmitted = $requestRecord->status === EmployeeIdentityDetailRequest::STATUS_SUBMITTED;
        $adminNote = trim((string) ($data['admin_note'] ?? '')) ?: null;
        $admin = auth('admin')->user();
        $requestRecord->update([
            'status' => EmployeeIdentityDetailRequest::STATUS_REJECTED,
            'admin_note' => $adminNote,
            'approved_by' => trim((string) ($admin->email ?? $admin->name ?? 'admin')),
            'approved_at' => now(),
        ]);

        if ($requestRecord->employee) {
            $message = $wasSubmitted
                ? 'Your submitted Aadhaar/PAN changes were rejected.'
                : 'Your Aadhaar/PAN edit request was rejected.';
            if ($adminNote !== null) {
                $message .= ' Note: '.$adminNote;
            }
            $this->notificationDispatchService->sendToEmployee(
                $requestRecord->employee,
                $wasSubmitted ? 'Aadhaar / PAN Changes Rejected' : 'Aadhaar / PAN Edit Rejected',
                $message,
                auth('admin')->id()
            );
        }

        return redirect()->route('admin-identity-detail-requests')->with('status', 'Aadhaar/PAN request rejected.');
    }

    public function verify(Request $request, EmployeeIdentityDetailRequest $requestRecord): RedirectResponse
    {
        $data = $request->validate(['admin_note' => ['nullable', 'string', 'max:2000']]);

        if ($requestRecord->status !== EmployeeIdentityDetailRequest::STATUS_SUBMITTED) {
            return back()->with('status', 'Only submitted Aadhaar/PAN changes can be verified.');
        }

        $employee = $requestRecord->employee;
        if (! $employee) {
            return back()->with('status', 'Employee record is missing for this request.');
        }

        $detail = $this->employeeDetail($employee);
        if (! $detail) {
            return back()->with('status', 'Employee detail record is missing for this request.');
        }

        $adminNote = trim((string) ($data['admin_note'] ?? '')) ?: null;
        $admin = auth('admin')->user();

        DB::transaction(function () use ($requestRecord, $detail, $adminNote, $admin): void {
            $requestedAadhaar = trim((string) $requestRecord->requested_aadhaar_no);
            $requestedPan = strtoupper(trim((string) $requestRecord->requested_pan_no));

            if ($requestedAadhaar !== '') {
                $detail->aadhaarNo = $requestedAadhaar;
            }
            if ($requestedPan !== '') {
                $detail->panNo = $requestedPan;
            }
            $detail->save();

            $requestRecord->update([
                'status' => EmployeeIdentityDetailRequest::STATUS_VERIFIED,
                'admin_note' => $adminNote,
                'verified_by' => trim((string) ($admin->email ?? $admin->name ?? 'admin')),
                'verified_at' => now(),
            ]);
        });

        $message = 'Your Aadhaar/PAN changes were verified and saved successfully.';
        if ($adminNote !== null) {
            $message .= ' Note: '.$adminNote;
        }
        $this->notificationDispatchService->sendToEmployee(
            $employee,
            'Aadhaar / PAN Details Verified',
            $message,
            auth('admin')->id()
        );

        return redirect()->route('admin-identity-detail-requests')->with('status', 'Aadhaar/PAN changes verified.');
    }

    private function baseRequestQuery()
    {
        return EmployeeIdentityDetailRequest::query()->with('employee:id,empId,name,designation');
    }

    private function normalizeTab(mixed $tab): string
    {
        $tab = trim((string) $tab);

        return in_array($tab, [self::TAB_PENDING_APPROVAL, self::TAB_VERIFICATION, self::TAB_APPROVED], true)
            ? $tab
            : self::TAB_PENDING_APPROVAL;
    }

    private function tabStatuses(string $tab): array
    {
        return match ($tab) {
            self::TAB_VERIFICATION => [EmployeeIdentityDetailRequest::STATUS_SUBMITTED],
            self::TAB_APPROVED => [
                EmployeeIdentityDetailRequest::STATUS_APPROVED,
                EmployeeIdentityDetailRequest::STATUS_VERIFIED,
            ],
            default => [EmployeeIdentityDetailRequest::STATUS_PENDING],
        };
    }

    private function attachEmployeeDetails(Collection $requests): void
    {
        $employees = $requests->pluck('employee')->filter()->values();
        if ($employees->isEmpty()) {
            return;
        }

        $details = EmployeeDetail::query()
            ->whereIn('employeeId', $employees->pluck('empId')->map(fn ($value): string => trim((string) $value))->all())
            ->orderByDesc('id')
            ->get()
            ->unique(fn (EmployeeDetail $detail): string => trim((string) $detail->employeeId))
            ->keyBy(fn (EmployeeDetail $detail): string => trim((string) $detail->employeeId));

        foreach ($employees as $employee) {
            $employee->setRelation('detail', $details->get(trim((string) $employee->empId)));
        }
    }

    private function rowPayload(EmployeeIdentityDetailRequest $requestRecord): array
    {
        $employee = $requestRecord->employee;
        $detail = $employee?->detail;

        return [
            'id' => $requestRecord->id,
            'status' => trim((string) $requestRecord->status),
            'emp_id' => trim((string) $requestRecord->emp_id),
            'employee_name' => trim((string) ($employee?->name ?? '')) ?: '--',
            'designation' => trim((string) ($employee?->designation ?? '')) ?: '--',
            'request_note' => trim((string) $requestRecord->request_note),
            'admin_note' => trim((string) $requestRecord->admin_note),
            'current_aadhaar_no' => trim((string) ($detail?->aadhaarNo ?? '')),
            'current_pan_no' => trim((string) ($detail?->panNo ?? '')),
            'requested_aadhaar_no' => trim((string) $requestRecord->requested_aadhaar_no),
            'requested_pan_no' => trim((string) $requestRecord->requested_pan_no),
            'created_at' => $requestRecord->created_at?->format('d M Y h:i A') ?: '--',
            'approved_at' => $requestRecord->approved_at?->format('d M Y h:i A') ?: '--',
            'submitted_at' => $requestRecord->submitted_at?->format('d M Y h:i A') ?: '--',
            'verified_at' => $requestRecord->verified_at?->format('d M Y h:i A') ?: '--',
        ];
    }

    private function employeeDetail(Employee $employee): ?EmployeeDetail
    {
        return EmployeeDetail::query()
            ->whereRaw('TRIM(employeeId) = ?', [trim((string) $employee->empId)])
            ->orderByDesc('id')
            ->first();
    }
}

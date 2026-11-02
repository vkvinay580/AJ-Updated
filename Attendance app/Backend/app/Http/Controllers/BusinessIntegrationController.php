<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeAppCredential;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class BusinessIntegrationController extends Controller
{
    public function branches(Request $request): JsonResponse
    {
        $this->authorizeIntegration($request);

        return response()->json([
            'branches' => Branch::query()
                ->orderBy('branchName')
                ->get(['id', 'branchId', 'branchName', 'addressline', 'area', 'city', 'state', 'pincode', 'timings', 'latitude', 'longitude', 'url', 'status'])
                ->map(fn (Branch $branch): array => $this->branchDirectoryPayload($branch))
                ->values(),
        ])->header('Cache-Control', 'no-store, private');
    }

    public function branchContext(Request $request): JsonResponse
    {
        $this->authorizeIntegration($request);
        $data = $request->validate([
            'employeeId' => ['required', 'string', 'max:100'],
        ]);

        $employeeId = trim((string) $data['employeeId']);
        $employee = Employee::query()
            ->whereRaw('TRIM(empId) = ?', [$employeeId])
            ->first(['id', 'empId', 'status', 'assigned_branch_id']);
        $assignedBranchId = trim((string) ($employee?->assigned_branch_id ?? ''));
        $branch = $employee && ! $employee->isInactive() && $assignedBranchId !== ''
            ? Branch::query()
                ->whereRaw('TRIM(branchId) = ?', [$assignedBranchId])
                ->where('status', 1)
                ->first(['id', 'branchId', 'branchName', 'addressline', 'area', 'city', 'state', 'pincode', 'timings', 'latitude', 'longitude', 'url', 'status'])
            : null;

        return response()->json([
            'employeeId' => $employeeId,
            'branch' => $branch ? $this->branchDirectoryPayload($branch) : null,
        ])->header('Cache-Control', 'no-store, private');
    }

    public function upsertBranch(Request $request): JsonResponse
    {
        $this->authorizeIntegration($request);
        $data = $request->validate([
            'branchId' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9][A-Za-z0-9_-]*$/'],
            'name' => ['required', 'string', 'max:190'],
            'address' => ['required', 'string', 'max:500'],
            'area' => ['required', 'string', 'max:190'],
            'city' => ['required', 'string', 'max:120'],
            'state' => ['required', 'string', 'max:120'],
            'pincode' => ['required', 'regex:/^\d{6}$/'],
            'timings' => ['required', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'url' => ['required', 'url:http,https', 'max:2048'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $branchId = strtoupper(trim((string) $data['branchId']));
        [$branch, $created] = DB::transaction(function () use ($data, $branchId): array {
            $branch = Branch::query()->whereRaw('UPPER(TRIM(branchId)) = ?', [$branchId])->lockForUpdate()->first();
            $created = ! $branch;
            $branch ??= new Branch();
            $branch->fill([
                'branchId' => $branchId,
                'branchName' => trim((string) $data['name']),
                'addressline' => trim((string) $data['address']),
                'area' => trim((string) $data['area']),
                'city' => trim((string) $data['city']),
                'state' => trim((string) $data['state']),
                'pincode' => trim((string) $data['pincode']),
                'timings' => trim((string) $data['timings']),
                'latitude' => (float) $data['latitude'],
                'longitude' => (float) $data['longitude'],
                'url' => trim((string) $data['url']),
                'status' => $data['status'] === 'active' ? 1 : 0,
            ]);
            $branch->save();

            return [$branch->fresh(), $created];
        });

        Cache::forget('attendance:branches:all');
        Cache::forget('attendance:branches:active');

        return response()->json([
            'created' => $created,
            'message' => $created ? 'Branch created successfully.' : 'Branch updated successfully.',
            'branch' => [
                'id' => (int) $branch->id,
                'branchId' => trim((string) $branch->branchId),
                'name' => trim((string) $branch->branchName),
                'address' => trim((string) $branch->addressline),
                'area' => trim((string) $branch->area),
                'city' => trim((string) $branch->city),
                'state' => trim((string) $branch->state),
                'pincode' => trim((string) $branch->pincode),
                'timings' => trim((string) $branch->timings),
                'latitude' => (float) $branch->latitude,
                'longitude' => (float) $branch->longitude,
                'url' => trim((string) $branch->url),
                'status' => (int) $branch->status === 1 ? 'active' : 'inactive',
            ],
        ], $created ? 201 : 200);
    }

    public function deleteBranch(Request $request, string $branchId): JsonResponse
    {
        $this->authorizeIntegration($request);
        $branchId = strtoupper(trim($branchId));
        abort_unless(preg_match('/^[A-Z0-9][A-Z0-9_-]{1,99}$/', $branchId) === 1, 422, 'Invalid branch ID.');

        $deleted = DB::transaction(function () use ($branchId): array {
            $branch = Branch::query()
                ->whereRaw('UPPER(TRIM(branchId)) = ?', [$branchId])
                ->lockForUpdate()
                ->first();
            abort_unless($branch, 404, 'Branch not found.');

            $assignedEmployees = Employee::query()
                ->whereRaw('UPPER(TRIM(assigned_branch_id)) = ?', [$branchId])
                ->count();
            abort_if($assignedEmployees > 0, 409, sprintf(
                'Cannot delete %s while %d employee%s assigned. Reassign them or mark the branch inactive.',
                $branchId,
                $assignedEmployees,
                $assignedEmployees === 1 ? ' is' : 's are',
            ));

            EmployeeAppCredential::query()
                ->whereRaw('UPPER(TRIM(branch_id)) = ?', [$branchId])
                ->delete();
            $deleted = [
                'id' => (int) $branch->id,
                'branchId' => trim((string) $branch->branchId),
                'name' => trim((string) $branch->branchName),
            ];
            $branch->delete();

            return $deleted;
        });

        Cache::forget('attendance:branches:all');
        Cache::forget('attendance:branches:active');

        return response()->json([
            'deleted' => true,
            'message' => sprintf('%s deleted successfully.', $deleted['branchId']),
            'branch' => $deleted,
        ]);
    }

    public function directory(Request $request): JsonResponse
    {
        $this->authorizeIntegration($request);

        $credentialAssignments = EmployeeAppCredential::query()
            ->get(['employee_id', 'branch_id'])
            ->mapWithKeys(fn (EmployeeAppCredential $credential): array => [
                ((int) $credential->employee_id).'|'.trim((string) $credential->branch_id) => true,
            ]);

        $employees = Employee::query()
            ->orderBy('empId')
            ->get(['id', 'empId', 'name', 'designation', 'contact', 'status', 'assigned_branch_id'])
            ->map(fn (Employee $employee): array => [
                'id' => (int) $employee->id,
                'employeeId' => trim((string) $employee->empId),
                'name' => trim((string) $employee->name),
                'designation' => trim((string) $employee->designation),
                'contact' => trim((string) $employee->contact),
                'status' => trim((string) $employee->status),
                'assignedBranchId' => $this->nullableClean($employee->assigned_branch_id),
                'hasPassword' => isset($credentialAssignments[((int) $employee->id).'|'.trim((string) $employee->assigned_branch_id)]),
            ])
            ->values();

        $branches = Branch::query()
            ->orderBy('branchName')
            ->get(['id', 'branchId', 'branchName', 'city', 'status'])
            ->map(fn (Branch $branch): array => [
                'id' => (int) $branch->id,
                'branchId' => trim((string) $branch->branchId),
                'branchName' => trim((string) $branch->branchName),
                'city' => trim((string) $branch->city),
                'status' => (bool) $branch->status,
            ])
            ->values();

        return response()->json(compact('employees', 'branches'));
    }

    public function assign(Request $request): JsonResponse
    {
        $this->authorizeIntegration($request);
        $data = $request->validate([
            'employeeId' => ['required', 'string', 'max:100'],
            'branchId' => ['required', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'min:6', 'max:255'],
        ]);

        $employeeId = trim($data['employeeId']);
        $branchId = trim($data['branchId']);
        $employee = Employee::query()->whereRaw('TRIM(empId) = ?', [$employeeId])->firstOrFail();
        $branch = Branch::query()->whereRaw('TRIM(branchId) = ?', [$branchId])->where('status', 1)->firstOrFail();
        $password = (string) ($data['password'] ?? '');

        DB::transaction(function () use ($employee, $employeeId, $branchId, $password): void {
            $employee->assigned_branch_id = $branchId;
            $employee->save();

            if ($password === '') {
                return;
            }

            $passwordHash = Hash::make($password);
            $passwordSetAt = Carbon::now(config('app.timezone', 'Asia/Kolkata'));
            $credential = EmployeeAppCredential::query()->firstOrNew([
                'emp_id' => $employeeId,
                'branch_id' => $branchId,
            ]);
            $credential->employee_id = $employee->id;
            $credential->password_hash = $passwordHash;
            $credential->password_set_at = $passwordSetAt;
            $credential->save();
            EmployeeAppCredential::query()
                ->where('employee_id', $employee->id)
                ->update(['password_hash' => $passwordHash, 'password_set_at' => $passwordSetAt]);
            $employee->tokens()->delete();
        });

        return response()->json([
            'message' => sprintf('%s is assigned to %s.%s', trim((string) $employee->name), trim((string) $branch->branchName), $password !== '' ? ' Password updated.' : ''),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $this->authorizeIntegration($request);
        $data = $request->validate([
            'employeeId' => ['required', 'string', 'max:100'],
            'branchId' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $employeeId = trim($data['employeeId']);
        $branchId = trim($data['branchId']);
        $employee = Employee::query()->whereRaw('TRIM(empId) = ?', [$employeeId])->first();

        if (! $employee) {
            throw ValidationException::withMessages([
                'employeeId' => ['Incorrect employee ID or password.'],
            ]);
        }

        if ($employee->isInactive()) {
            throw ValidationException::withMessages([
                'employeeId' => ['This employee account is inactive. Contact an administrator.'],
            ]);
        }

        $assignedBranchId = trim((string) $employee->assigned_branch_id);
        if ($assignedBranchId === '') {
            throw ValidationException::withMessages([
                'branchId' => ['This employee is not assigned to a branch. Ask an administrator to assign one.'],
            ]);
        }

        $branch = Branch::query()->whereRaw('TRIM(branchId) = ?', [$branchId])->where('status', 1)->first();
        if (! $branch) {
            throw ValidationException::withMessages([
                'branchId' => ['The branch ID is invalid or the branch is inactive.'],
            ]);
        }

        if (! hash_equals($assignedBranchId, $branchId)) {
            throw ValidationException::withMessages([
                'branchId' => ['This employee is not assigned to the selected branch.'],
            ]);
        }

        $credential = EmployeeAppCredential::query()
            ->where('employee_id', $employee->id)
            ->whereRaw('TRIM(branch_id) = ?', [$branchId])
            ->first();
        if (! $credential) {
            throw ValidationException::withMessages([
                'password' => ['A branch login password has not been set for this employee. Contact an administrator.'],
            ]);
        }

        if (! Hash::check((string) $data['password'], $credential->password_hash)) {
            throw ValidationException::withMessages([
                'employeeId' => ['Incorrect employee ID or password.'],
            ]);
        }

        $credential->last_login_at = Carbon::now(config('app.timezone', 'Asia/Kolkata'));
        $credential->save();

        return response()->json([
            'employee' => [
                'employeeId' => $employeeId,
                'name' => trim((string) $employee->name),
                'designation' => trim((string) $employee->designation),
            ],
            'branch' => [
                'branchId' => $branchId,
                'branchName' => trim((string) $branch->branchName),
            ],
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $this->authorizeIntegration($request);
        $data = $request->validate([
            'employeeId' => ['required', 'string', 'max:100'],
            'branchId' => ['required', 'string', 'max:100'],
            'currentPassword' => ['required', 'string', 'max:255'],
            'newPassword' => ['required', 'string', 'min:8', 'max:255', 'different:currentPassword'],
        ]);

        $employeeId = trim($data['employeeId']);
        $branchId = trim($data['branchId']);
        $employee = Employee::query()->whereRaw('TRIM(empId) = ?', [$employeeId])->first();

        if (! $employee || $employee->isInactive()) {
            throw ValidationException::withMessages([
                'currentPassword' => ['Current password is incorrect.'],
            ]);
        }

        if (! hash_equals(trim((string) $employee->assigned_branch_id), $branchId)) {
            throw ValidationException::withMessages([
                'branchId' => ['This employee is not assigned to the selected branch.'],
            ]);
        }

        $credential = EmployeeAppCredential::query()
            ->where('employee_id', $employee->id)
            ->whereRaw('TRIM(branch_id) = ?', [$branchId])
            ->first();

        if (! $credential || ! Hash::check((string) $data['currentPassword'], $credential->password_hash)) {
            throw ValidationException::withMessages([
                'currentPassword' => ['Current password is incorrect.'],
            ]);
        }

        $passwordHash = Hash::make((string) $data['newPassword']);
        $passwordSetAt = Carbon::now(config('app.timezone', 'Asia/Kolkata'));
        EmployeeAppCredential::query()
            ->where('employee_id', $employee->id)
            ->update(['password_hash' => $passwordHash, 'password_set_at' => $passwordSetAt]);
        $employee->tokens()->delete();

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }

    private function authorizeIntegration(Request $request): void
    {
        $configured = (string) config('services.aryangold_business.integration_key');
        if ($configured === '') {
            abort(503, 'Business integration is not configured.');
        }

        $provided = (string) $request->header('X-Aryan-Integration-Key', '');
        abort_unless($provided !== '' && hash_equals($configured, $provided), 401, 'Invalid integration credentials.');
    }

    private function branchDirectoryPayload(Branch $branch): array
    {
        return [
            'id' => (int) $branch->id,
            'branchId' => trim((string) $branch->branchId),
            'branchName' => trim((string) $branch->branchName),
            'address' => trim((string) $branch->addressline),
            'area' => trim((string) $branch->area),
            'city' => trim((string) $branch->city),
            'state' => trim((string) $branch->state),
            'pincode' => trim((string) $branch->pincode),
            'timings' => trim((string) $branch->timings),
            'latitude' => is_numeric($branch->latitude) ? (float) $branch->latitude : null,
            'longitude' => is_numeric($branch->longitude) ? (float) $branch->longitude : null,
            'url' => trim((string) $branch->url),
            'status' => (bool) $branch->status,
        ];
    }

    private function nullableClean(mixed $value): ?string
    {
        $clean = trim((string) $value);
        return $clean === '' ? null : $clean;
    }
}

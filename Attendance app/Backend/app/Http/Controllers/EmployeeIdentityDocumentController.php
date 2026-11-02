<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeDetail;
use App\Models\EmployeeIdentityDetailRequest;
use App\Support\IdentityDocumentStorage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EmployeeIdentityDocumentController extends Controller
{
    public function show(Employee $employee, string $type): BinaryFileResponse
    {
        $type = IdentityDocumentStorage::normalizedType($type);
        $detail = $this->employeeDetail($employee);
        $path = $type === 'aadhaar' ? $detail?->aadhaarDoc : $detail?->panDoc;

        return $this->fileResponse($path);
    }

    public function adminCurrent(Employee $employee, string $type): BinaryFileResponse
    {
        return $this->show($employee, $type);
    }

    public function adminRequested(
        EmployeeIdentityDetailRequest $requestRecord,
        string $type
    ): BinaryFileResponse {
        $type = IdentityDocumentStorage::normalizedType($type);
        $path = $type === 'aadhaar'
            ? $requestRecord->requested_aadhaar_doc
            : $requestRecord->requested_pan_doc;

        return $this->fileResponse($path);
    }

    private function fileResponse(?string $path): BinaryFileResponse
    {
        $path = trim((string) $path);
        abort_unless(IdentityDocumentStorage::exists($path), 404);

        return response()->file(IdentityDocumentStorage::absolutePath($path), [
            'Content-Type' => $this->contentType($path),
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function contentType(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };
    }

    private function employeeDetail(Employee $employee): ?EmployeeDetail
    {
        return EmployeeDetail::query()
            ->whereRaw('TRIM(employeeId) = ?', [trim((string) $employee->empId)])
            ->latest('id')
            ->first();
    }
}

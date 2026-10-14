<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\View\View;

class EmployeeDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employee = $request->user();
        abort_unless($employee instanceof Employee, 401);

        $documents = EmployeeDocument::query()
            ->where('employee_id', $employee->getKey())
            ->latest('created_at')
            ->get()
            ->map(fn (EmployeeDocument $document): array => [
                'id' => $document->id,
                'type' => $document->document_type,
                'title' => $document->displayTitle(),
                'payPeriod' => $document->pay_period,
                'fileName' => $document->original_name,
                'uploadedAt' => $document->created_at?->toIso8601String(),
                'downloadUrl' => URL::temporarySignedRoute(
                    'employee.documents.download',
                    now()->addMinutes(15),
                    ['employee' => $employee->getKey(), 'document' => $document->getKey()],
                    false
                ),
            ])
            ->values();

        return response()->json(['documents' => $documents]);
    }

    public function download(Employee $employee, EmployeeDocument $document)
    {
        abort_unless((int) $document->employee_id === (int) $employee->getKey(), 404);

        return $this->downloadFile($document);
    }

    public function adminIndex(Employee $employee): View
    {
        $documents = EmployeeDocument::query()
            ->where('employee_id', $employee->getKey())
            ->latest('created_at')
            ->get();
        $documentTypes = EmployeeDocument::documentTypes();

        return view('admin.employee.documents', compact('employee', 'documents', 'documentTypes'));
    }

    public function adminDirectory(Request $request): View
    {
        $search = trim((string) $request->query('search'));
        $employees = Employee::query()
            ->select(['id', 'empId', 'name', 'designation', 'status'])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($employeeQuery) use ($search): void {
                    $employeeQuery->where('empId', 'like', '%'.$search.'%')
                        ->orWhere('name', 'like', '%'.$search.'%');
                });
            })
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();
        $documentCounts = EmployeeDocument::query()
            ->whereIn('employee_id', $employees->getCollection()->pluck('id'))
            ->selectRaw('employee_id, COUNT(*) as document_count')
            ->groupBy('employee_id')
            ->pluck('document_count', 'employee_id');

        return view('admin.employee.document_directory', compact('employees', 'documentCounts', 'search'));
    }

    public function store(Request $request, Employee $employee): RedirectResponse
    {
        $data = $request->validate([
            'document_type' => ['required', 'string', 'in:'.implode(',', array_keys(EmployeeDocument::documentTypes()))],
            'title' => ['nullable', 'string', 'max:150'],
            'pay_period' => [
                'nullable',
                'required_if:document_type,payslip',
                'regex:/^\\d{4}-(0[1-9]|1[0-2])$/',
            ],
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,doc,docx'],
        ], [
            'pay_period.required_if' => 'Choose the month and year for this payslip.',
            'file.mimes' => 'Upload a PDF, DOC, or DOCX document.',
            'file.max' => 'The document must be 20 MB or smaller.',
        ]);

        $file = $request->file('file');
        $path = $file->store('private/employee-documents/'.$employee->getKey(), 'local');

        if (! is_string($path) || $path === '') {
            return back()->withErrors(['file' => 'The document could not be saved. Please try again.'])->withInput();
        }

        $originalName = basename(str_replace('\\', '/', (string) $file->getClientOriginalName()));
        $originalName = preg_replace('/[\\x00-\\x1F\\x7F]/u', '', $originalName) ?: 'employee-document';

        try {
            EmployeeDocument::query()->create([
                'employee_id' => $employee->getKey(),
                'document_type' => $data['document_type'],
                'title' => trim((string) ($data['title'] ?? '')) ?: null,
                'pay_period' => $data['document_type'] === 'payslip' ? $data['pay_period'] : null,
                'original_name' => mb_substr($originalName, 0, 255),
                'storage_path' => $path,
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'file_size' => (int) $file->getSize(),
                'uploaded_by' => $request->user('admin')?->getKey(),
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return redirect()
            ->route('admin-employee-documents', $employee)
            ->with('status', 'Employee document uploaded.');
    }

    public function adminDownload(Employee $employee, EmployeeDocument $document)
    {
        abort_unless((int) $document->employee_id === (int) $employee->getKey(), 404);

        return $this->downloadFile($document);
    }

    public function destroy(Employee $employee, EmployeeDocument $document): RedirectResponse
    {
        abort_unless((int) $document->employee_id === (int) $employee->getKey(), 404);

        Storage::disk('local')->delete($document->storage_path);
        $document->delete();

        return redirect()
            ->route('admin-employee-documents', $employee)
            ->with('status', 'Employee document deleted.');
    }

    private function downloadFile(EmployeeDocument $document)
    {
        abort_unless(Storage::disk('local')->exists($document->storage_path), 404);

        return Storage::disk('local')->download(
            $document->storage_path,
            $document->original_name,
            [
                'Content-Type' => $document->mime_type ?: 'application/octet-stream',
                'Cache-Control' => 'private, no-store',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }
}

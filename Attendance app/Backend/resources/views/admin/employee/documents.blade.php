@extends('admin.layout.app')
@section('content')
    <div class="main-content">
        <div class="page-breadcrumb d-flex align-items-center mb-3">
            <div>
                <div class="breadcrumb-title pe-3">Employee Documents</div>
                <div class="text-muted small">{{ $employee->name }} · Employee ID {{ $employee->empId }}</div>
            </div>
            <div class="ms-auto">
                <a href="{{ route('admin-employee-edit', $employee->id) }}" class="btn btn-outline-secondary">Back to employee</a>
            </div>
        </div>

        @if (session('status'))
            <div class="alert alert-success" role="status">{{ session('status') }}</div>
        @endif

        <div class="row g-3">
            <div class="col-12 col-xl-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Upload a document</h5>
                        <p class="text-muted small">Only this employee can download these private files. PDF, DOC, or DOCX up to 20 MB.</p>
                        <form method="post" action="{{ route('admin-employee-documents-store', $employee->id) }}" enctype="multipart/form-data">
                            @csrf
                            <div class="mb-3">
                                <label for="document_type" class="form-label">Document type</label>
                                <select id="document_type" name="document_type" class="form-select" required>
                                    <option value="">Choose a type</option>
                                    @foreach ($documentTypes as $value => $label)
                                        <option value="{{ $value }}" @selected(old('document_type') === $value)>{{ $label }}</option>
                                    @endforeach
                                </select>
                                @error('document_type') <div class="text-danger small mt-1">{{ $message }}</div> @enderror
                            </div>
                            <div class="mb-3">
                                <label for="title" class="form-label">Display title <span class="text-muted">(optional)</span></label>
                                <input id="title" name="title" class="form-control" maxlength="150" value="{{ old('title') }}" placeholder="Example: Offer letter — Sales Associate">
                                @error('title') <div class="text-danger small mt-1">{{ $message }}</div> @enderror
                            </div>
                            <div id="payPeriodField" class="mb-3" hidden>
                                <label for="pay_period" class="form-label">Payslip month</label>
                                <input id="pay_period" name="pay_period" type="month" class="form-control" value="{{ old('pay_period') }}">
                                @error('pay_period') <div class="text-danger small mt-1">{{ $message }}</div> @enderror
                            </div>
                            <div class="mb-3">
                                <label for="file" class="form-label">File</label>
                                <input id="file" name="file" type="file" class="form-control" accept=".pdf,.doc,.docx" required>
                                @error('file') <div class="text-danger small mt-1">{{ $message }}</div> @enderror
                            </div>
                            <button type="submit" class="btn btn-primary">Upload document</button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-12 col-xl-8">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Available documents</h5>
                        @if ($documents->isEmpty())
                            <p class="text-muted mb-0">No employee documents have been uploaded.</p>
                        @else
                            <div class="table-responsive">
                                <table class="table align-middle">
                                    <thead>
                                        <tr><th>Document</th><th>File</th><th>Uploaded</th><th class="text-end">Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($documents as $document)
                                            <tr>
                                                <td>
                                                    <div class="fw-semibold">{{ $document->displayTitle() }}</div>
                                                    <div class="text-muted small">{{ $documentTypes[$document->document_type] ?? 'Employee document' }}</div>
                                                </td>
                                                <td class="text-break">{{ $document->original_name }}</td>
                                                <td>{{ $document->created_at?->format('d M Y') }}</td>
                                                <td class="text-end text-nowrap">
                                                    <a class="btn btn-sm btn-outline-primary" href="{{ route('admin-employee-documents-download', [$employee->id, $document->id]) }}">Download</a>
                                                    <form method="post" action="{{ route('admin-employee-documents-destroy', [$employee->id, $document->id]) }}" class="d-inline" onsubmit="return confirm('Delete this employee document?');">
                                                        @csrf
                                                        @method('DELETE')
                                                        <button type="submit" class="btn btn-sm btn-outline-danger">Delete</button>
                                                    </form>
                                                </td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const type = document.getElementById('document_type');
            const periodField = document.getElementById('payPeriodField');
            const period = document.getElementById('pay_period');
            const updatePeriodField = function () {
                const isPayslip = type.value === 'payslip';
                periodField.hidden = !isPayslip;
                period.required = isPayslip;
            };
            type.addEventListener('change', updatePeriodField);
            updatePeriodField();
        });
    </script>
@endsection

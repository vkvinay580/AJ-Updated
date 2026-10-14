@extends('admin.layout.app')
@section('content')
    <div class="main-content">
        <div class="page-breadcrumb d-flex align-items-center mb-3">
            <div>
                <div class="breadcrumb-title pe-3">Employee Documents</div>
                <div class="text-muted small">Search for an employee to upload or manage their documents.</div>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <form method="get" action="{{ route('admin-employee-documents-directory') }}" class="row g-2 mb-3">
                    <div class="col-sm-8 col-lg-5">
                        <label for="employeeSearch" class="visually-hidden">Search employees</label>
                        <input id="employeeSearch" name="search" value="{{ $search }}" class="form-control" placeholder="Search by employee name or ID">
                    </div>
                    <div class="col-auto"><button class="btn btn-primary" type="submit">Search</button></div>
                    @if ($search !== '')
                        <div class="col-auto"><a class="btn btn-outline-secondary" href="{{ route('admin-employee-documents-directory') }}">Clear</a></div>
                    @endif
                </form>

                @if ($employees->isEmpty())
                    <p class="text-muted mb-0">No employees matched this search.</p>
                @else
                    <div class="table-responsive">
                        <table class="table align-middle">
                            <thead><tr><th>Employee</th><th>Employee ID</th><th>Status</th><th>Documents</th><th class="text-end">Action</th></tr></thead>
                            <tbody>
                                @foreach ($employees as $employee)
                                    <tr>
                                        <td>
                                            <div class="fw-semibold">{{ $employee->name }}</div>
                                            @if ($employee->designation)<div class="text-muted small">{{ $employee->designation }}</div>@endif
                                        </td>
                                        <td>{{ $employee->empId }}</td>
                                        <td>{{ $employee->status ?: '—' }}</td>
                                        <td>{{ (int) ($documentCounts[$employee->id] ?? 0) }}</td>
                                        <td class="text-end">
                                            <a href="{{ route('admin-employee-documents', $employee->id) }}" class="btn btn-sm btn-outline-primary">Manage documents</a>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                    <div>{{ $employees->links() }}</div>
                @endif
            </div>
        </div>
    </div>
@endsection

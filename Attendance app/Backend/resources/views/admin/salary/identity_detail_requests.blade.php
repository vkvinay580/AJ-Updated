@extends('admin.layout.app')

@section('content')
    @include('admin.attendance.partials.styles')

    @php
        $activeTab = $filters['tab'] ?? 'pending_approval';
        $tabLinks = [
            'verification' => ['label' => 'Verification', 'count' => $summary['pending_verification']],
            'pending_approval' => ['label' => 'Pending Approval', 'count' => $summary['pending_approval']],
            'approved' => ['label' => 'Approved / Verified', 'count' => $summary['approved_waiting'] + $summary['verified']],
        ];
    @endphp

    <div class="main-content attendance-page">
        <div class="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
            <div class="breadcrumb-title pe-3">Employee</div>
            <div class="ps-3">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-0 p-0">
                        <li class="breadcrumb-item"><a href="{{ route('admin-dashboard') }}"><i class="bx bx-home-alt"></i></a></li>
                        <li class="breadcrumb-item active" aria-current="page">Edit Request Access</li>
                    </ol>
                </nav>
            </div>
        </div>

        @if (session('status'))
            <div class="alert alert-success border-0">{{ session('status') }}</div>
        @endif

        <div class="d-flex flex-wrap gap-2 mb-4">
            <a href="{{ route('admin-bank-detail-requests') }}" class="btn btn-outline-primary">Bank Detail Requests</a>
            <a href="{{ route('admin-identity-detail-requests') }}" class="btn btn-primary">Aadhaar / PAN Requests</a>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-lg-3 col-md-6"><div class="card rounded-4 mb-0 attendance-stat-card"><div class="card-body"><p class="mb-1">Pending Verification</p><h4 class="mb-0">{{ $summary['pending_verification'] }}</h4></div></div></div>
            <div class="col-lg-3 col-md-6"><div class="card rounded-4 mb-0 attendance-stat-card"><div class="card-body"><p class="mb-1">Pending Approval</p><h4 class="mb-0">{{ $summary['pending_approval'] }}</h4></div></div></div>
            <div class="col-lg-3 col-md-6"><div class="card rounded-4 mb-0 attendance-stat-card"><div class="card-body"><p class="mb-1">Approved, Waiting For Employee</p><h4 class="mb-0">{{ $summary['approved_waiting'] }}</h4></div></div></div>
            <div class="col-lg-3 col-md-6"><div class="card rounded-4 mb-0 attendance-stat-card"><div class="card-body"><p class="mb-1">Verified</p><h4 class="mb-0">{{ $summary['verified'] }}</h4></div></div></div>
        </div>

        <div class="card rounded-4 mb-4">
            <div class="card-body">
                <ul class="nav nav-tabs mb-3">
                    @foreach ($tabLinks as $tabKey => $tab)
                        <li class="nav-item">
                            <a class="nav-link {{ $activeTab === $tabKey ? 'active' : '' }}" href="{{ route('admin-identity-detail-requests', ['tab' => $tabKey, 'emp_id' => $filters['emp_id']]) }}">
                                {{ $tab['label'] }} <span class="badge bg-secondary ms-1">{{ $tab['count'] }}</span>
                            </a>
                        </li>
                    @endforeach
                </ul>
                <form method="get" class="row g-3 align-items-end">
                    <input type="hidden" name="tab" value="{{ $activeTab }}">
                    <div class="col-md-4">
                        <label class="form-label">Employee ID</label>
                        <input type="text" name="emp_id" value="{{ $filters['emp_id'] }}" class="form-control" placeholder="Optional">
                    </div>
                    <div class="col-md-4 d-flex gap-2">
                        <button type="submit" class="btn btn-primary w-100">Apply</button>
                        <a href="{{ route('admin-identity-detail-requests', ['tab' => $activeTab]) }}" class="btn btn-outline-secondary w-100">Reset</a>
                    </div>
                </form>
            </div>
        </div>

        <div class="card rounded-4">
            <div class="card-body">
                <div class="mb-3">
                    <h5 class="mb-1 attendance-title">Employee Aadhaar / PAN Edit Requests</h5>
                    <p class="mb-0 attendance-muted">Approve edit access first. Existing values stay unchanged until the submitted correction is verified.</p>
                </div>
                <div class="table-responsive">
                    <table class="table table-bordered table-hover align-middle" data-admin-datatable="true">
                        <thead><tr><th>Created</th><th>Emp ID</th><th>Name</th><th>Status</th><th>Current Details</th><th>Requested Details</th><th>Notes</th><th>Timeline</th><th>Action</th></tr></thead>
                        <tbody>
                            @forelse ($rows as $row)
                                <tr>
                                    <td>{{ $row['created_at'] }}</td>
                                    <td>{{ $row['emp_id'] }}</td>
                                    <td><div>{{ $row['employee_name'] }}</div><small class="text-muted">{{ $row['designation'] }}</small></td>
                                    <td><span class="attendance-status-pill {{ strtolower($row['status']) }}">{{ ucfirst($row['status']) }}</span></td>
                                    <td style="min-width: 230px;">
                                        <div><strong>Aadhaar:</strong> {{ $row['current_aadhaar_no'] ?: '--' }}</div>
                                        @if ($row['current_aadhaar_image'])<a class="btn btn-outline-secondary btn-sm my-1" target="_blank" rel="noopener" href="{{ route('admin-identity-detail-documents-current', ['employee' => $row['employee_id'], 'type' => 'aadhaar']) }}">View Aadhaar image</a>@endif
                                        <div><strong>PAN:</strong> {{ $row['current_pan_no'] ?: '--' }}</div>
                                        @if ($row['current_pan_image'])<a class="btn btn-outline-secondary btn-sm mt-1" target="_blank" rel="noopener" href="{{ route('admin-identity-detail-documents-current', ['employee' => $row['employee_id'], 'type' => 'pan']) }}">View PAN image</a>@endif
                                    </td>
                                    <td style="min-width: 230px;">
                                        <div><strong>Aadhaar:</strong> {{ $row['requested_aadhaar_no'] ?: '--' }}</div>
                                        @if ($row['requested_aadhaar_image'])<a class="btn btn-outline-primary btn-sm my-1" target="_blank" rel="noopener" href="{{ route('admin-identity-detail-documents-requested', ['requestRecord' => $row['id'], 'type' => 'aadhaar']) }}">Review Aadhaar image</a>@endif
                                        <div><strong>PAN:</strong> {{ $row['requested_pan_no'] ?: '--' }}</div>
                                        @if ($row['requested_pan_image'])<a class="btn btn-outline-primary btn-sm mt-1" target="_blank" rel="noopener" href="{{ route('admin-identity-detail-documents-requested', ['requestRecord' => $row['id'], 'type' => 'pan']) }}">Review PAN image</a>@endif
                                    </td>
                                    <td style="min-width: 240px;"><div><strong>Employee:</strong> {{ $row['request_note'] ?: '--' }}</div><div class="mt-2"><strong>Admin:</strong> {{ $row['admin_note'] ?: '--' }}</div></td>
                                    <td style="min-width: 220px;"><div><strong>Approved:</strong> {{ $row['approved_at'] }}</div><div><strong>Submitted:</strong> {{ $row['submitted_at'] }}</div><div><strong>Verified:</strong> {{ $row['verified_at'] }}</div></td>
                                    <td style="min-width: 260px;">
                                        @if ($row['status'] === 'pending')
                                            <form method="post" action="{{ route('admin-identity-detail-requests-approve', $row['id']) }}" class="mb-2">@csrf<textarea name="admin_note" class="form-control mb-2" rows="2" placeholder="Optional approval note"></textarea><button type="submit" class="btn btn-success btn-sm w-100">Approve Edit Access</button></form>
                                            <form method="post" action="{{ route('admin-identity-detail-requests-reject', $row['id']) }}">@csrf<textarea name="admin_note" class="form-control mb-2" rows="2" placeholder="Reason for rejection"></textarea><button type="submit" class="btn btn-danger btn-sm w-100">Reject</button></form>
                                        @elseif ($row['status'] === 'submitted')
                                            <form method="post" action="{{ route('admin-identity-detail-requests-verify', $row['id']) }}" class="mb-2">@csrf<textarea name="admin_note" class="form-control mb-2" rows="2" placeholder="Optional verification note"></textarea><button type="submit" class="btn btn-primary btn-sm w-100">Verify Aadhaar / PAN</button></form>
                                            <form method="post" action="{{ route('admin-identity-detail-requests-reject', $row['id']) }}">@csrf<textarea name="admin_note" class="form-control mb-2" rows="2" placeholder="Reason for rejection"></textarea><button type="submit" class="btn btn-danger btn-sm w-100">Reject</button></form>
                                        @elseif ($row['status'] === 'approved')
                                            <div class="text-muted mb-2">Waiting for the employee to submit corrected details in the app.</div>
                                            <form method="post" action="{{ route('admin-identity-detail-requests-reject', $row['id']) }}">@csrf<textarea name="admin_note" class="form-control mb-2" rows="2" placeholder="Reason for rejection"></textarea><button type="submit" class="btn btn-danger btn-sm w-100">Reject</button></form>
                                        @else
                                            <span class="text-muted">No action available.</span>
                                        @endif
                                    </td>
                                </tr>
                            @empty
                                <tr><td colspan="9" class="text-center text-muted py-4">No Aadhaar/PAN requests found.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
@endsection

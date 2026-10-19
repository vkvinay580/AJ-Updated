<div class="{{ $columnClass ?? 'col-lg-6' }}">
    <label class="form-label" for="preferredWorkBranch">Preferred Work Location / Branch</label>
    <select name="preferred_work_location_branch_id" class="form-select" id="preferredWorkBranch" required>
        <option value="">Select an available branch</option>
        @foreach ($branches as $branch)
            <option value="{{ trim((string) $branch->branchId) }}" @selected((string) $selectedBranchId === trim((string) $branch->branchId))>
                {{ $branch->branchName }} — {{ $branch->branchId }}{{ $branch->city ? ', '.$branch->city : '' }}{{ $branch->state ? ', '.$branch->state : '' }}
            </option>
        @endforeach
    </select>
    <div class="form-text">Choose from our currently active branches.</div>
    @if ($branches->isEmpty())
        <div class="text-danger small">No branches are available. Please contact the hiring/joining team.</div>
    @elseif ($previousLocationLabel && ! $branches->contains(fn ($branch) => trim((string) $branch->branchId) === (string) $selectedBranchId))
        <div class="form-text">Previous preference: {{ $previousLocationLabel }}. Please choose an available branch.</div>
    @endif
</div>

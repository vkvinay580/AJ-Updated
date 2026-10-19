@extends('admin.layout.app')
@section('content')
    <div class="main-content">


        <div class="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
            <div class="breadcrumb-title pe-3">Admin</div>
            <div class="ps-3">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-0 p-0">
                        <li class="breadcrumb-item"><a href="javascript:;"><i class="bx bx-home-alt"></i></a>
                        </li>
                        <li class="breadcrumb-item active" aria-current="page">Change Password</li>
                    </ol>
                </nav>
            </div>
            <div class="ms-auto">

            </div>
        </div>
        <!--end breadcrumb-->
        <div class="row">
            <div class="col-xl-12 mx-auto">
                <hr>
                <div class="card">
                    <div class="card-body">
                        <form action="{{ route('admin-password-update') }}" method="post">
                            @csrf


                            @if (session('status'))
                                <div class="alert alert-success" role="alert">
                                    {{ session('status') }}
                                </div>
                            @elseif(session('error'))
                                <div class="alert alert-danger" role="alert">
                                    {{ session('error') }}
                                </div>
                            @endif

                            <div class="mb-3">
                                <label for="old_password" class="form-label">Old Password</label>
                                <div class="input-group">
                                    <input class="form-control" id="old_password" type="password" name="old_password"
                                        placeholder="Enter Old Password" autocomplete="current-password" required>
                                    <button class="btn btn-outline-secondary password-visibility-toggle" type="button"
                                        data-password-target="old_password" aria-label="Show old password" aria-pressed="false">
                                        <i class="bx bx-show" aria-hidden="true"></i>
                                    </button>
                                </div>
                                @error('old_password')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>


                            <div class="mb-3">
                                <label for="new_password" class="form-label">New Password</label>
                                <div class="input-group">
                                    <input class="form-control" id="new_password" type="password" name="new_password"
                                        placeholder="Enter New Password" autocomplete="new-password" required>
                                    <button class="btn btn-outline-secondary password-visibility-toggle" type="button"
                                        data-password-target="new_password" aria-label="Show new password" aria-pressed="false">
                                        <i class="bx bx-show" aria-hidden="true"></i>
                                    </button>
                                </div>
                                @error('new_password')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>


                            <div class="mb-3">
                                <label for="new_password_confirmation" class="form-label">Confirm Password</label>
                                <div class="input-group">
                                    <input class="form-control" id="new_password_confirmation" type="password"
                                        name="new_password_confirmation" placeholder="Confirm New Password"
                                        autocomplete="new-password" required>
                                    <button class="btn btn-outline-secondary password-visibility-toggle" type="button"
                                        data-password-target="new_password_confirmation"
                                        aria-label="Show confirmation password" aria-pressed="false">
                                        <i class="bx bx-show" aria-hidden="true"></i>
                                    </button>
                                </div>
                                @error('new_password_confirmation')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>


                            <div class="mb-3">
                                <button type="submit" class="btn btn-grd btn-grd-success px-5">Change Password</button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
        <!--end row-->
    </div>

    <script>
        document.querySelectorAll('.password-visibility-toggle').forEach(function (button) {
            button.addEventListener('click', function () {
                var input = document.getElementById(button.dataset.passwordTarget);

                if (!input) {
                    return;
                }

                var shouldShow = input.type === 'password';
                input.type = shouldShow ? 'text' : 'password';
                button.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
                button.setAttribute('aria-label', (shouldShow ? 'Hide ' : 'Show ') + input.labels[0].textContent.toLowerCase());

                var icon = button.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bx-show', !shouldShow);
                    icon.classList.toggle('bx-hide', shouldShow);
                }
            });
        });
    </script>
@endsection

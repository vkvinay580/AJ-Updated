<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeIdentityDetailRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_VERIFIED = 'verified';

    protected $fillable = [
        'employee_id',
        'emp_id',
        'status',
        'request_note',
        'admin_note',
        'requested_aadhaar_no',
        'requested_aadhaar_doc',
        'requested_pan_no',
        'requested_pan_doc',
        'approved_by',
        'approved_at',
        'verified_by',
        'verified_at',
        'submitted_at',
    ];

    protected $casts = [
        'requested_aadhaar_no' => EncryptedString::class,
        'requested_pan_no' => EncryptedString::class,
        'approved_at' => 'datetime',
        'verified_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}

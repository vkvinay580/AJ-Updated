<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeDocument extends Model
{
    protected $fillable = [
        'employee_id',
        'document_type',
        'title',
        'pay_period',
        'original_name',
        'storage_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    protected $casts = [
        'employee_id' => 'integer',
        'file_size' => 'integer',
        'uploaded_by' => 'integer',
    ];

    public static function documentTypes(): array
    {
        return [
            'offer_letter' => 'Offer letter',
            'payslip' => 'Payslip',
            'experience_letter' => 'Experience letter',
            'relieving_letter' => 'Relieving letter',
        ];
    }

    public function displayTitle(): string
    {
        $title = trim((string) $this->title);

        if ($title !== '') {
            return $title;
        }

        $type = self::documentTypes()[$this->document_type] ?? 'Employee document';

        return $this->document_type === 'payslip' && $this->pay_period
            ? $type.' — '.date('F Y', strtotime($this->pay_period.'-01'))
            : $type;
    }
}

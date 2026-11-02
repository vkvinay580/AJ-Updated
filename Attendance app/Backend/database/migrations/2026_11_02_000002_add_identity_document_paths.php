<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employeedetails')) {
            Schema::table('employeedetails', function (Blueprint $table): void {
                if (! Schema::hasColumn('employeedetails', 'aadhaarDoc')) {
                    $table->string('aadhaarDoc', 500)->default('')->after('aadhaarNo');
                }
                if (! Schema::hasColumn('employeedetails', 'panDoc')) {
                    $table->string('panDoc', 500)->default('')->after('panNo');
                }
            });
        }

        if (Schema::hasTable('employee_identity_detail_requests')) {
            Schema::table('employee_identity_detail_requests', function (Blueprint $table): void {
                if (! Schema::hasColumn('employee_identity_detail_requests', 'requested_aadhaar_doc')) {
                    $table->string('requested_aadhaar_doc', 500)->nullable()->after('requested_aadhaar_no');
                }
                if (! Schema::hasColumn('employee_identity_detail_requests', 'requested_pan_doc')) {
                    $table->string('requested_pan_doc', 500)->nullable()->after('requested_pan_no');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('employee_identity_detail_requests')) {
            Schema::table('employee_identity_detail_requests', function (Blueprint $table): void {
                $columns = array_values(array_filter(
                    ['requested_aadhaar_doc', 'requested_pan_doc'],
                    fn (string $column): bool => Schema::hasColumn('employee_identity_detail_requests', $column)
                ));
                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('employeedetails')) {
            Schema::table('employeedetails', function (Blueprint $table): void {
                $columns = array_values(array_filter(
                    ['aadhaarDoc', 'panDoc'],
                    fn (string $column): bool => Schema::hasColumn('employeedetails', $column)
                ));
                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};

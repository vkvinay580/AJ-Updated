<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employeedetails') && ! Schema::hasColumn('employeedetails', 'uanNumber')) {
            Schema::table('employeedetails', function (Blueprint $table): void {
                $table->string('uanNumber', 30)->default('');
            });
        }

        if (Schema::hasTable('employee_bank_detail_requests') && ! Schema::hasColumn('employee_bank_detail_requests', 'requested_uan_number')) {
            Schema::table('employee_bank_detail_requests', function (Blueprint $table): void {
                $table->string('requested_uan_number', 30)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('employee_bank_detail_requests') && Schema::hasColumn('employee_bank_detail_requests', 'requested_uan_number')) {
            Schema::table('employee_bank_detail_requests', function (Blueprint $table): void {
                $table->dropColumn('requested_uan_number');
            });
        }

        if (Schema::hasTable('employeedetails') && Schema::hasColumn('employeedetails', 'uanNumber')) {
            Schema::table('employeedetails', function (Blueprint $table): void {
                $table->dropColumn('uanNumber');
            });
        }
    }
};

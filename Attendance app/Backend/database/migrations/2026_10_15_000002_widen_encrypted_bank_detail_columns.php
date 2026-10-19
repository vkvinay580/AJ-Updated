<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employee_bank_detail_requests')) {
            Schema::table('employee_bank_detail_requests', function (Blueprint $table): void {
                $table->text('requested_bank_ac_no')->nullable()->change();
                $table->text('requested_ifsc_code')->nullable()->change();
                $table->text('requested_uan_number')->nullable()->change();
            });
        }

        if (Schema::hasTable('employeedetails')) {
            Schema::table('employeedetails', function (Blueprint $table): void {
                $table->text('bankAcNo')->change();
                $table->text('ifscCode')->change();
                $table->text('aadhaarNo')->default('')->change();
                $table->text('panNo')->default('')->change();
                $table->text('uanNumber')->default('')->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('employee_bank_detail_requests')) {
            Schema::table('employee_bank_detail_requests', function (Blueprint $table): void {
                $table->string('requested_bank_ac_no', 50)->nullable()->change();
                $table->string('requested_ifsc_code', 30)->nullable()->change();
                $table->string('requested_uan_number', 30)->nullable()->change();
            });
        }

        if (Schema::hasTable('employeedetails')) {
            Schema::table('employeedetails', function (Blueprint $table): void {
                $table->string('bankAcNo', 50)->change();
                $table->string('ifscCode', 30)->change();
                $table->string('aadhaarNo', 20)->default('')->change();
                $table->string('panNo', 20)->default('')->change();
                $table->string('uanNumber', 30)->default('')->change();
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employee_identity_detail_requests')) {
            return;
        }

        Schema::create('employee_identity_detail_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('employee_id')->index();
            $table->string('emp_id', 50)->index();
            $table->string('status', 30)->default('pending')->index();
            $table->text('request_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->text('requested_aadhaar_no')->nullable();
            $table->text('requested_pan_no')->nullable();
            $table->string('approved_by', 100)->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->string('verified_by', 100)->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->dateTime('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'status'], 'identity_detail_employee_status_idx');
            $table->index(['status', 'created_at'], 'identity_detail_status_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_identity_detail_requests');
    }
};

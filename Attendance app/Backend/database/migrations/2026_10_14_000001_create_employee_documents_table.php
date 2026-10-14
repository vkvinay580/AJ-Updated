<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_documents', function (Blueprint $table): void {
            $table->bigIncrements('id');
            // The legacy employee table uses a signed INT primary key.
            $table->integer('employee_id')->index();
            $table->string('document_type', 40);
            $table->string('title', 150)->nullable();
            $table->string('pay_period', 7)->nullable();
            $table->string('original_name', 255);
            $table->string('storage_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'document_type', 'pay_period'], 'employee_documents_employee_type_period_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_documents');
    }
};

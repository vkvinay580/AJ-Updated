<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A previous deployment may have completed the schema change before the
        // migration record was written. In that case, let Laravel record this
        // migration without attempting to add deleted_at a second time.
        if (Schema::hasColumn('id_card_submissions', 'deleted_at')) {
            return;
        }

        Schema::table('id_card_submissions', function (Blueprint $table): void {
            $table->dropUnique('id_card_submissions_employee_id_unique');
            $table->dropUnique('id_card_submissions_emp_id_unique');
            $table->index('employee_id');
            $table->index('emp_id');
            $table->softDeletes()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('id_card_submissions', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropIndex(['employee_id']);
            $table->dropIndex(['emp_id']);
            $table->unique('employee_id');
            $table->unique('emp_id');
        });
    }
};

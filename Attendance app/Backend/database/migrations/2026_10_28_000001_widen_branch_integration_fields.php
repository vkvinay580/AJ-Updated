<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('wp_branches_database')) {
            return;
        }

        Schema::table('wp_branches_database', function (Blueprint $table): void {
            $table->string('addressline', 500)->change();
            $table->string('timings', 255)->nullable()->default('9:30 AM - 6:30 PM')->change();
            $table->text('url')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('wp_branches_database')) {
            return;
        }

        Schema::table('wp_branches_database', function (Blueprint $table): void {
            $table->string('addressline', 255)->change();
            $table->string('timings', 50)->nullable()->default('9:30 AM - 6:30 PM')->change();
            $table->tinyText('url')->nullable()->change();
        });
    }
};

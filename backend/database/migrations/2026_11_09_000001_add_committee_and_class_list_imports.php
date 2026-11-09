<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->string('role', 20)->default('admin'));
        Schema::table('students', function (Blueprint $table): void {
            $table->string('year_level', 50)->nullable();
            $table->string('section', 100)->nullable();
        });
        Schema::create('class_list_imports', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('file_name');
            $table->string('file_hash', 64);
            $table->longText('records')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('committed_at')->nullable();
            $table->unsignedInteger('inserted_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_list_imports');
        Schema::table('students', fn (Blueprint $table) => $table->dropColumn(['year_level', 'section']));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
    }
};

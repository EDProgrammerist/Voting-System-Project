<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->string('student_id', 50)->primary();
            $table->string('full_name');
            $table->enum('academic_status', [
                'enrolled',
                'graduated',
                'stopped',
                'inactive',
                'withdrawn',
            ])->default('enrolled');
            $table->timestamps();

            $table->index('academic_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
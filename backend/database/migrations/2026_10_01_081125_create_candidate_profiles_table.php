<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidate_profiles', function (Blueprint $table) {
            $table->string('student_id', 50)->primary();
            $table->string('full_name');
            $table->string('profile_photo')->nullable();
            $table->string('motto', 255)->nullable();
            $table->timestamps();

            $table->foreign('student_id')
                ->references('student_id')
                ->on('students')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_profiles');
    }
};
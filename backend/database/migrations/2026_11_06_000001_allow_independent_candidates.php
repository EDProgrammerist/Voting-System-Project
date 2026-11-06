<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidate_profiles', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
        });
    }

    public function down(): void
    {
        if (DB::table('candidate_profiles')->whereNotIn('student_id', DB::table('students')->select('student_id'))->exists()) {
            throw new RuntimeException('Independent candidates exist. Resolve these records before restoring the voter foreign key.');
        }
        Schema::table('candidate_profiles', function (Blueprint $table) {
            $table->foreign('student_id')->references('student_id')->on('students')->restrictOnDelete();
        });
    }
};

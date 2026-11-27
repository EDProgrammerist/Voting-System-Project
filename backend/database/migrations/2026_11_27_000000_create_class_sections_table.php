<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_sections', function (Blueprint $table): void {
            $table->id();
            $table->string('course', 100);
            $table->unsignedTinyInteger('year_level');
            $table->string('name', 100);
            $table->timestamps();
            $table->unique(['course', 'year_level', 'name']);
        });
        Schema::table('class_list_imports', fn (Blueprint $table) => $table->unsignedInteger('organized_count')->default(0));
        DB::table('students')->select('course', 'year_level', 'section')->distinct()->orderBy('course')->get()->each(function ($student): void {
            if (! preg_match('/^(?:year\s*)?([1-4])(?:st|nd|rd|th)?(?:\s*year)?$/i', trim($student->year_level ?? ''), $match)) {
                return;
            }
            $course = mb_strtoupper(trim($student->course ?? ''));
            $name = mb_strtoupper(trim($student->section ?? ''));
            if ($course !== '' && $name !== '') {
                DB::table('class_sections')->insertOrIgnore(['course' => $course, 'year_level' => (int) $match[1], 'name' => $name, 'created_at' => now(), 'updated_at' => now()]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_sections');
        Schema::table('class_list_imports', fn (Blueprint $table) => $table->dropColumn('organized_count'));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->string('password')->nullable();
            $table->boolean('password_change_required')->default(true);
        });

        // Keep student keys, participation, and election records intact.
        DB::table('students')->orderBy('student_id')->chunk(100, function ($students): void {
            foreach ($students as $student) {
                DB::table('students')->where('student_id', $student->student_id)
                    ->update(['password' => Hash::make('123456')]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('students', fn (Blueprint $table) => $table->dropColumn(['password', 'password_change_required']));
    }
};

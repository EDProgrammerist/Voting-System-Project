<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('elections', function (Blueprint $table): void {
            $table->boolean('uses_voter_roster')->default(false);
        });
        Schema::create('election_student', function (Blueprint $table): void {
            $table->foreignId('election_id')->constrained()->cascadeOnDelete();
            $table->string('student_id', 50);
            $table->foreign('student_id')->references('student_id')->on('students')->cascadeOnDelete();
            $table->primary(['election_id', 'student_id']);
        });

        DB::transaction(function (): void {
            foreach (DB::table('elections')->get(['id', 'name']) as $election) {
                $emptyFuture = in_array($election->name, ['SSG Election 2027', 'SSG Election 2028', 'SSG Election 2029'], true)
                    && ! DB::table('voter_participations')->where('election_id', $election->id)->exists()
                    && ! DB::table('ballots')->where('election_id', $election->id)->exists();
                if (! $emptyFuture) {
                    DB::table('students')->orderBy('student_id')->chunk(500, function ($students) use ($election): void {
                        DB::table('election_student')->insert($students->map(fn ($student) => ['election_id' => $election->id, 'student_id' => $student->student_id])->all());
                    });
                }
                DB::table('elections')->where('id', $election->id)->update(['uses_voter_roster' => true]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('election_student');
        Schema::table('elections', fn (Blueprint $table) => $table->dropColumn('uses_voter_roster'));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->uuid('ballot_id');

            $table->foreignId('election_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('position_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('candidate_student_id', 50);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('ballot_id')
                ->references('id')
                ->on('ballots')
                ->cascadeOnDelete();

            $table->foreign('candidate_student_id')
                ->references('student_id')
                ->on('candidate_profiles')
                ->restrictOnDelete();

            $table->unique([
                'ballot_id',
                'candidate_student_id',
            ]);

            $table->index([
                'election_id',
                'candidate_student_id',
            ]);

            $table->index([
                'election_id',
                'position_id',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votes');
    }
};
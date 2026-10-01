<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidacies', function (Blueprint $table) {
            $table->id();

            $table->foreignId('election_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('student_id', 50);

            $table->foreignId('position_id')
                ->constrained()
                ->restrictOnDelete();

            $table->enum('team', [
                'TEAM_A',
                'TEAM_B',
            ]);

            $table->timestamps();

            $table->foreign('student_id')
                ->references('student_id')
                ->on('candidate_profiles')
                ->restrictOnDelete();

            $table->unique(['election_id', 'student_id']);
            $table->index(['election_id', 'team']);
            $table->index(['election_id', 'position_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidacies');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ballots', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignId('election_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->dateTime('cast_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ballots');
    }
};
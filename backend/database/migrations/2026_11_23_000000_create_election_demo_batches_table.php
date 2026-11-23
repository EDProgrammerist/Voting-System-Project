<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('election_demo_batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('election_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('ballot_ids');
            $table->timestamp('seeded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('election_demo_batches');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('election_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('name');
            $table->unsignedInteger('max_selections')->default(1);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['election_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
};
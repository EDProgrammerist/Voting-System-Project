<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partylists', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('election_id')->constrained()->cascadeOnDelete();
            $table->enum('team', ['TEAM_A', 'TEAM_B']);
            $table->string('name', 100);
            $table->text('platform');
            $table->string('banner_image')->nullable();
            $table->timestamps();
            $table->unique(['election_id', 'team']);
            $table->unique(['election_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partylists');
    }
};

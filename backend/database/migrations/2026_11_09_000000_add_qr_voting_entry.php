<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('elections', function (Blueprint $table): void {
            $table->uuid('qr_entry_code')->nullable()->unique();
        });
        DB::table('elections')->orderBy('id')->chunkById(100, function ($elections): void {
            foreach ($elections as $election) {
                DB::table('elections')->where('id', $election->id)->update(['qr_entry_code' => (string) Str::uuid()]);
            }
        });

        // These references identify participation, never the anonymous ballot in votes.
        Schema::create('voter_ballot_ids', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('election_id')->constrained()->cascadeOnDelete();
            $table->string('student_id', 50);
            $table->foreign('student_id')->references('student_id')->on('students')->restrictOnDelete();
            $table->timestamp('issued_at');
            $table->unique(['election_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voter_ballot_ids');
        Schema::table('elections', function (Blueprint $table): void {
            $table->dropUnique(['qr_entry_code']);
            $table->dropColumn('qr_entry_code');
        });
    }
};

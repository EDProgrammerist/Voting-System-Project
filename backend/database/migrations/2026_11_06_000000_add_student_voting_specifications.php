<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('pin')->nullable();
        });
        Schema::table('candidate_profiles', function (Blueprint $table) {
            $table->text('profile')->nullable();
            $table->text('achievements')->nullable();
        });
        Schema::table('voter_participations', function (Blueprint $table) {
            $table->longText('signature')->nullable();
            $table->timestamp('thumbmark_confirmed_at')->nullable();
        });

        // Preserve ballots that are already running or have closed.
        foreach (DB::table('elections')->where('status', 'draft')->get() as $election) {
            foreach (['President', 'Vice President', 'Senator'] as $index => $name) {
                if (! DB::table('positions')->where('election_id', $election->id)->where('name', $name)->exists()) {
                    DB::table('positions')->insert([
                        'election_id' => $election->id, 'name' => $name,
                        'max_selections' => 1, 'display_order' => $index + 1,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('students', fn (Blueprint $table) => $table->dropColumn('pin'));
        Schema::table('candidate_profiles', fn (Blueprint $table) => $table->dropColumn(['profile', 'achievements']));
        Schema::table('voter_participations', fn (Blueprint $table) => $table->dropColumn(['signature', 'thumbmark_confirmed_at']));
    }
};

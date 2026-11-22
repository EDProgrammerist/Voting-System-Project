<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('elections')->where('status', 'draft')->pluck('id') as $electionId) {
            DB::transaction(function () use ($electionId): void {
                $election = DB::table('elections')->where('id', $electionId)->lockForUpdate()->first();
                if (! $election || $election->status !== 'draft') {
                    return;
                }

                $positions = DB::table('positions')->where('election_id', $electionId)->get();
                $displayOrder = (int) $positions->max('display_order');

                foreach (['Secretary', 'Treasurer', 'Auditor', 'PIO'] as $name) {
                    if ($positions->contains('name', $name)) {
                        continue;
                    }

                    DB::table('positions')->insert([
                        'election_id' => $electionId,
                        'name' => $name,
                        'max_selections' => 1,
                        'display_order' => ++$displayOrder,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });
        }
    }

    public function down(): void
    {
        // Keep these positions: they may now have candidates or recorded votes.
    }
};

<?php

namespace App\Support;

use App\Models\Ballot;
use App\Models\Election;
use App\Models\ElectionDemoBatch;
use App\Models\Vote;
use Illuminate\Validation\ValidationException;

class DemoElectionBallots
{
    /** Run inside the election activation transaction. Ordinary elections have no batch. */
    public function populate(Election $election): void
    {
        $batch = ElectionDemoBatch::where('election_id', $election->id)->lockForUpdate()->first();
        if (! $batch || $batch->seeded_at) {
            return;
        }

        $ids = $batch->ballot_ids;
        $ballots = Ballot::where('election_id', $election->id)->whereIn('id', $ids)->lockForUpdate()->get();
        if ($election->name !== 'SSG Election 2026' || count($ids) !== 40 || count(array_unique($ids)) !== 40
            || $ballots->count() !== 40 || Vote::whereIn('ballot_id', $ids)->exists()) {
            throw ValidationException::withMessages(['demo' => 'The registered demo ballots have changed. Review the demo setup before activating; no votes were generated.']);
        }

        $votes = [];
        foreach ($election->positions()->with(['candidacies' => fn ($query) => $query->orderBy('id')])->get() as $positionIndex => $position) {
            $candidates = $position->candidacies;
            if ($candidates->isEmpty()) {
                throw ValidationException::withMessages(['demo' => 'Complete all positions before generating demo votes.']);
            }
            foreach ($ids as $index => $ballotId) {
                // A repeatable sample split: 24 ballots for one candidate, 16 across the rest.
                $offset = $index < 24 || $candidates->count() === 1 ? 0 : 1 + (($index - 24) % ($candidates->count() - 1));
                $candidate = $candidates[($positionIndex + $offset) % $candidates->count()];
                $votes[] = [
                    'ballot_id' => $ballotId, 'election_id' => $election->id,
                    'position_id' => $position->id, 'candidate_student_id' => $candidate->student_id,
                    'created_at' => now(),
                ];
            }
        }
        Vote::insert($votes);
        $batch->update(['seeded_at' => now()]);
    }
}

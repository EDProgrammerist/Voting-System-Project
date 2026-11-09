<?php

namespace App\Support;

use App\Models\Election;
use App\Models\Student;
use App\Models\VoterParticipation;

class VoterElection
{
    public static function current(): ?Election
    {
        return Election::currentlyActive()->latest('id')->first()
            ?? Election::where('status', 'draft')->latest('id')->first()
            ?? Election::whereIn('status', ['active', 'closed'])->latest('id')->first();
    }

    public static function tallyOnly(Student $student, Election $election): bool
    {
        return $student->tokenCan('tally-only')
            || ($election->status !== 'draft' && ! Election::currentlyActive()->whereKey($election->id)->exists())
            || VoterParticipation::where('election_id', $election->id)->where('student_id', $student->student_id)->exists();
    }

    public static function forStudent(Student $student): ?Election
    {
        $abilities = $student->currentAccessToken()?->abilities ?? [];
        foreach ($abilities as $ability) {
            if (str_starts_with($ability, 'election:')) {
                return Election::find((int) substr($ability, 9));
            }
        }

        // Existing sessions issued before QR support retain their original behavior.
        return static::current();
    }
}

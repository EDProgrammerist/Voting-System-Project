<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class VoterBallotId extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $fillable = ['election_id', 'student_id'];

    protected function casts(): array
    {
        return ['issued_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (VoterBallotId $reference): void {
            $reference->id = (string) Str::uuid();
            $reference->issued_at = now();
        });
    }

    public static function issue(Student $student, Election $election): self
    {
        return static::firstOrCreate(['student_id' => $student->student_id, 'election_id' => $election->id]);
    }

    public static function summary(Student $student, Election $election): ?array
    {
        $reference = static::where('student_id', $student->student_id)->where('election_id', $election->id)->first();
        if (! $reference) {
            return null;
        }
        $participation = VoterParticipation::where('student_id', $student->student_id)->where('election_id', $election->id)->first();

        return ['id' => $reference->id, 'issued_at' => $reference->issued_at, 'attendance_recorded' => $participation !== null, 'voted_at' => $participation?->voted_at];
    }
}

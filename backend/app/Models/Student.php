<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class Student extends Authenticatable
{
    use HasApiTokens;

    protected $primaryKey = 'student_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'student_id',
        'full_name',
        'course',
        'academic_status',
        'year_level',
        'section',
        'password',
        'password_change_required',
    ];

    protected $hidden = ['pin', 'password'];

    protected function casts(): array
    {
        return ['password' => 'hashed', 'password_change_required' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::creating(function (Student $student): void {
            $student->password ??= Hash::make('123456');
            $student->password_change_required ??= true;
        });
    }

    public static function createDataRecord(array $record): self
    {
        return static::withoutEvents(fn () => static::create([...$record, 'password' => null, 'password_change_required' => false]));
    }

    public function candidateProfile(): HasOne
    {
        return $this->hasOne(
            CandidateProfile::class,
            'student_id',
            'student_id',
        );
    }

    public function participations(): HasMany
    {
        return $this->hasMany(
            VoterParticipation::class,
            'student_id',
            'student_id',
        );
    }

    public function ballotIds(): HasMany
    {
        return $this->hasMany(VoterBallotId::class, 'student_id', 'student_id');
    }

    public function elections(): BelongsToMany
    {
        return $this->belongsToMany(Election::class, 'election_student', 'student_id', 'election_id');
    }

    public function scopeForElection(Builder $query, ?Election $election): Builder
    {
        // Preserve legacy fixtures/integrations until an election adopts an explicit roster.
        return $election?->uses_voter_roster
            ? $query->whereHas('elections', fn ($query) => $query->where('elections.id', $election->id))
            : $query;
    }

    public function isRegisteredFor(Election $election): bool
    {
        return ! $election->uses_voter_roster || $this->elections()->where('elections.id', $election->id)->exists();
    }
}

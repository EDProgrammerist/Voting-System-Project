<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
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
        'academic_status',
    ];

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
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Candidacy extends Model
{
    use HasFactory;

    protected $fillable = [
        'election_id',
        'student_id',
        'position_id',
        'team',
    ];

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(
            CandidateProfile::class,
            'student_id',
            'student_id',
        );
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
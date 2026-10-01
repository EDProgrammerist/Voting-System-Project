<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoterParticipation extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'election_id',
        'student_id',
        'voted_at',
    ];

    protected function casts(): array
    {
        return [
            'voted_at' => 'datetime',
        ];
    }
}
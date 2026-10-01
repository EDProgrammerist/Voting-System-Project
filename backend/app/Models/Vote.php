<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vote extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'ballot_id',
        'election_id',
        'position_id',
        'candidate_student_id',
        'created_at',
    ];
}
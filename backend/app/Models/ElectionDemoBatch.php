<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ElectionDemoBatch extends Model
{
    protected $fillable = ['election_id', 'ballot_ids', 'seeded_at'];

    protected function casts(): array
    {
        return ['ballot_ids' => 'array', 'seeded_at' => 'datetime'];
    }
}

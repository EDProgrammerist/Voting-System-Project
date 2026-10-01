<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ballot extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'election_id',
        'cast_at',
    ];

    protected function casts(): array
    {
        return [
            'cast_at' => 'datetime',
        ];
    }
}
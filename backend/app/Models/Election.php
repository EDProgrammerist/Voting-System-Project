<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Election extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'starts_at',
        'ends_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function scopeCurrentlyActive(Builder $query): Builder
    {
        return $query
            ->where('status', 'active')
            ->where(function (Builder $query) {
                $query->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            });
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)
            ->orderBy('display_order');
    }

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }
}
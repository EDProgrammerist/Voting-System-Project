<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Election extends Model
{
    protected $hidden = ['demo_batch_exists', 'uses_voter_roster'];

    protected static function booted(): void
    {
        static::creating(function (Election $election): void {
            $election->qr_entry_code = (string) Str::uuid();
        });
        static::created(function (Election $election): void {
            foreach (['President', 'Vice President', 'Senator', 'Secretary', 'Treasurer', 'Auditor', 'PIO'] as $index => $name) {
                $election->positions()->create([
                    'name' => $name, 'max_selections' => 1, 'display_order' => $index + 1,
                ]);
            }
        });
    }

    protected $fillable = [
        'name',
        'starts_at',
        'ends_at',
        'status',
        'uses_voter_roster',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'uses_voter_roster' => 'boolean',
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

    public function demoBatch(): HasOne
    {
        return $this->hasOne(ElectionDemoBatch::class);
    }

    public function voters(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'election_student', 'election_id', 'student_id');
    }
}

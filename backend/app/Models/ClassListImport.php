<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ClassListImport extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = ['id'];

    protected $hidden = ['records'];

    protected function casts(): array
    {
        return ['records' => 'encrypted:array', 'expires_at' => 'datetime', 'committed_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(fn (ClassListImport $import) => $import->id = (string) Str::uuid());
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Partylist extends Model
{
    protected $fillable = ['election_id', 'team', 'name', 'platform', 'banner_image'];

    public function responseData(): array
    {
        return [
            'id' => $this->id, 'election_id' => $this->election_id, 'team' => $this->team,
            'name' => $this->name, 'platform' => $this->platform,
            'banner_image_url' => $this->banner_image ? url(Storage::url($this->banner_image)) : null,
        ];
    }
}

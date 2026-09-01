<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Loge extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return HasMany<Animal, $this> */
    public function animaux(): HasMany
    {
        return $this->hasMany(Animal::class);
    }
}

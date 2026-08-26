<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ReferenceItem extends Model
{
    protected $fillable = ['category', 'label', 'description', 'sort_order', 'active'];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return HasOne<User, $this> */
    public function memberAccount(): HasOne
    {
        return $this->hasOne(User::class);
    }

    /** @return HasMany<MapFeature, $this> */
    public function mapFeatures(): HasMany
    {
        return $this->hasMany(MapFeature::class);
    }
}

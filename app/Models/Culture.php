<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string|null $famille
 * @property int|null $delai_rotation
 * @property string $unite_travail
 */
class Culture extends Model
{
    protected $guarded = [];

    protected $casts = ['actif' => 'boolean'];

    /** @return HasMany<Plantation, $this> */
    public function plantations(): HasMany
    {
        return $this->hasMany(Plantation::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Parcelle extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'surface_m2' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'actif' => 'boolean',
        ];
    }

    /** @return BelongsTo<Parcelle, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Parcelle, $this> */
    public function enfants(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return HasMany<Plantation, $this> */
    public function plantations(): HasMany
    {
        return $this->hasMany(Plantation::class);
    }

    /** @return HasMany<Plantation, $this> */
    public function plantationsActives(): HasMany
    {
        return $this->plantations()->where('statut', 'active');
    }
}

<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use Auditable;

    protected $guarded = [];

    protected $casts = ['date_effet' => 'date', 'approuve_le' => 'datetime'];

    /** @return HasMany<PlanLigne, $this> */
    public function lignes(): HasMany
    {
        return $this->hasMany(PlanLigne::class);
    }

    /** @param Builder<Plan> $query */
    public function scopeEnVigueur(Builder $query): void
    {
        $query->where('statut', 'en_vigueur');
    }

    public static function enVigueurPour(string $code): ?self
    {
        return static::enVigueur()->where('code', $code)->first();
    }
}

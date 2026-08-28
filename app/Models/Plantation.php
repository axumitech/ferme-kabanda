<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plantation extends Model
{
    use Auditable;

    protected $guarded = [];

    protected $casts = ['j0' => 'date', 'fin_le' => 'date', 'quantite' => 'decimal:2'];

    /** @return BelongsTo<Culture, $this> */
    public function culture(): BelongsTo
    {
        return $this->belongsTo(Culture::class);
    }

    /** @return HasMany<Recolte, $this> */
    public function recoltes(): HasMany
    {
        return $this->hasMany(Recolte::class);
    }

    /** @return HasMany<Tache, $this> */
    public function taches(): HasMany
    {
        return $this->hasMany(Tache::class);
    }
}

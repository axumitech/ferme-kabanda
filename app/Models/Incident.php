<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Incident extends Model
{
    use Auditable;

    protected $guarded = [];

    protected $casts = ['survenu_le' => 'datetime', 'signale_le' => 'datetime', 'echeance_classification' => 'datetime', 'echeance_investigation' => 'datetime', 'echeance_siege' => 'datetime', 'cinq_pourquoi' => 'array', 'cout_estime' => 'decimal:2'];

    /** @return BelongsTo<CategorieIncident, $this> */
    public function categorie(): BelongsTo
    {
        return $this->belongsTo(CategorieIncident::class);
    }

    /** @return HasMany<IncidentAction, $this> */
    public function actions(): HasMany
    {
        return $this->hasMany(IncidentAction::class);
    }
}

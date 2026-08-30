<?php

namespace App\Models;

use App\Concerns\Auditable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $reference
 * @property string $nature
 * @property string|null $lieu
 * @property string $description
 * @property CarbonInterface|null $signale_le
 */
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

    /** @return BelongsTo<User, $this> */
    public function declarant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'declare_par_id');
    }

    /** @return HasMany<IncidentAction, $this> */
    public function actions(): HasMany
    {
        return $this->hasMany(IncidentAction::class);
    }
}

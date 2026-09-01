<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int|null $plan_id
 * @property string $code_plan
 * @property string $fichier
 * @property string $statut
 * @property int $lignes_lues
 * @property int $lignes_ajout
 * @property int $lignes_modif
 * @property int $lignes_suppr
 * @property int $lignes_identiques
 * @property int $lignes_erreur
 */
class PlanImport extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['applique_le' => 'datetime'];
    }

    /** @return HasMany<PlanImportLigne, $this> */
    public function lignes(): HasMany
    {
        return $this->hasMany(PlanImportLigne::class);
    }

    /** @return BelongsTo<Plan, $this> */
    public function planCompare(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    /** @return BelongsTo<Plan, $this> */
    public function planResultat(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_resultat_id');
    }

    public function enAttenteDeDecision(): int
    {
        return $this->lignes()->whereNull('acceptee')->where('difference', '!=', 'identique')->count();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenteLigne extends Model
{
    protected $guarded = [];

    public const NATURES = ['animal_sur_pied' => 'Animal sur pied', 'animal_abattu' => 'Animal abattu (carcasse)', 'recolte' => 'Récolte', 'article' => 'Article du magasin', 'autre' => 'Autre'];

    protected function casts(): array
    {
        return ['quantite' => 'decimal:3', 'prix_unitaire' => 'decimal:2', 'montant' => 'decimal:2', 'montant_usd' => 'decimal:2', 'poids_vif' => 'decimal:2', 'poids_carcasse' => 'decimal:2', 'rendement' => 'decimal:2'];
    }

    /** @return BelongsTo<Vente, $this> */
    public function vente(): BelongsTo
    {
        return $this->belongsTo(Vente::class);
    }

    /** @return BelongsTo<Animal, $this> */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    /** @return BelongsTo<Plantation, $this> */
    public function plantation(): BelongsTo
    {
        return $this->belongsTo(Plantation::class);
    }

    /** @return BelongsTo<Article, $this> */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}

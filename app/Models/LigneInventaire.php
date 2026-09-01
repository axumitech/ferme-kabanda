<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneInventaire extends Model
{
    protected $table = 'lignes_inventaire';

    protected $guarded = [];

    public const CAUSES = [
        'casse' => 'Casse ou détérioration',
        'perte' => 'Perte constatée',
        'vol' => 'Vol présumé — incident à ouvrir',
        'erreur_saisie' => 'Erreur de saisie antérieure',
        'evaporation' => 'Évaporation / freinte naturelle',
        'unite' => 'Erreur de conversion d’unité',
        'non_explique' => 'Écart non expliqué',
    ];

    protected function casts(): array
    {
        return [
            'theorique_base' => 'decimal:6', 'compte_base' => 'decimal:6',
            'recompte_base' => 'decimal:6', 'ecart_base' => 'decimal:6', 'ecart_valeur' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<CampagneInventaire, $this> */
    public function campagne(): BelongsTo
    {
        return $this->belongsTo(CampagneInventaire::class, 'campagne_inventaire_id');
    }

    /** @return BelongsTo<Article, $this> */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    /** @return BelongsTo<Emplacement, $this> */
    public function emplacement(): BelongsTo
    {
        return $this->belongsTo(Emplacement::class);
    }

    public function tauxEcart(): ?float
    {
        $theoretical = (float) $this->theorique_base;

        return $theoretical !== 0.0 && $this->ecart_base !== null
            ? round((float) $this->ecart_base / $theoretical * 100, 2)
            : null;
    }
}

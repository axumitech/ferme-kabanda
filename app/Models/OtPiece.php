<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtPiece extends Model
{
    protected $table = 'ot_pieces';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'quantite' => 'decimal:3',
            'cout' => 'decimal:2',
            'cout_unitaire' => 'decimal:4',
        ];
    }

    public const ORIGINES = [
        'magasin' => 'Sortie du magasin',
        'achat_direct' => 'Achat direct',
        'prestataire' => 'Fournie par le prestataire',
    ];

    /** @return BelongsTo<OrdreTravail, $this> */
    public function ordreTravail(): BelongsTo
    {
        return $this->belongsTo(OrdreTravail::class, 'ordre_travail_id');
    }

    /** @return BelongsTo<Article, $this> */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    /** @return BelongsTo<MouvementStock, $this> */
    public function mouvement(): BelongsTo
    {
        return $this->belongsTo(MouvementStock::class, 'mouvement_id');
    }
}

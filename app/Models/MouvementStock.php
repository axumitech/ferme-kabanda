<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property string $type
 * @property string $quantite
 * @property string|null $user_nom
 * @property CarbonInterface|null $created_at
 */
class MouvementStock extends Model
{
    use EstImmuable;

    protected $table = 'mouvements_stock';

    public $timestamps = false;

    protected $fillable = [
        'article_id',
        'type',
        'quantite',
        'unite_id',
        'quantite_base',
        'motif',
        'origine_type',
        'origine_id',
        'site_id',
        'centre_cout',
        'valeur',
        'user_id',
        'user_nom',
        'annule_mouvement_id',
        'campagne_inventaire_id',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'quantite' => 'decimal:4',
            'quantite_base' => 'decimal:6',
            'valeur' => 'decimal:4',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Article, $this> */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    /** @return BelongsTo<Unite, $this> */
    public function unite(): BelongsTo
    {
        return $this->belongsTo(Unite::class);
    }

    /** @return MorphTo<Model, $this> */
    public function origine(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<MouvementStock, $this> */
    public function mouvementAnnule(): BelongsTo
    {
        return $this->belongsTo(self::class, 'annule_mouvement_id');
    }
}

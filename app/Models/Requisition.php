<?php

namespace App\Models;

use App\Concerns\Auditable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $reference
 * @property string $type
 * @property string $objet
 * @property string|null $nouvel_article
 * @property string|null $montant
 * @property string|null $quantite
 * @property string $statut
 * @property CarbonInterface|null $created_at
 */
class Requisition extends Model
{
    use Auditable;

    protected $guarded = [];

    protected $casts = ['quantite' => 'decimal:4', 'valeur' => 'decimal:2', 'montant' => 'decimal:2'];

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

    /** @return BelongsTo<Tache, $this> */
    public function tacheService(): BelongsTo
    {
        return $this->belongsTo(Tache::class, 'tache_service_id');
    }

    /** @return BelongsTo<User, $this> */
    public function demandeur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'demandeur_id');
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return BelongsTo<Departement, $this> */
    public function departement(): BelongsTo
    {
        return $this->belongsTo(Departement::class);
    }
}

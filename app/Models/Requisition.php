<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
}
